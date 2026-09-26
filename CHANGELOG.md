# Changelog

All notable changes to the **Apex Marina** project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Verified — Player can win: race simulation results - 2026-09-26
- Added `RacingScene.autopilot` hook (AI drives the player boat; for simulations and future demo mode).
- Headless full-race sims on the big Sunset Bay loop (~60s races): **skilled P3 (1:01, +2s)**, **average P3 (1:01, +1s)**, **casual P4 (1:02, +3s)** — podium in reach for decent drivers, mid-pack for casuals, nobody dominates; finishers spread ~3s over 60s. Rubber-band (±6%) + trimmed AI pace confirmed working, zero console errors.

### Fixed — Race Again button + full-world track - 2026-09-26
- **Race Again now restarts properly**: the results overlay is hidden on every scene switch (previously the restarted race ran invisibly behind the stale card, looking dead). Verified: overlay hides, fresh countdown starts, clock resets.
- **Sunset Bay is now a full-world loop** (~7s kiddie oval → ~60s lap): 6 gates spanning x 520–3040 / y 450–2030, start grid on the south straight, AI racing line with 11 waypoints, all legs keeping 250px+ clearance from islands. Verified gate crossing on the new geometry and AI racing it.

### Added — Phase 3: Racing MVP (Sunset Bay) - 2026-09-26
- **Race flow**: 🏁 Race / 🧭 Explore nav, 3-2-1-GO countdown with rocking boats and camera zoom punch, 3 laps × 5 checkpoint gates, live LAP/POS pills, checkpoint + final-lap flashes, results card with standings and best laps, retry/explore actions, best-lap persistence to localStorage, minimap.
- **Systems**: `RaceManager` (segment-crossing gates with normal validation, progression-score rankings, finish-time locking), `AIController` (waypoint steering, corner throttling, boid separation, aggression boosts, rookie mistakes), 5 AI profiles, boat-vs-boat impulse collisions.
- **Verified end-to-end in browser**: countdown → racing, gate crossing, AI spreading over the track (~7.5s/lap pace), 15/15 gates across 3 laps, finish + results overlay with correct ordered standings.

### Added — Marine life: fish schools + dolphins - 2026-09-26
- **New `world/MarineLife.ts`**: 3 wandering fish schools (19 fish) that cruise in formation with tail-wiggle and dart away in a burst when any boat comes within 160px; 2 dolphins gliding in lazy circles as faint underwater shadows, surfacing every few seconds with full colour and a breach pop before diving again. ~20 sprites, trivial math.
- **Textures**: procedural `fish` and top-down `dolphin` silhouettes (fills only).
- **Wiring**: `Environment` owns marine life and exposes `boatPositions` (for flee checks), fed every frame by both `PlaygroundScene` (player) and `RacingScene` (player + 5 AI).

### Fixed — Water unified + sunlit turquoise look - 2026-09-26
- **Black box top-left removed (`WaterSystem.ts`)**: the wake `RenderTexture` is now pinned at origin (0,0) so texture pixels map 1:1 to world pixels, starts fully transparent, and fades old trails with destination-out `erase()` instead of painting translucent black (which had accumulated into an opaque black rectangle). Wake stamps reuse one off-display-list sprite instead of alloc/destroy per stamp.
- **Tile grid seams removed (`TextureGenerator.ts`)**: water tiles are now seamless — flat base colour (no per-tile gradient), all detail drawn wrap-safe at 9 neighbour offsets, 512px tiles for softer repetition.
- **Reference-matched water look**: sunlit turquoise base (`#0b8cae`, close to the palette's `#0891B2`) with soft cyan/deep-teal mottling, delicate branching foam cracks, and sun-glitter speckle, inspired by the Poseidon ocean's deep/crest two-tone + specular glitter — baked once at boot so per-frame cost stays at 2 scrolling TileSprites (fills only, no canvas strokes). Ripple decal also converted to filled slivers.
- Exposed game instance as `window.__apexGame` for live browser debugging.

### [0.2.0] - Phase 2: Living Archipelago Environment - 2026-09-26
#### Added
- **Procedural Island Generator (`world/IslandGenerator.ts`)**:
  - Seeded `mulberry32` RNG — same seed reproduces same trees/docks/huts.
  - Small/medium/large island specs with collision radius, tree scatter, dock angle.
- **Living World Builder (`world/Environment.ts`)**:
  - 5-island archipelago (pine haven, sunset home, hidden cove, fishing village, rocky rest).
  - Wooden piers with dock-head collision, thatch huts, flickering campfires + glow.
  - Rock channels forming narrow gates, slalom buoy course with bobbing tweens.
  - Pulsing shoreline foam rings, drifting ripple decals, cloud shadows, cruising birds, fireflies.
- **Extended Procedural Textures (`TextureGenerator.ts`)**:
  - `island-small/medium/large` painterly variants, `tree-pine`, `tree-palm` (swayable), `dock-plank`, `hut`, `campfire`, `foam-ring`, `fx-ripple`.
- **PlaygroundScene upgrade**: now drives `Environment.build()` + `Environment.update()` each frame; all island/rock/buoy/dock-tip bodies feed the existing hydrodynamic collision bounce.

### [0.1.0] - Phase 1: Core Hydrodynamics & First Playable Boat Feel - 2026-09-26
#### Added
- **Core Technology Stack Setup**:
  - Vite + TypeScript + Phaser 3 integration.
  - Full-screen high-DPI responsive canvas scaling.
  - Strict TypeScript configuration.
- **Arcade Boat Hydrodynamics (`PlayerBoat.ts`)**:
  - Longitudinal thrust and lateral slip vector decomposition.
  - Water keel damping (`drag` vs. `lateralDrift`) allowing controlled drifting stern slip.
  - Speed-sensitive steering and reverse gear handling.
  - Nitro Boost mechanic with visual energy meter, cooldown, and camera responsiveness.
- **Dynamic Water & Wave Environment (`WaterSystem.ts`)**:
  - Dual-layer scrolling ocean gradient and shimmering caustic wave patterns.
  - Zero-lag GPU `RenderTexture` persistent wake buffer with progressive alpha decay.
  - Spray particle emitter responding dynamically to boat speed and drift slip.
- **Procedural Graphics Generator (`TextureGenerator.ts`)**:
  - Built-in canvas vector texture generation for player speedboat (sleek hull, deck stripes, windshield, outboard motor) and environmental elements.
  - 100% playable out-of-the-box with zero external asset dependencies or 404s.
- **Procedural Web Audio Synthesizer (`SoundManager.ts`)**:
  - Real-time HTML5 Web Audio API synthesizer.
  - Velocity-modulated dual-oscillator engine drone.
  - White-noise wake wash and high-resonance boost roar.
  - Collision thuds and audio mute toggle (`M` key).
- **Smooth Follow Camera**:
  - Camera system with velocity-based forward look-ahead and smooth interpolation.
- **Controls & HUD**:
  - Desktop keyboard controls (`W/A/S/D` or Arrow keys, `Space` for boost, `M` for audio mute).
  - Modern, minimalist HUD displaying live Knots/Speed, Boost charge, and Engine status.
  - Development debug overlay (`F1` toggle) showing FPS, Heading, Velocity, and Drift angle.
