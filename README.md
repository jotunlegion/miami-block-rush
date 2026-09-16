# Miami Block Rush

Pixel-art 80s street racing where you build the road under your car. Drag Tetris-like blocks into the air, hit ramps, grab nitro, dodge the cops and beat two rival gangs across a Miami sunset. Between races: an NFS-style garage with a 3D voxel turntable, a dealership with 20 legends from the 80s to the 2000s, performance tuning, visual customization and an in-game radio.

**Play:** https://miami-block-rush.dimabondar2812.workers.dev
**Neon mode test scene:** https://miami-block-rush.dimabondar2812.workers.dev/neon
**Tunnel mode test scene:** https://miami-block-rush.dimabondar2812.workers.dev/tunnel

- Two ways to lay a block: drag it out of the tray, or tap it once to take it in hand and tap
  the field to drop it there. Both work everywhere, tunnel levels included
- No turning a piece: the game runs too fast to spend a beat on it. Every turn of a shape is
  its own piece and the tray deals it like any other - all but the turns that meet the car with
  the high end of the slope, which are a wall at race speed and are never dealt to anyone
- On a keyboard: A S D take a piece out of the tray, SPACE jumps, CTRL is nitro
- Neon levels (4, 9, 14, ...): no blocks - you paint the road with your finger from a limited can of paint
- Tunnel levels (8, 23, 38, ...): three parallel tunnels, one per racer, blocked by walls missing one or
  two pieces - drop them in and the filled column clears, Tetris style
- Vanilla JavaScript + HTML5 Canvas, no build step, no dependencies
- Designed for phones in landscape (16:9), pixel-perfect integer scaling
- Ukrainian interface

## Run locally

Open `index.html` in a browser, or serve the folder with any static server.
`neon.html` is a test scene for the neon painting mode: it drops straight into a painted level
and shows the paint balance (how much paint the gaps to the next safety island need vs how much
paint and how many cans are left), with buttons to switch neon level and to empty the tank.
`tunnel.html` does the same for tunnel mode: it reports the walls left, the shortest run-up
between two walls in seconds at the car's top speed, and what the next wall is missing.

## Deploy

`npx wrangler deploy` publishes the folder as a Cloudflare Workers static-assets site.
`.assetsignore` keeps the docs, the tools and the local-only bot out of the build.

## Structure

- `js/game.js` - game states, input, race HUD, rendering
- `js/car.js` - car physics, voxel destruction, particles
- `js/world.js` - grid, pieces, level generation, painted ink
- `js/paint.js` - neon painting mode: the paint tank, strokes, cans, gauge
- `js/tunnel.js` - tunnel mode: deck layout, walls, the column clear, piece dealing, rival solving
- `js/ai.js` - rival builders and police
- `js/garage.js`, `js/voxel3d.js` - garage, dealership, tuning, 3D voxel renderer
- `js/catalog.js`, `js/custom.js`, `js/profile.js` - cars, parts, customization, save data
- `js/music.js`, `js/audio.js` - radio player and chiptune SFX
- `Ost/` - soundtrack
