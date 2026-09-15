# Promo video: "Run It Up"

A 1920x1080 / 60 fps TikTok-style creative rendered from the real game modules (World, Car, Paint, Tunnel, Art).
Every shot is hand-directed in `shots_*.js`, not recorded from a level.

- `main.js` - director: picks the shot for a frame, simulates it, composites through the camera, edit events (flash, punch zoom, shake, RGB split, blur, invert, anime lines)
- `fx.js` - WebGL2 post: bloom, RGB split, directional / zoom blur, grade, vignette, grain
- `stage.js` - directing helpers and extra effects (tire smoke, sparks, fire, muzzle flashes, tray and finger)
- `shots_a.js` 0-2.5 s, `shots_c.js` 2.5-4 s, `shots_d.js` 4-6 s, `shots_e.js` 6-8 s (neon), `shots_f.js` 8-14.2 s (tunnel), `shots_g.js` cops, title, end card; `shots_fx.js` focus / speed lines
- Timings come from Whisper word timestamps on Demucs-isolated vocals (`audio/`: scripts plus `words_voc.json`)
- `run-it-up.mp3` - the exact track cut used (differs from `Ost/Run It Up.mp3`)
- `experiments/` - physics sweeps and the headless smoke test, `sheets/` - final contact sheets per scene
- `NOTES.md` - the original brief, delivered timeline, full rebuild steps and research sources

```
npm install
node render.js --from 0 --to 1997 --workers 4 --fmt jpg --out frames
ffmpeg -framerate 60 -i frames/f%05d.jpg -i run-it-up.mp3 -c:v libx264 -preset slow -crf 16 -pix_fmt yuv420p -c:a aac -b:a 320k -shortest -movflags +faststart out.mp4
```
`node render.js --frames 120,300 --out prev` renders single frames, `python sheet.py prev sheet.png` tiles them into a contact sheet,
`node lab.js script.js` runs physics experiments in the page. Chrome is expected at `C:/Program Files/Google/Chrome/Application/chrome.exe`.
