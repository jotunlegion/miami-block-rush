// WebGL2 post-processing for the promo: bloom, RGB split, directional / zoom blur,
// flash, impact-frame invert, grade, vignette, grain, scanlines.
(function () {
  const W = 1920, H = 1080;

  const VS = `#version 300 es
  in vec2 p; out vec2 uv;
  void main(){ uv = p*0.5+0.5; gl_Position = vec4(p,0.,1.); }`;

  const BRIGHT = `#version 300 es
  precision highp float; in vec2 uv; out vec4 o;
  uniform sampler2D t; uniform float th;
  void main(){ vec3 c = texture(t, uv).rgb; float l = max(c.r, max(c.g, c.b));
    o = vec4(c * smoothstep(th, th + 0.25, l), 1.); }`;

  const BLUR = `#version 300 es
  precision highp float; in vec2 uv; out vec4 o;
  uniform sampler2D t; uniform vec2 d;
  void main(){
    vec3 c = texture(t, uv).rgb * 0.227;
    c += (texture(t, uv + d*1.385).rgb + texture(t, uv - d*1.385).rgb) * 0.316;
    c += (texture(t, uv + d*3.231).rgb + texture(t, uv - d*3.231).rgb) * 0.070;
    o = vec4(c, 1.); }`;

  const UBER = `#version 300 es
  precision highp float; in vec2 uv; out vec4 o;
  uniform sampler2D t, bl, bl2;
  uniform vec2 res; uniform float time;
  uniform float rgb; uniform vec2 rgbDir; uniform float rgbRad;
  uniform vec2 dirBlur; uniform float zoomBlur; uniform vec2 center;
  uniform float flash; uniform vec3 flashCol; uniform float inv; uniform float bloom;
  uniform float vig; uniform float grain; uniform float scan; uniform float sat; uniform float con;
  uniform vec3 tint; uniform float tintAmt; uniform float bw;
  float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + time*37.) * 43758.5453); }
  void main(){
    vec2 px = 1. / res;
    vec2 off = rgbDir * rgb * px + (uv - center) * rgbRad;
    int N = (length(dirBlur) > 0.5 || zoomBlur > 0.001) ? 14 : 1;
    vec3 c = vec3(0.);
    for (int i = 0; i < N; i++) {
      float k = N == 1 ? 0. : float(i) / float(N - 1) - 0.5;
      vec2 q = uv + dirBlur * px * k - (uv - center) * zoomBlur * (k + 0.5);
      c.r += texture(t, q + off).r; c.g += texture(t, q).g; c.b += texture(t, q - off).b;
    }
    c /= float(N);
    c += (texture(bl, uv).rgb * 0.7 + texture(bl2, uv).rgb * 0.9) * bloom;
    float l = dot(c, vec3(0.299, 0.587, 0.114));
    c = mix(vec3(l), c, sat);
    c = (c - 0.5) * con + 0.5;
    c = mix(c, c * tint * 1.6, tintAmt);
    c = mix(c, vec3(step(0.42, l)) , bw);
    c = mix(c, 1. - c, inv);
    vec2 d = uv - 0.5; c *= 1. - vig * dot(d, d) * 2.2;
    c += (h(gl_FragCoord.xy) - 0.5) * grain;
    c *= 1. - scan * (0.5 + 0.5 * sin(gl_FragCoord.y * 3.14159 / 2.));
    c = mix(c, flashCol, clamp(flash, 0., 1.));
    o = vec4(clamp(c, 0., 1.), 1.); }`;

  let gl, progs = {}, quad, src, fbs = {};

  function compile(fs) {
    const p = gl.createProgram();
    for (const [type, code] of [[gl.VERTEX_SHADER, VS], [gl.FRAGMENT_SHADER, fs]]) {
      const s = gl.createShader(type);
      gl.shaderSource(s, code); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      gl.attachShader(p, s);
    }
    gl.bindAttribLocation(p, 0, 'p');
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    p.u = {};
    return p;
  }
  function U(p, name) { if (!(name in p.u)) p.u[name] = gl.getUniformLocation(p, name); return p.u[name]; }

  function tex(w, h) {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  function fb(w, h) {
    const t = tex(w, h), f = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, f);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    return { f, t, w, h };
  }

  function init(canvas) {
    canvas.width = W; canvas.height = H;
    gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true, antialias: false });
    if (!gl) throw new Error('no webgl2');
    progs.bright = compile(BRIGHT); progs.blur = compile(BLUR); progs.uber = compile(UBER);
    quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    src = tex(W, H);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    fbs.a = fb(W / 4, H / 4); fbs.b = fb(W / 4, H / 4);
    fbs.c = fb(W / 8, H / 8); fbs.d = fb(W / 8, H / 8);
  }

  function pass(prog, target, setup) {
    gl.useProgram(prog);
    gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.f : null);
    gl.viewport(0, 0, target ? target.w : W, target ? target.h : H);
    setup();
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  function bind(unit, t, prog, name) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t); gl.uniform1i(U(prog, name), unit); }

  const DEF = { rgb: 0, rgbDir: [1, 0], rgbRad: 0, dirBlur: [0, 0], zoomBlur: 0, center: [0.5, 0.5], flash: 0, flashCol: [1, 1, 1], inv: 0,
    bloom: 0.55, bloomTh: 0.55, vig: 0.35, grain: 0.035, scan: 0.04, sat: 1.08, con: 1.04, tint: [1, 1, 1], tintAmt: 0, bw: 0 };

  function apply(source2d, fx, time) {
    const P = Object.assign({}, DEF, fx);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, src);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, source2d);
    const B = progs.blur;
    pass(progs.bright, fbs.a, () => { bind(0, src, progs.bright, 't'); gl.uniform1f(U(progs.bright, 'th'), P.bloomTh); });
    for (let i = 0; i < 2; i++) {
      pass(B, fbs.b, () => { bind(0, fbs.a.t, B, 't'); gl.uniform2f(U(B, 'd'), 1.5 / fbs.a.w, 0); });
      pass(B, fbs.a, () => { bind(0, fbs.b.t, B, 't'); gl.uniform2f(U(B, 'd'), 0, 1.5 / fbs.a.h); });
    }
    pass(B, fbs.c, () => { bind(0, fbs.a.t, B, 't'); gl.uniform2f(U(B, 'd'), 2 / fbs.a.w, 0); });
    for (let i = 0; i < 2; i++) {
      pass(B, fbs.d, () => { bind(0, fbs.c.t, B, 't'); gl.uniform2f(U(B, 'd'), 1.5 / fbs.c.w, 0); });
      pass(B, fbs.c, () => { bind(0, fbs.d.t, B, 't'); gl.uniform2f(U(B, 'd'), 0, 1.5 / fbs.c.h); });
    }
    const u = progs.uber;
    pass(u, null, () => {
      bind(0, src, u, 't'); bind(1, fbs.a.t, u, 'bl'); bind(2, fbs.c.t, u, 'bl2');
      gl.uniform2f(U(u, 'res'), W, H);
      gl.uniform1f(U(u, 'time'), time);
      gl.uniform1f(U(u, 'rgb'), P.rgb); gl.uniform2fv(U(u, 'rgbDir'), P.rgbDir); gl.uniform1f(U(u, 'rgbRad'), P.rgbRad);
      gl.uniform2fv(U(u, 'dirBlur'), P.dirBlur); gl.uniform1f(U(u, 'zoomBlur'), P.zoomBlur);
      gl.uniform2f(U(u, 'center'), P.center[0], 1 - P.center[1]);
      gl.uniform1f(U(u, 'flash'), P.flash); gl.uniform3fv(U(u, 'flashCol'), P.flashCol); gl.uniform1f(U(u, 'inv'), P.inv);
      gl.uniform1f(U(u, 'bloom'), P.bloom); gl.uniform1f(U(u, 'vig'), P.vig); gl.uniform1f(U(u, 'grain'), P.grain);
      gl.uniform1f(U(u, 'scan'), P.scan); gl.uniform1f(U(u, 'sat'), P.sat); gl.uniform1f(U(u, 'con'), P.con);
      gl.uniform3fv(U(u, 'tint'), P.tint); gl.uniform1f(U(u, 'tintAmt'), P.tintAmt); gl.uniform1f(U(u, 'bw'), P.bw);
    });
  }

  window.FX = { init, apply, W, H };
})();
