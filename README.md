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
  taken from the tray becomes the cursor, with a crosshair marking the spot the aim is read
  from - the one thing the piece itself covers
- On a desk the system arrow is hidden and the game draws its own: a chunky 1986 pointer with
  three rings of neon in your gang's colour and a hard shadow under it. The stock white
  pointer is a thin outline that goes missing over a sunset with the road scrolling beneath
  it. This one is drawn into the game's own low-res buffer, so it comes out in the same pixels
  as everything else, and it is doubled at small window sizes so it stays the same size on the
  glass however the window is scaled. Over anything clickable the glow flares and a ring
  breathes round the tip; a press leaves a ring that snaps outward, so a click that landed on
  nothing still reads as a click that landed. The arrow itself stays white on a dark rim
  either way - tinting it the gang colour lost it against a header in that same colour. Touch
  the glass and the system pointer comes straight back
- A piece you lay yourself ignores traffic: drop it where a car stands and the car rides up
  onto it. Nothing around your own bumper is a dead zone any more
- Slots deal the next piece the instant one is spent - no cooldown to wait out mid-race
- One of the three slots is always a ramp. Three flat blocks in hand and a car in a pit is a
  run lost to the deal rather than to the driver, so the piece that would have emptied the
  tray of ways up is swapped for one. It comes from the ramps that carry their own floor, so
  it can be laid in mid air over the hole and still be driven onto
- Replaying a level hands back the same track, seed and all, not a fresh roll of the same
  number - you lose the run, not the road you had learned
- A level is won by topping the final table - money, finish bonus and crash cuts all counted -
  and only a win opens the next level. Losing still pays: whatever the run earned goes into the
  garage either way (the results sheet says so on its way-out button), the win bonus is the one
  thing a loss misses. A Blacklist duel is first across the line and pays the pink slip
- Every laid block, yours and the rivals' alike, stands for five seconds and then crumbles. It
  blinks the whole time and the blink speeds up as it runs out, so a road is built as it is
  driven, not paved in advance. The tutorial bridge and a piece sitting in a tunnel wall stay
- Pause (the two-bar key by the sound buttons, ESC or P on a keyboard) freezes the race and
  offers carry on, start again, or the main menu. A phone put down mid-race comes back paused
- Four parts of town take turns level by level: the sunset over the bay, Miami Beach at noon,
  downtown at midnight and Little Havana (Calle Ocho) at golden hour. The menus keep the sunset
- No turning a piece: the game runs too fast to spend a beat on it. Every turn of a shape is
  its own piece and the tray deals it like any other - all but the turns that meet the car with
  the high end of the slope, which are a wall at race speed and are never dealt to anyone
- On a keyboard: A S D take a piece out of the tray, SPACE jumps, CTRL is nitro. In the garage
  A/D (or the arrows) flip the menu, categories, cars and tracks, W/S walk a list, and the mouse
  wheel scrolls any long list - the radio, the Blacklist, paint and parts
- Onboarding is acted out for the device in hand. Level 1 has two chasms: on a phone a hand
  shows the drag on the first and the tap-a-slot-then-tap-the-road on the second; on a desk a
  keycap goes down and the pointer clicks the chasm. The first neon level and the first tunnel
  level (campaign or free ride) are each preceded by a short lesson - paint across a gap and up a
  step; drop the lit piece into the wall - that pays nothing, counts as no level, can be skipped,
  and hands straight over to the level it stood in front of. Portrait and landscape alike
- Neon levels (4, 9, 14, ...): no blocks - you paint the road with your finger from a limited can of paint
- Tunnel levels (8, 23, 38, ...): three parallel tunnels, one per racer, blocked by walls missing one or
  two pieces - drop them in and the filled column clears, Tetris style
- A tunnel belongs to whoever drives it: a piece can only go inside your own deck, never over a
  floor or into a rival's tunnel, and never onto a car, so nobody can be shoved into another lane
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
- `js/lessons.js` - onboarding: level 1 hints and the neon and tunnel lessons, per device
- `js/scenery.js` - the race backdrops: Miami Beach, downtown at night, Little Havana
- `js/garage.js`, `js/voxel3d.js` - garage, dealership, tuning, 3D voxel renderer
- `js/catalog.js`, `js/custom.js`, `js/profile.js` - cars, parts, customization, save data
- `js/music.js`, `js/audio.js` - radio player and chiptune SFX
- `Ost/` - soundtrack
