import Phaser from 'phaser';
import { PlayerBoat } from '../entities/PlayerBoat.ts';
import { WaterSystem } from '../world/WaterSystem.ts';
import { Environment, type Obstacle } from '../world/Environment.ts';
import { DEFAULT_PLAYER_BOAT } from '../data/boats.ts';
import { SoundManager } from '../utils/SoundManager.ts';
import { TouchController } from '../input/TouchController.ts';

export class PlaygroundScene extends Phaser.Scene {
  private waterSystem!: WaterSystem;
  private environment!: Environment;
  private playerBoat!: PlayerBoat;
  private obstacles: Obstacle[] = [];

  // Controls
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyW!: Phaser.Input.Keyboard.Key;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyS!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private keySpace!: Phaser.Input.Keyboard.Key;

  // Camera lookahead target
  private cameraLookAhead!: Phaser.GameObjects.Sprite;
  private touch = TouchController.getInstance();

  // World Bounds
  private readonly worldWidth = 3600;
  private readonly worldHeight = 2400;

  constructor() {
    super({ key: 'PlaygroundScene' });
  }

  public create(): void {
    // 1. Setup World Bounds & Physics bounds
    this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);

    // 2. Initialize Layered Water & Wake System
    this.waterSystem = new WaterSystem(this, {
      width: this.worldWidth,
      height: this.worldHeight,
    });

    // 3. Build Living Archipelago (Phase 2 Environment)
    this.environment = new Environment(this, this.worldWidth, this.worldHeight);
    this.environment.build();
    this.obstacles = this.environment.obstacles;

    // 4. Spawn Player Speedboat
    const startX = this.worldWidth / 2;
    const startY = this.worldHeight / 2;
    this.playerBoat = new PlayerBoat(this, startX, startY, DEFAULT_PLAYER_BOAT, this.waterSystem);

    // 5. Setup Camera Lookahead
    this.cameraLookAhead = this.add.sprite(startX, startY, '');
    this.cameraLookAhead.setVisible(false);

    this.cameras.main.startFollow(this.cameraLookAhead, true, 0.07, 0.07);
    // Zoom out slightly on narrow screens so the boat stays readable
    // and more water is visible ahead.
    this.cameras.main.setZoom(this.scale.width < 700 ? 0.8 : 1.05);

    // 6. Setup Keyboard Input
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
      this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
      this.keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
      this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
      this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

      // Audio Mute Toggle
      this.input.keyboard.on('keydown-M', () => {
        const isMuted = SoundManager.getInstance().toggleMute();
        window.dispatchEvent(new CustomEvent('apex-sound-toggled', { detail: { isMuted } }));
      });

      // Debug Panel Toggle
      this.input.keyboard.on('keydown-F1', () => {
        window.dispatchEvent(new CustomEvent('apex-toggle-debug'));
      });
    }

    // Start Procedural Audio on First User Interaction
    const startAudio = () => {
      SoundManager.getInstance().init();
      SoundManager.getInstance().startEngine();
      window.removeEventListener('keydown', startAudio);
      window.removeEventListener('pointerdown', startAudio);
    };
    window.addEventListener('keydown', startAudio, { once: true });
    window.addEventListener('pointerdown', startAudio, { once: true });

    window.dispatchEvent(new CustomEvent('apex-explore-started', {}));
  }

  public update(time: number, delta: number): void {
    // 1. Gather Controls (keyboard OR virtual touch buttons)
    const t = this.touch.state;
    const controls = {
      up: Boolean(this.cursors?.up.isDown || this.keyW?.isDown || t.up),
      down: Boolean(this.cursors?.down.isDown || this.keyS?.isDown || t.down),
      left: Boolean(this.cursors?.left.isDown || this.keyA?.isDown || t.left),
      right: Boolean(this.cursors?.right.isDown || this.keyD?.isDown || t.right),
      boost: Boolean(this.keySpace?.isDown || t.boost),
    };

    // 2. Update Boat Hydrodynamics & Wake
    this.playerBoat.update(time, delta, controls);

    // 3. Keep Boat Within World Bounds
    this.playerBoat.x = Phaser.Math.Clamp(this.playerBoat.x, 40, this.worldWidth - 40);
    this.playerBoat.y = Phaser.Math.Clamp(this.playerBoat.y, 40, this.worldHeight - 40);

    // 4. Update Water + Living Environment (foam pulse, birds, clouds)
    this.environment.boatPositions = [{ x: this.playerBoat.x, y: this.playerBoat.y }];
    this.waterSystem.update(time, delta);
    this.environment.update(time, delta);

    // 5. Environmental Collisions
    this.checkCollisions();

    // 6. Camera Velocity Lookahead
    // Places the focus point ahead of the boat in the direction of travel
    const lookAheadDistance = Math.min(180, this.playerBoat.currentSpeed * 0.45);
    const targetLookX = this.playerBoat.x + Math.cos(this.playerBoat.heading) * lookAheadDistance;
    const targetLookY = this.playerBoat.y + Math.sin(this.playerBoat.heading) * lookAheadDistance;

    this.cameraLookAhead.x = Phaser.Math.Linear(this.cameraLookAhead.x, targetLookX, 0.1);
    this.cameraLookAhead.y = Phaser.Math.Linear(this.cameraLookAhead.y, targetLookY, 0.1);

    // 7. Dispatch Telemetry for HTML HUD
    this.dispatchHUDTelemetry();
  }

  private checkCollisions(): void {
    const boatRadius = 18;
    const boatX = this.playerBoat.x;
    const boatY = this.playerBoat.y;

    for (const obs of this.obstacles) {
      const dx = boatX - obs.x;
      const dy = boatY - obs.y;
      const dist = Math.hypot(dx, dy);
      const minDist = boatRadius + obs.radius;

      if (dist < minDist && dist > 0) {
        // Normal pointing from obstacle to boat
        const nx = dx / dist;
        const ny = dy / dist;

        // Push boat out of collision penetration
        const overlap = minDist - dist;
        this.playerBoat.x += nx * overlap;
        this.playerBoat.y += ny * overlap;

        // Apply hydrodynamic bounce impulse
        this.playerBoat.handleCollision(nx, ny, obs.type === 'buoy' ? 0.35 : 0.6);

        // Buoy wiggle reaction
        if (obs.type === 'buoy') {
          this.tweens.add({
            targets: obs.sprite,
            scaleX: 1.25,
            scaleY: 0.85,
            duration: 90,
            yoyo: true,
          });
        }
      }
    }
  }

  private dispatchHUDTelemetry(): void {
    // 1 knot ≈ 1.6878 ft/s; in our scaled arcade units:
    const knots = Math.round(this.playerBoat.currentSpeed * 0.12);
    const boostPct = Math.round(this.playerBoat.boostEnergy * 100);
    const isDrifting = Math.abs(this.playerBoat.lateralSpeed) > 40;

    window.dispatchEvent(
      new CustomEvent('apex-hud-update', {
        detail: {
          knots,
          speed: Math.round(this.playerBoat.currentSpeed),
          forwardSpeed: Math.round(this.playerBoat.forwardSpeed),
          lateralSpeed: Math.round(this.playerBoat.lateralSpeed),
          headingDeg: Math.round((this.playerBoat.heading * 180) / Math.PI),
          boostPct,
          isBoosting: this.playerBoat.isBoosting,
          isDrifting,
          fps: Math.round(this.game.loop.actualFps),
          posX: Math.round(this.playerBoat.x),
          posY: Math.round(this.playerBoat.y),
        },
      })
    );
  }
}
