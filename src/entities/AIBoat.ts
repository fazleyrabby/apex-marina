import Phaser from 'phaser';
import type { BoatConfig } from '../types/index.ts';
import type { WaterSystem } from '../world/WaterSystem.ts';
import { SoundManager } from '../utils/SoundManager.ts';
import type { AIInput } from '../racing/AIController.ts';

/** AI opponent: same arcade hydrodynamics as the player, driven by AIController. */
export class AIBoat extends Phaser.GameObjects.Container {
  public velocityX = 0;
  public velocityY = 0;
  public heading = 0;
  public forwardSpeed = 0;
  public lateralSpeed = 0;
  public currentSpeed = 0;
  public prevX = 0;
  public prevY = 0;
  public isBoosting = false;
  public boostEnergy = 1;
  /** Rubber-band factor set by the race scene (0.94–1.06): keeps the pack together. */
  public paceFactor = 1;
  private boostCooldownTimer = 0;
  private boostActiveTimer = 0;
  private wakeStampTimer = 0;
  private sound = SoundManager.getInstance();

  constructor(
    scene: Phaser.Scene,
    x: number, y: number,
    public config: BoatConfig,
    private waterSystem: WaterSystem,
  ) {
    super(scene, x, y);
    this.prevX = x;
    this.prevY = y;
    const sprite = scene.add.sprite(0, 0, config.id);
    this.add(sprite);
    scene.add.existing(this);
    this.setDepth(10);
  }

  public update(_time: number, delta: number, c: AIInput): void {
    const dt = Math.min(0.05, delta / 1000);
    this.prevX = this.x;
    this.prevY = this.y;

    // Boost (AI uses same energy model so trails stay fair)
    if (this.boostCooldownTimer > 0) {
      this.boostCooldownTimer -= dt;
      this.boostEnergy = Math.min(1, 1 - this.boostCooldownTimer / this.config.boostCooldown);
    }
    if (c.boost && !this.isBoosting && this.boostCooldownTimer <= 0 && this.boostEnergy >= 0.95) {
      this.isBoosting = true;
      this.boostActiveTimer = this.config.boostDuration;
      this.boostCooldownTimer = this.config.boostCooldown;
      this.boostEnergy = 0;
    }
    if (this.isBoosting) {
      this.boostActiveTimer -= dt;
      if (this.boostActiveTimer <= 0) this.isBoosting = false;
    }

    const fx = Math.cos(this.heading);
    const fy = Math.sin(this.heading);
    const lx = -Math.sin(this.heading);
    const ly = Math.cos(this.heading);
    if (c.up) {
      this.velocityX += fx * this.config.acceleration * dt;
      this.velocityY += fy * this.config.acceleration * dt;
    } else if (c.down) {
      this.velocityX -= fx * this.config.brakingDecel * dt;
      this.velocityY -= fy * this.config.brakingDecel * dt;
    }
    this.forwardSpeed = this.velocityX * fx + this.velocityY * fy;
    this.lateralSpeed = this.velocityX * lx + this.velocityY * ly;
    this.forwardSpeed *= Math.pow(this.config.drag, dt * 60);
    this.lateralSpeed *= Math.pow(this.config.lateralDrift, dt * 60);
    this.velocityX = fx * this.forwardSpeed + lx * this.lateralSpeed;
    this.velocityY = fy * this.forwardSpeed + ly * this.lateralSpeed;

    const max = (this.isBoosting ? this.config.maxSpeed * this.config.boostMultiplier : this.config.maxSpeed) * this.paceFactor;
    this.currentSpeed = Math.hypot(this.velocityX, this.velocityY);
    if (this.currentSpeed > max) {
      const s = max / this.currentSpeed;
      this.velocityX *= s;
      this.velocityY *= s;
      this.currentSpeed = max;
    }
    let steer = 0;
    if (c.left) steer -= 1;
    if (c.right) steer += 1;
    const turnFactor = Math.min(1, this.currentSpeed / (this.config.maxSpeed * 0.2));
    const rev = this.forwardSpeed < -10 ? -1 : 1;
    this.heading = Phaser.Math.Angle.Normalize(this.heading + steer * this.config.turnSpeed * turnFactor * rev * dt);
    this.rotation = this.heading;
    this.x += this.velocityX * dt;
    this.y += this.velocityY * dt;

    // Wake trail (throttled, same RenderTexture buffer)
    this.wakeStampTimer += dt;
    if (this.wakeStampTimer >= 0.05 && this.currentSpeed > 20) {
      this.wakeStampTimer = 0;
      const sx = this.x - Math.cos(this.heading) * 26;
      const sy = this.y - Math.sin(this.heading) * 26;
      const sf = Math.min(1.2, this.currentSpeed / this.config.maxSpeed);
      this.waterSystem.stampWake(sx, sy, this.heading, (0.5 + sf * 0.6) * (this.isBoosting ? 1.4 : 1), 0.5 + sf * 0.3);
    }
  }

  public handleCollision(nx: number, ny: number, e = 0.5): void {
    const dot = this.velocityX * nx + this.velocityY * ny;
    if (dot < 0) {
      this.velocityX -= (1 + e) * dot * nx;
      this.velocityY -= (1 + e) * dot * ny;
      this.sound.playCollisionSound();
    }
  }
}
