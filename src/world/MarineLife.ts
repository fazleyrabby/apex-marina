import Phaser from 'phaser';

export interface BoatPos {
  x: number;
  y: number;
}

const TAU = Math.PI * 2;

function wrap(v: number, max: number, margin: number): number {
  if (v > max + margin) return -margin;
  if (v < -margin) return max + margin;
  return v;
}

/** A school of tiny fish: cruises lazily, darts away when boats approach. */
class FishSchool {
  private cx: number;
  private cy: number;
  private heading: number;
  private dartT = 0;
  private wanderT = 0;
  private fishes: Array<{ img: Phaser.GameObjects.Image; ox: number; oy: number; phase: number }> = [];

  constructor(
    scene: Phaser.Scene,
    private W: number,
    private H: number,
    x: number,
    y: number,
    count: number,
  ) {
    this.cx = x;
    this.cy = y;
    this.heading = Math.random() * TAU;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * TAU;
      const r = 8 + Math.random() * 30;
      const img = scene.add.image(x, y, 'fish').setDepth(1).setAlpha(0.9);
      img.setScale(0.9 + Math.random() * 0.5);
      this.fishes.push({ img, ox: Math.cos(a) * r, oy: Math.sin(a) * r, phase: Math.random() * TAU });
    }
  }

  public update(dt: number, time: number, boats: BoatPos[]): void {
    // Flee check: nearest boat within 160px triggers a dart burst
    let fleeX = 0;
    let fleeY = 0;
    let fleeing = false;
    for (const b of boats) {
      const dx = this.cx - b.x;
      const dy = this.cy - b.y;
      if (Math.hypot(dx, dy) < 160) {
        fleeX = dx;
        fleeY = dy;
        fleeing = true;
        break;
      }
    }
    if (fleeing) {
      this.heading = Math.atan2(fleeY, fleeX);
      this.dartT = 1.1;
    }

    if (this.dartT > 0) {
      this.dartT -= dt;
    } else {
      // Lazy wander: pick a slightly new heading every couple of seconds
      this.wanderT -= dt;
      if (this.wanderT <= 0) {
        this.wanderT = 1.5 + Math.random() * 2.5;
        this.heading += (Math.random() - 0.5) * 1.4;
      }
    }

    const speed = this.dartT > 0 ? 175 : 34;
    this.cx = wrap(this.cx + Math.cos(this.heading) * speed * dt, this.W, 40);
    this.cy = wrap(this.cy + Math.sin(this.heading) * speed * dt, this.H, 40);

    // Each fish holds formation with an individual tail-wiggle
    const cosH = Math.cos(this.heading);
    const sinH = Math.sin(this.heading);
    for (const f of this.fishes) {
      const wig = Math.sin(time * (this.dartT > 0 ? 18 : 7) + f.phase) * 4;
      f.img.x = this.cx + f.ox * cosH - (f.oy + wig) * sinH;
      f.img.y = this.cy + f.ox * sinH + (f.oy + wig) * cosH;
      f.img.rotation = this.heading + Math.sin(time * 5 + f.phase) * 0.18;
    }
  }
}

/**
 * A dolphin: glides in lazy circles as a faint shadow, surfaces every
 * so often (full colour + slight breach pop), then dives again.
 */
class Dolphin {
  private img: Phaser.GameObjects.Image;
  private x: number;
  private y: number;
  private heading: number;
  private turnSeed: number;
  private surfaced: boolean;
  private stateT: number;

  constructor(private scene: Phaser.Scene, private W: number, private H: number, x: number, y: number) {
    this.x = x;
    this.y = y;
    this.heading = Math.random() * TAU;
    this.turnSeed = Math.random() * 100;
    this.surfaced = Math.random() > 0.5;
    this.stateT = 2 + Math.random() * 4;
    this.img = scene.add.image(x, y, 'dolphin').setDepth(2);
    this.img.setAlpha(this.surfaced ? 1 : 0.16);
  }

  public update(dt: number, time: number): void {
    this.stateT -= dt;
    if (this.stateT <= 0) {
      this.surfaced = !this.surfaced;
      this.stateT = this.surfaced ? 3 + Math.random() * 2.5 : 6 + Math.random() * 6;
      if (this.surfaced) {
        // Breach pop
        this.scene.tweens.add({ targets: this.img, scaleX: 1.25, scaleY: 1.25, duration: 260, yoyo: true });
      }
    }
    // Lazy circling cruise
    this.heading += Math.sin(time * 0.35 + this.turnSeed) * 0.55 * dt;
    const speed = this.surfaced ? 78 : 52;
    this.x = wrap(this.x + Math.cos(this.heading) * speed * dt, this.W, 60);
    this.y = wrap(this.y + Math.sin(this.heading) * speed * dt, this.H, 60);
    this.img.setPosition(this.x, this.y);
    this.img.setRotation(this.heading);
    const targetAlpha = this.surfaced ? 1 : 0.16;
    this.img.alpha = Phaser.Math.Linear(this.img.alpha, targetAlpha, Math.min(1, dt * 2.5));
  }
}

/** Owns all ambient marine life. ~20 images, trivial math — very light. */
export class MarineLife {
  private schools: FishSchool[] = [];
  private dolphins: Dolphin[] = [];

  constructor(scene: Phaser.Scene, W: number, H: number) {
    // Open-water spots (clear of the island ring)
    this.schools.push(new FishSchool(scene, W, H, W * 0.5, H * 0.42, 7));
    this.schools.push(new FishSchool(scene, W, H, W * 0.66, H * 0.6, 6));
    this.schools.push(new FishSchool(scene, W, H, W * 0.34, H * 0.66, 6));
    this.dolphins.push(new Dolphin(scene, W, H, W * 0.6, H * 0.35));
    this.dolphins.push(new Dolphin(scene, W, H, W * 0.4, H * 0.7));
  }

  public update(time: number, delta: number, boats: BoatPos[]): void {
    const dt = Math.min(0.05, delta / 1000);
    const t = time / 1000;
    for (const s of this.schools) s.update(dt, t, boats);
    for (const d of this.dolphins) d.update(dt, t);
  }
}
