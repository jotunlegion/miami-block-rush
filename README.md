# Miami Block Rush

Pixel-art 80s street racing where you build the road under your car. Drag Tetris-like blocks into the air, hit ramps, grab nitro, dodge the cops and beat two rival gangs across a Miami sunset. Between races: an NFS-style garage with a 3D voxel turntable, a dealership with 20 legends from the 80s to the 2000s, performance tuning, visual customization and an in-game radio.

**Play:** https://miami-block-rush.pages.dev

- Vanilla JavaScript + HTML5 Canvas, no build step, no dependencies
- Designed for phones in landscape (16:9), pixel-perfect integer scaling
- Ukrainian interface

## Run locally

Open `index.html` in a browser, or serve the folder with any static server.

## Structure

- `js/game.js` - game states, input, race HUD, rendering
- `js/car.js` - car physics, voxel destruction, particles
- `js/world.js` - grid, pieces, level generation
- `js/ai.js` - rival builders and police
- `js/garage.js`, `js/voxel3d.js` - garage, dealership, tuning, 3D voxel renderer
- `js/catalog.js`, `js/custom.js`, `js/profile.js` - cars, parts, customization, save data
- `js/music.js`, `js/audio.js` - radio player and chiptune SFX
- `Ost/` - soundtrack
