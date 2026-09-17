# Miami Block Rush

Pixel-art 80s street racing where you build the road under your car. Drag Tetris-like blocks into the air, hit ramps, grab nitro, dodge the cops and beat two rival gangs across a Miami sunset. Between races: an NFS-style garage with a 3D voxel turntable, a dealership with 20 legends from the 80s to the 2000s, performance tuning, visual customization and an in-game radio.

**Play:** https://miami-block-rush.dimabondar2812.workers.dev
**Neon mode test scene:** https://miami-block-rush.dimabondar2812.workers.dev/neon
**Tunnel mode test scene:** https://miami-block-rush.dimabondar2812.workers.dev/tunnel

- Plays either way up. Landscape is the old 480x270 view; portrait gets its own layout - the
  race under a full-width HUD, a tray a third of the screen deep with slots and buttons half
  again as big, and every menu, the garage and the Blacklist restacked into one column
- Two ways to lay a block: drag it out of the tray, or tap it once to take it in hand and tap
  the field to drop it there. Both work everywhere, tunnel levels included
- A dragged block hangs on the fingertip in screen space while its landing cells are outlined
  on the road, so the block never drifts back with the scrolling world. With a mouse, a piece
  taken from the tray becomes the cursor
- A piece you lay yourself ignores traffic: drop it where a car stands and the car rides up
  onto it. Nothing around your own bumper is a dead zone any more
- Slots deal the next piece the instant one is spent - no cooldown to wait out mid-race
- One of the three slots is always a ramp. Three flat blocks in hand and a car in a pit is a
  run lost to the deal rather than to the driver, so the piece that would have emptied the
  tray of ways up is swapped for one. It comes from the ramps that carry their own floor, so
  it can be laid in mid air over the hole and still be driven onto
- Replaying a level hands back the same track, seed and all, not a fresh roll of the same
  number - you lose the run, not the road you had learned
- Coming last is not losing a level: it is passed whatever place you came in, because losing
  already costs you the money you did not earn, and that money is what the next car costs -
  being sent round again would charge for the same race twice. The one thing that fails a
  level is the cell, since a cop touch is bought off at $50 a time and being taken in means
  there was nothing left to pay with. A Blacklist duel is a gate instead: the pink slip goes
  to first place only
- No turning a piece: the game runs too fast to spend a beat on it. Every turn of a shape is
  its own piece and the tray deals it like any other - all but the turns that meet the car with
  the high end of the slope, which are a wall at race speed and are never dealt to anyone
- On a keyboard: A S D take a piece out of the tray, SPACE jumps, CTRL is nitro
- Neon levels (4, 9, 14, ...): no blocks - you paint the road with your finger from a limited can of paint
- Tunnel levels (8, 23, 38, ...): three parallel tunnels, one per racer, blocked by walls missing one or
  two pieces - drop them in and the filled column clears, Tetris style
- A wall is a puzzle to read, not a target to hit. The tray hands the missing piece over on a
  plate, so the only question is which one and where, and the piece the wall ahead is missing
  drops into the hole it belongs in from anywhere pointed at that wall - roughly its own width
  plus a cell of slack either side, and a row above or below. A piece the wall does not want is
  laid exactly where it was pointed, like everywhere else, and a wall already cleared never
  pulls anything back into it. Threading a narrow wall through its hole on a jump still works
  as a skill shortcut. Inside a tunnel the car also rides closer to the left edge, so every
  wall arrives that much later and the reading gets its time back
- Bonus run (every 6th level): one car against five or six patrols and two helicopters, no
  finish line and no rivals - the road runs on forever and the only job is the money. It is
  a pursuit, not a race: every patrol starts behind you and hunts from behind, pushing
  harder the longer you last, and the helicopters hold station overhead. One touch from a
  cop ends it and you keep every dollar, crashes and all. Alternates between blocks and the
  brush; on the levels where it lands on a neon one (24, 54, ...) it takes the brush
- Free ride: pick one mechanic - blocks, neon or tunnels - and play only that. Each keeps its
  own level counter and none of it moves the campaign or the Blacklist. A mechanic opens here
  once the campaign has reached it
- Vanilla JavaScript + HTML5 Canvas, no build step, no dependencies
- Pixel-perfect integer scaling, 480x270 landscape / 240x400-and-up portrait
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

- `js/layout.js` - the design box per orientation and every metric the screens hang off
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
