# "Run It Up": how the creative was made

Recovered from the 2026-09-15 session after a PC crash. The finished masters are
`C:\Users\Dima\Downloads\miami-block-rush-run-it-up.mp4` (289 MB, crf 16) and `..._upload.mp4` (48 MB).

## The brief (verbatim)

> Потрібно зробити відео креатив гри формат 16:9 трек "run-it-up.mp3" креатив в стилі тік-ток едітів з купою
> динамічних епічних переходів і спалахів (попередньо досліди детально тік-ток едіти особливо гонок чи аніме моментів).
> Використай спочатку віспер аби точно розуміти слова на трекові. Буквально в першу секунду вліт де швидко повторюється
> run (десь 5 разів) після рівно в 1 секунду фраза завершується run it up, в цю одну секунду на кожен run з переходами і
> спалахами нарізки їзди машинки на віражах (різні машинки) далі до 2ї секундли фраза push that limit в цей час показуємо
> як машинка мчить вперед і ми ставимо блок віража. Далі до 4 секунди повторюється фраза Run it up, run it up, push that
> limit на кожен run it up машинка падає в різних місцях але ми підставляємо різні блоки щоб вона їхала далі. далі до 6ї
> секунди Whole crew locked in, every second in it - тут показуємо як ми їдемо по пласкій платформі, позаду віраж і на
> ньому підлітають 2 машинки противника, ставлять блок над нами й переганяють по верху. далі 2 секунди відео геймплею де
> ми не ставимо блоки, а малюємо пальцем, віраж і машинка підлітає, і до 14ї геймплей з (тетрісом) механіка де ми їдемо
> по тунелю і прибираємо перешкоди докладаючи блоки. з 14 до 16 фраза Run it up, run it up, push that limit, на перший
> Run it up - ми падаєме і за нами майже в притул 2 машини копів, назум, на другий run it up ми литемо після віража і над
> нами слідує гелікоптер копів, на push that limit заставка гри, далі появляється кнопка даунлоад і фраза "В дубу затишні
> мобільні ігри! Тільки хардкор!" і айдл анімація всього до кінця пісні. Нема сенсу ловити це на рівнях, для кожного
> кадру зрежесуй окремий кусочок сам, просто розставляй все необхідне для кадру. Можеш додати якихось ефектів де доречно
> типу дим шин, іскри, стрільба копів палаючий неон тощо.

## What made it work

1. **Exact word timings first.** Whisper on the full mix misheard the hook ("One it up"). Demucs vocal isolation, then
   faster-whisper large-v3 on overlapping 5-7 s chunks, gave reliable word starts. The real timings differed from the
   brief ("run it up" twice at 0.82 and 1.22, "push that limit" at 1.62-2.24) and every cut follows the real ones.
2. **Beat grid from the audio, not by ear.** `onsets.py` (spectral flux, low band <150 Hz for kicks, autocorrelation
   tempo, RMS per 0.1 s) and `vocal_env.py` (vocal onsets and voiced regions from the Demucs stem).
3. **Directed shots on the real engine, not level recordings.** Each shot builds a tiny world, places blocks and cars
   and simulates the game's own physics, so it looks exactly like the game. `director.html` loads `../../js/*.js`.
4. **Measure the physics before directing.** `experiments/lab2.js` sweeps speed x ramp piece and prints launch, apex,
   crossing and landing times. Blocks and walls are positioned from the measured trajectory so jumps land on beats.
5. **Edit language from TikTok velocity and anime edits,** applied as timed edit events in `main.js` plus WebGL post in `fx.js`:
   white and colour flashes, punch zoom and shake on hits, RGB split, zoom and directional blur, 1-frame invert
   "impact frames", radial anime lines on hits, horizontal speed lines at speed, grain, vignette, grade.
   Extras from `stage.js`: tire smoke, landing sparks, fire, cop muzzle flashes, block tray with a dragging finger.
6. **Mobile-ad rules:** hook within the first second, real gameplay up front, branding only at the end, a pulsing
   download button end card that the finger taps.
7. **Review with contact sheets, not by eye on the video.** Render every Nth frame, tile with `sheet.py`, fix, repeat.
   `sheets/` has the final sheets for each scene plus `chk_sheet.jpg` (frames pulled from the encoded mp4).

## Timeline as delivered

| Time | Words | Shot |
|---|---|---|
| 0.00-1.22 | run x4, run it up | 5 different cars on ramps (F40, lowrider, GT-R, DeLorean, ours), a cut on every "run" |
| 1.22-2.54 | run it up, push that limit | game view with block tray: finger drags a ramp, block drops on "push", jump on "limit" with slow-mo and an invert frame |
| 2.54-4.04 | run it up x2, push that limit | three falls, a different block under the car each time: I4 strip, LAUNCH, slope + steep ramp, flight up on "limit" |
| 4.04-6.00 | whole crew locked in... | we drive a flat roof, two rivals launch off the ramp behind, drop a bridge above us and pass over it |
| 6.00-8.00 | | neon mode: finger paints a ramp line, the line burns, the car launches |
| 8.00-14.20 | | tunnel mode: pieces slot into walls, columns explode, "ПРОХІД ВІДКРИТО!", nitro, hits on every "run it up" |
| 14.20 | run it up | we fall, two cops right behind shooting, camera push-in, red/blue strobe |
| 14.84 | run it up | jump with a police helicopter and searchlight overhead |
| 15.30 | push that limit | title: MIAMI / BLOCK / RUSH, one word per word of the phrase |
| 16.196-33.3 | | on the kick: «ЗАВАНТАЖИТИ» button and slogan, then idle to the end: cars racing below, button pulsing on the beat, finger taps it |

## Rebuild from zero

Tools: Node + `npm install` (puppeteer-core), Chrome, ffmpeg, Python with `numpy pillow faster-whisper demucs soundfile`.
faster-whisper large-v3 downloads about 3 GB to `~/.cache/huggingface`. Everything runs on CPU (int8).

Audio analysis, run from `work/` with `run-it-up.mp3` copied in as `track.mp3` (scripts in `audio/`, results already saved there as `words_voc.json`):
```
ffmpeg -v error -y -i track.mp3 track.wav
python -m demucs --two-stems=vocals -n htdemucs -o sep track.wav      # -> sep/htdemucs/track/vocals.wav
python whisper_run.py large-v3                                       # full mix, less reliable -> words_large-v3.json
python whisper_chunks.py sep/htdemucs/track/vocals.wav voc           # vocals in chunks -> words_voc.json (used)
ffmpeg -v error -i track.mp3 -ac 1 -ar 22050 -f f32le track.f32 && python onsets.py
python vocal_env.py
```
Stems are kept locally in `work/stems/` (git-ignored, regenerable).

Render and encode (the 1998 frames were about 1.3 GB of jpg):
```
node render.js --from 0 --to 1997 --workers 4 --fmt jpg --out work/final
ffmpeg -y -framerate 60 -i work/final/f%05d.jpg -i run-it-up.mp3 -c:v libx264 -preset slow -crf 16 -pix_fmt yuv420p -c:a aac -b:a 320k -shortest -movflags +faststart miami-block-rush-run-it-up.mp4
ffmpeg -y -framerate 60 -i work/final/f%05d.jpg -i run-it-up.mp3 -c:v libx264 -preset slow -crf 23 -maxrate 25M -bufsize 50M -pix_fmt yuv420p -c:a aac -b:a 256k -shortest -movflags +faststart miami-block-rush-run-it-up_upload.mp4
```

Experiments (`experiments/`): `node lab.js experiments/lab2.js` runs a physics sweep in the page; `smoke.html` / `smoke.js`
was the first check that the game modules draw headless in puppeteer (`smoke.png`).

## Research sources

- Velocity edits: sequence visual > pause > white flash > shake > speed ramp; 0.5x on drops, 2x on highs ([TikTok velocity tutorials](https://www.tiktok.com/discover/how-to-do-flash-and-shakes-for-velocity-edit), [Alight Motion guide](https://thealightmotions.com/velocity-edits-tutorial/))
- Anime / AMV effect vocabulary: flash, colour flash, strobe, chromatic aberration, glow pulse, beat and punch zoom, directional shake, whip blur, impact frames, one-frame glitches ([anime-edit-automation](https://github.com/sunzzz127/anime-edit-automation), [Filmora anime transitions](https://filmora.wondershare.com/templates/anime-transitions.html), [TikTok impact frames](https://www.tiktok.com/discover/impact-frames?lang=en))
- Initial D drift edits: white flash + shake, grain, jump cuts on hardstyle ([TikTok Initial D edits](https://www.tiktok.com/discover/initial-d-edits))
- Mobile game ads: hook in 1-3 s, real gameplay beats studio polish, branding on the end card, end card can lift installs 15-30% ([Singular](https://www.singular.net/blog/mobile-game-ad-creative/), [RocketShip HQ](https://www.rocketshiphq.com/good-end-card-mobile-app-ads/), [Admiral Media](https://admiral.media/mobile-game-creative-strategy/))
