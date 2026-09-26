import Phaser from 'phaser';
import { generateIsland, type IslandSpec } from './IslandGenerator.ts';
import { MarineLife, type BoatPos } from './MarineLife.ts';

export interface Obstacle {
  x: number;
  y: number;
  radius: number;
  type: 'buoy' | 'rock' | 'island';
  sprite: Phaser.GameObjects.GameObject;
}

/**
 * Phase 2 living world: archipelago, docks, village, rocks, buoys,
 * shoreline foam, swaying trees, drifting cloud shadows, birds & fireflies.
 */
export class Environment {
  public obstacles: Obstacle[] = [];
  private foamRings: Phaser.GameObjects.Image[] = [];
  private birds: Array<{ g: Phaser.GameObjects.Arc; vx: number; phase: number }> = [];
  private cloudShadows: Phaser.GameObjects.Image[] = [];
  private swells: Array<{
    img: Phaser.GameObjects.Image;
    vx: number;
    vy: number;
    baseAlpha: number;
    phase: number;
    breathe: number;
    bobAmp: number;
  }> = [];
  private time = 0;
  /** Boat positions fed in by the scene each frame (fish flee from these). */
  public boatPositions: BoatPos[] = [];
  private marineLife: MarineLife | null = null;

  constructor(
    private scene: Phaser.Scene,
    private worldWidth: number,
    private worldHeight: number,
    private seed = 472819,
  ) {}

  public build(): void {
    const cx = this.worldWidth / 2;
    const cy = this.worldHeight / 2;

    const islands: IslandSpec[] = [
      generateIsland('pine-haven', cx - 620, cy - 420, 'medium', this.seed + 1, { hasDock: false }),
      generateIsland('sunset-home', cx + 420, cy - 380, 'large', this.seed + 2, {
        hasHut: true,
        hasDock: true,
        dockAngle: Math.PI * 0.35,
      }),
      generateIsland('cove', cx + 700, cy + 380, 'small', this.seed + 3, { hasCampfire: true }),
      generateIsland('village', cx - 320, cy + 480, 'large', this.seed + 4, {
        hasHut: true,
        hasCampfire: true,
        hasDock: true,
        dockAngle: -Math.PI * 0.5,
      }),
      generateIsland('rocky-rest', cx - 780, cy + 160, 'small', this.seed + 5, {}),
    ];

    for (const spec of islands) this.buildIsland(spec);
    this.buildRockChannels(cx, cy);
    this.buildSlalomBuoys(cx, cy);
    this.buildRipples();
    this.buildCloudShadows();
    this.buildBirds();
    this.buildFireflies(islands);
    this.marineLife = new MarineLife(this.scene, this.worldWidth, this.worldHeight);
  }

  private buildIsland(spec: IslandSpec): void {
    const s = this.scene;
    // Foam reef pulse under island
    const foam = s.add.image(spec.x, spec.y, 'foam-ring');
    const foamScale = (spec.radius * 2.9) / 288;
    foam.setScale(foamScale).setDepth(0).setAlpha(0.7);
    this.foamRings.push(foam);
    s.tweens.add({
      targets: foam,
      alpha: { from: 0.45, to: 0.85 },
      scale: { from: foamScale * 0.97, to: foamScale * 1.03 },
      duration: 1800 + (spec.seed % 700),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const land = s.add.image(spec.x, spec.y, spec.texture);
    land.setDepth(2);
    this.obstacles.push({ x: spec.x, y: spec.y, radius: spec.radius, type: 'island', sprite: land });

    // Swaying trees planted on the grass core
    for (const t of spec.trees) {
      const tree = s.add.image(spec.x + t.dx, spec.y + t.dy, t.kind === 'pine' ? 'tree-pine' : 'tree-palm');
      tree.setDepth(3);
      tree.setScale(0.9 + ((spec.seed + t.dx) % 20) / 60);
      s.tweens.add({
        targets: tree,
        angle: { from: -3, to: 3 },
        duration: 2200 + Math.abs(t.dx * 7) % 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    if (spec.hasHut) {
      const hut = s.add.image(spec.x + 18, spec.y - 20, 'hut').setDepth(4);
      void hut;
    }
    if (spec.hasCampfire) {
      const fire = s.add.image(spec.x - 26, spec.y + 30, 'campfire').setDepth(4);
      s.tweens.add({ targets: fire, scale: { from: 1, to: 1.15 }, duration: 320, yoyo: true, repeat: -1 });
      const glow = s.add.circle(spec.x - 26, spec.y + 30, 26, 0xff9a3c, 0.16).setDepth(3).setBlendMode(Phaser.BlendModes.ADD);
      s.tweens.add({ targets: glow, alpha: { from: 0.1, to: 0.24 }, duration: 420, yoyo: true, repeat: -1 });
    }
    if (spec.hasDock) {
      // Wooden pier reaching into open water
      const len = 3;
      const dx = Math.cos(spec.dockAngle);
      const dy = Math.sin(spec.dockAngle);
      for (let i = 0; i < len; i++) {
        const px = spec.x + dx * (spec.radius + 26 + i * 52);
        const py = spec.y + dy * (spec.radius + 26 + i * 52);
        const plank = s.add.image(px, py, 'dock-plank').setDepth(3);
        plank.setRotation(spec.dockAngle + Math.PI / 2);
      }
      // Dock-head collision so boats bump the pier tip, not the island
      const tipX = spec.x + dx * (spec.radius + 26 + (len - 1) * 52);
      const tipY = spec.y + dy * (spec.radius + 26 + (len - 1) * 52);
      this.obstacles.push({ x: tipX, y: tipY, radius: 22, type: 'rock', sprite: this.scene.add.circle(tipX, tipY, 4, 0, 0) });
    }
  }

  private buildRockChannels(cx: number, cy: number): void {
    // Narrow gate + scattered hazards force precise steering lines
    const rocks = [
      { x: cx - 380, y: cy - 200, r: 24 },
      { x: cx - 430, y: cy - 160, r: 18 },
      { x: cx + 120, y: cy - 60, r: 20 },
      { x: cx - 60, y: cy + 120, r: 26 },
      { x: cx + 240, y: cy + 420, r: 22 },
      { x: cx - 120, y: cy - 460, r: 24 },
      { x: cx + 560, y: cy + 60, r: 20 },
    ];
    for (const r of rocks) {
      const rock = this.scene.add.image(r.x, r.y, 'obstacle-rock').setDepth(3);
      rock.setScale(r.r / 26);
      this.obstacles.push({ x: r.x, y: r.y, radius: r.r, type: 'rock', sprite: rock });
    }
  }

  private buildSlalomBuoys(cx: number, cy: number): void {
    const pts = [
      { x: cx - 150, y: cy - 120 },
      { x: cx + 100, y: cy - 180 },
      { x: cx + 240, y: cy - 40 },
      { x: cx + 120, y: cy + 160 },
      { x: cx - 80, y: cy + 220 },
      { x: cx - 260, y: cy + 100 },
    ];
    pts.forEach((b, i) => {
      const buoy = this.scene.add.image(b.x, b.y, 'obstacle-buoy').setDepth(4);
      this.scene.tweens.add({
        targets: buoy,
        y: b.y - 6,
        duration: 1100 + i * 130,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      this.obstacles.push({ x: b.x, y: b.y, radius: 12, type: 'buoy', sprite: buoy });
    });
  }

  private buildRipples(): void {
    // Drifting swell dashes: slow current + sine bob + alpha breathing.
    // 26 plain images with trivial per-frame math — near-zero cost.
    const flowAng = 0.6; // shared current direction (matches tile drift)
    for (let i = 0; i < 26; i++) {
      const x = 120 + Math.random() * (this.worldWidth - 240);
      const y = 120 + Math.random() * (this.worldHeight - 240);
      const img = this.scene.add.image(x, y, 'fx-ripple').setDepth(-7).setAlpha(0.35);
      img.setScale(0.6 + Math.random() * 1.1);
      img.setRotation(flowAng + (Math.random() - 0.5) * 0.9);
      const speed = 9 + Math.random() * 12; // px/sec along the current
      this.swells.push({
        img,
        vx: Math.cos(flowAng) * speed,
        vy: Math.sin(flowAng) * speed,
        baseAlpha: 0.22 + Math.random() * 0.22,
        phase: Math.random() * Math.PI * 2,
        breathe: 0.7 + Math.random() * 0.9, // breath cycles/sec factor
        bobAmp: 5 + Math.random() * 8, // perpendicular sway px
      });
    }
  }

  private buildCloudShadows(): void {
    for (let i = 0; i < 5; i++) {
      const x = Math.random() * this.worldWidth;
      const y = Math.random() * this.worldHeight;
      const sh = this.scene.add.image(x, y, 'fx-wake-stamp').setDepth(5).setAlpha(0.14).setTint(0x0c1a2e);
      sh.setScale(9 + Math.random() * 6);
      this.cloudShadows.push(sh);
    }
  }

  private buildBirds(): void {
    for (let i = 0; i < 4; i++) {
      const g = this.scene.add.circle(Math.random() * this.worldWidth, Math.random() * this.worldHeight, 3, 0x0f172a, 0.7);
      g.setDepth(20);
      this.birds.push({ g, vx: 28 + Math.random() * 30, phase: Math.random() * Math.PI * 2 });
    }
  }

  private buildFireflies(islands: IslandSpec[]): void {
    const pts: Array<{ x: number; y: number }> = islands.map((isl) => ({ x: isl.x, y: isl.y }));
    this.scene.add.particles(0, 0, 'fx-wake-stamp', {
      x: { min: pts[0].x - 90, max: pts[0].x + 90 },
      y: { min: pts[0].y - 90, max: pts[0].y + 90 },
      lifespan: 2200,
      speedY: { min: -12, max: -28 },
      speedX: { min: -10, max: 10 },
      scale: { start: 0.12, end: 0.02 },
      alpha: { start: 0.7, end: 0 },
      frequency: 420,
      tint: [0xfde68a, 0xfbbf24, 0xffffff],
    }).setDepth(6);
  }

  public update(_time: number, delta: number): void {
    this.time += delta / 1000;
    // Birds cruise eastward, wrap around world
    for (const b of this.birds) {
      b.g.x += b.vx * (delta / 1000);
      b.g.y += Math.sin(this.time * 2 + b.phase) * 0.35;
      if (b.g.x > this.worldWidth + 40) {
        b.g.x = -40;
        b.g.y = 100 + Math.random() * (this.worldHeight - 200);
      }
    }
    for (const c of this.cloudShadows) {
      c.x += 6 * (delta / 1000);
      if (c.x > this.worldWidth + 300) c.x = -300;
    }
    // Swells ride the current, sway sideways on a sine, and breathe.
    const dt = delta / 1000;
    const margin = 60;
    for (const s of this.swells) {
      s.img.x += s.vx * dt;
      s.img.y += s.vy * dt + Math.cos(this.time * s.breathe + s.phase) * s.bobAmp * dt;
      s.img.alpha = s.baseAlpha * (0.6 + 0.4 * Math.sin(this.time * s.breathe * 1.3 + s.phase));
      if (s.img.x > this.worldWidth + margin) s.img.x = -margin;
      if (s.img.x < -margin) s.img.x = this.worldWidth + margin;
      if (s.img.y > this.worldHeight + margin) s.img.y = -margin;
      if (s.img.y < -margin) s.img.y = this.worldHeight + margin;
    }
    // Fish schools + dolphins (boats fed in by the scene for flee checks)
    this.marineLife?.update(_time, delta, this.boatPositions);
  }
}
