import Phaser from 'phaser';
import type { BoatConfig } from '../types/index.ts';
import { WaterSystem } from '../world/WaterSystem.ts';
import { SoundManager } from '../utils/SoundManager.ts';

export class PlayerBoat extends Phaser.GameObjects.Container {
  public config: BoatConfig;
  private sprite: Phaser.GameObjects.Sprite;
  private waterSystem: WaterSystem;
  private soundManager: SoundManager;

  // Hydrodynamic State
  public velocityX: number = 0;
  public velocityY: number = 0;
  public heading: number = 0; // Radians
  public forwardSpeed: number = 0;
  public lateralSpeed: number = 0;
  public currentSpeed: number = 0;

  // Boost System
  public isBoosting: boolean = false;
  public boostEnergy: number = 1.0; // 0 to 1
  public boostCooldownTimer: number = 0;
  private boostActiveTimer: number = 0;

  // Spray Particles
  private sprayParticles: Phaser.GameObjects.Particles.ParticleEmitter;

  // Wake stamping throttle timer
  private wakeStampTimer: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, config: BoatConfig, waterSystem: WaterSystem) {
    super(scene, x, y);
    this.config = config;
    this.waterSystem = waterSystem;
    this.soundManager = SoundManager.getInstance();

    // Visual Sprite
    this.sprite = scene.add.sprite(0, 0, config.id || 'boat-player');
    this.add(this.sprite);

    // Particle Emitter for Hydrodynamic Spray
    this.sprayParticles = scene.add.particles(0, 0, 'fx-wake-stamp', {
      lifespan: { min: 250, max: 450 },
      speed: { min: 40, max: 90 },
      scale: { start: 0.35, end: 0.05 },
      alpha: { start: 0.6, end: 0 },
      emitting: false,
    });
    this.sprayParticles.setDepth(-4);

    scene.add.existing(this);
    this.setDepth(10);
  }

  public update(
    _time: number,
    delta: number,
    controls: { up: boolean; down: boolean; left: boolean; right: boolean; boost: boolean }
  ): void {
    const dt = delta / 1000; // Delta in seconds

    // 1. Boost Logic
    this.handleBoost(dt, controls.boost);

    // 2. Unit Forward and Lateral Vectors
    const forwardX = Math.cos(this.heading);
    const forwardY = Math.sin(this.heading);
    const lateralX = -Math.sin(this.heading);
    const lateralY = Math.cos(this.heading);

    // 3. Thrust & Braking / Reverse
    if (controls.up) {
      this.velocityX += forwardX * this.config.acceleration * dt;
      this.velocityY += forwardY * this.config.acceleration * dt;
    } else if (controls.down) {
      this.velocityX -= forwardX * this.config.brakingDecel * dt;
      this.velocityY -= forwardY * this.config.brakingDecel * dt;
    }

    // 4. Decompose Velocity into Forward & Lateral Hydrodynamic Components
    this.forwardSpeed = this.velocityX * forwardX + this.velocityY * forwardY;
    this.lateralSpeed = this.velocityX * lateralX + this.velocityY * lateralY;

    // 5. Differential Keel Damping (Hydrodynamic Keel Grip vs Water Drift)
    // Forward drag is light; lateral damping is heavy to emulate keel resistance
    const forwardDamping = Math.pow(this.config.drag, dt * 60);
    const lateralDamping = Math.pow(this.config.lateralDrift, dt * 60);

    this.forwardSpeed *= forwardDamping;
    this.lateralSpeed *= lateralDamping;

    // 6. Recombine Velocity
    this.velocityX = forwardX * this.forwardSpeed + lateralX * this.lateralSpeed;
    this.velocityY = forwardY * this.forwardSpeed + lateralY * this.lateralSpeed;

    // 7. Clamp Max Speed (Boost-adjusted)
    const effectiveMaxSpeed = this.isBoosting
      ? this.config.maxSpeed * this.config.boostMultiplier
      : this.config.maxSpeed;

    this.currentSpeed = Math.hypot(this.velocityX, this.velocityY);
    if (this.currentSpeed > effectiveMaxSpeed) {
      const scale = effectiveMaxSpeed / this.currentSpeed;
      this.velocityX *= scale;
      this.velocityY *= scale;
      this.currentSpeed = effectiveMaxSpeed;
    }

    // 8. Steering Sensitivity (responsive at speed, zero when static)
    let steering = 0;
    if (controls.left) steering -= 1;
    if (controls.right) steering += 1;

    // Turn factor scales with speed to prevent erratic spinning in place
    const turnFactor = Math.min(1.0, this.currentSpeed / (this.config.maxSpeed * 0.2));
    // If reversing, invert steering direction like a real rudder
    const reverseSign = this.forwardSpeed < -10 ? -1 : 1;
    this.heading += steering * this.config.turnSpeed * turnFactor * reverseSign * dt;

    // Normalize heading (-PI to PI)
    this.heading = Phaser.Math.Angle.Normalize(this.heading);
    this.rotation = this.heading;

    // 9. Integrate World Position
    this.x += this.velocityX * dt;
    this.y += this.velocityY * dt;

    // 10. Dynamic Wake & Particle Emission
    this.emitWakeAndParticles(dt);

    // 11. Audio Pitch & Wake Modulation
    const speedRatio = this.currentSpeed / this.config.maxSpeed;
    const isDrifting = Math.abs(this.lateralSpeed) > 40;
    this.soundManager.updateBoatSound(speedRatio, this.isBoosting, isDrifting);
  }

  private handleBoost(dt: number, boostKeyPressed: boolean): void {
    if (this.boostCooldownTimer > 0) {
      this.boostCooldownTimer -= dt;
      this.boostEnergy = Math.min(1.0, 1.0 - this.boostCooldownTimer / this.config.boostCooldown);
    }

    if (boostKeyPressed && !this.isBoosting && this.boostCooldownTimer <= 0 && this.boostEnergy >= 0.95) {
      // Trigger Nitro Boost
      this.isBoosting = true;
      this.boostActiveTimer = this.config.boostDuration;
      this.boostCooldownTimer = this.config.boostCooldown;
      this.boostEnergy = 0;
      this.soundManager.playBoostSound();

      // Subtle camera rumble
      this.scene.cameras.main.shake(300, 0.005);
    }

    if (this.isBoosting) {
      this.boostActiveTimer -= dt;
      if (this.boostActiveTimer <= 0) {
        this.isBoosting = false;
      }
    }
  }

  private emitWakeAndParticles(dt: number): void {
    this.wakeStampTimer += dt;

    // Stamp wake every ~0.04s (25Hz) to create a smooth continuous trail
    if (this.wakeStampTimer >= 0.038 && this.currentSpeed > 15) {
      this.wakeStampTimer = 0;

      // Stern position offset
      const sternX = this.x - Math.cos(this.heading) * 26;
      const sternY = this.y - Math.sin(this.heading) * 26;

      const speedFactor = Math.min(1.2, this.currentSpeed / this.config.maxSpeed);
      const wakeScale = (0.5 + speedFactor * 0.6) * (this.isBoosting ? 1.4 : 1.0);
      const wakeAlpha = 0.55 + speedFactor * 0.35;

      this.waterSystem.stampWake(sternX, sternY, this.heading, wakeScale, wakeAlpha);

      // Trigger spray particles if fast or drifting
      if (this.currentSpeed > 120 || Math.abs(this.lateralSpeed) > 30) {
        const spreadAngle = this.heading + Math.PI + (Math.random() - 0.5) * 0.6;
        this.sprayParticles.emitParticleAt(
          sternX,
          sternY,
          this.isBoosting ? 3 : 1
        );
        this.sprayParticles.setParticleSpeed(
          Math.cos(spreadAngle) * 50,
          Math.sin(spreadAngle) * 50
        );
      }
    }
  }

  /**
   * Called on collision with an obstacle or boat.
   */
  public handleCollision(normalX: number, normalY: number, bounceRestitution: number = 0.5): void {
    // Velocity reflection along normal: v' = v - (1 + e)(v . n)n
    const dot = this.velocityX * normalX + this.velocityY * normalY;
    if (dot < 0) {
      this.velocityX -= (1 + bounceRestitution) * dot * normalX;
      this.velocityY -= (1 + bounceRestitution) * dot * normalY;
      this.soundManager.playCollisionSound();
      this.scene.cameras.main.shake(120, 0.003);
    }
  }
}
