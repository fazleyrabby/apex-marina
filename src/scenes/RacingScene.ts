import Phaser from 'phaser';
import { PlayerBoat } from '../entities/PlayerBoat.ts';
import { AIBoat } from '../entities/AIBoat.ts';
import { WaterSystem } from '../world/WaterSystem.ts';
import { Environment, type Obstacle } from '../world/Environment.ts';
import { SUNSET_BAY } from '../data/tracks.ts';
import { AI_BOTS } from '../data/aiProfiles.ts';
import { DEFAULT_PLAYER_BOAT } from '../data/boats.ts';
import { RaceManager, type RacerBody } from '../racing/RaceManager.ts';
import { AIController } from '../racing/AIController.ts';
import { renderGate } from '../racing/Checkpoint.ts';
import { SoundManager } from '../utils/SoundManager.ts';
import type { BoatConfig } from '../types/index.ts';

type RacePhase = 'countdown' | 'racing' | 'done';

function fmtTime(ms: number): string {
  if (ms <= 0) return '--:--.-';
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const d = Math.floor((ms % 1000) / 100);
  return `${m}:${s.toString().padStart(2, '0')}.${d}`;
}

export class RacingScene extends Phaser.Scene {
  private water!: WaterSystem;
  private env!: Environment;
  private obstacles: Obstacle[] = [];
  private player!: PlayerBoat;
  private ais: AIBoat[] = [];
  private controllers: AIController[] = [];
  private manager!: RaceManager;
  private audio = SoundManager.getInstance();

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyW!: Phaser.Input.Keyboard.Key;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyS!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private keySpace!: Phaser.Input.Keyboard.Key;

  private lookAhead!: Phaser.GameObjects.Sprite;
  private countdownText!: Phaser.GameObjects.Text;
  private phase: RacePhase = 'countdown';
  private countdownT = 0;
  private countdownStep = -1;
  private prevPlayerGates = 0;
  private resultsShown = false;
  private finishDelayT = 0;
  private minimap!: Phaser.GameObjects.Graphics;
  private minimapT = 0;
  private playerPrev = { x: 0, y: 0 };

  constructor() {
    super({ key: 'RacingScene' });
  }

  public create(): void {
    const W = SUNSET_BAY.worldBounds.width;
    const H = SUNSET_BAY.worldBounds.height;
    this.cameras.main.setBounds(0, 0, W, H);
    this.phase = 'countdown';
    this.countdownT = 0;
    this.countdownStep = -1;
    this.resultsShown = false;
    this.ais = [];
    this.controllers = [];

    this.water = new WaterSystem(this, { width: W, height: H });
    this.env = new Environment(this, W, H);
    this.env.build();
    this.obstacles = this.env.obstacles;

    // Track gates
    SUNSET_BAY.checkpoints.forEach((g, i) => renderGate(this, g, i === 0));

    // Racers
    this.manager = new RaceManager(SUNSET_BAY);
    const grid = SUNSET_BAY.startGrid;
    this.player = new PlayerBoat(this, grid[0].x, grid[0].y, DEFAULT_PLAYER_BOAT, this.water);
    this.player.heading = grid[0].angle;
    this.player.rotation = grid[0].angle;
    this.playerPrev = { x: grid[0].x, y: grid[0].y };
    this.manager.addRacer('player', 'You', true);

    AI_BOTS.forEach((bot, i) => {
      const slot = grid[i + 1];
      const cfg: BoatConfig = {
        ...DEFAULT_PLAYER_BOAT,
        id: bot.texture,
        name: bot.name,
        color: bot.hullColor,
        maxSpeed: DEFAULT_PLAYER_BOAT.maxSpeed * bot.maxSpeedRatio,
        acceleration: DEFAULT_PLAYER_BOAT.acceleration * bot.accelerationRatio,
      };
      const boat = new AIBoat(this, slot.x, slot.y, cfg, this.water);
      boat.heading = slot.angle;
      boat.rotation = slot.angle;
      this.ais.push(boat);
      this.controllers.push(new AIController(bot, SUNSET_BAY.aiWaypoints, 0));
      this.manager.addRacer(bot.texture, bot.name, false);
    });

    // Camera
    this.lookAhead = this.add.sprite(grid[0].x, grid[0].y, '');
    this.lookAhead.setVisible(false);
    this.cameras.main.startFollow(this.lookAhead, true, 0.07, 0.07);
    this.cameras.main.setZoom(1.15);

    // Countdown text (screen-fixed)
    this.countdownText = this.add
      .text(0, 0, '3', { fontFamily: 'Outfit, sans-serif', fontSize: '120px', color: '#ffffff' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(100);
    this.positionCountdown();

    this.minimap = this.add.graphics().setScrollFactor(0).setDepth(90);

    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
      this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
      this.keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
      this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
      this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      this.input.keyboard.on('keydown-M', () => {
        const isMuted = this.audio.toggleMute();
        window.dispatchEvent(new CustomEvent('apex-sound-toggled', { detail: { isMuted } }));
      });
      this.input.keyboard.on('keydown-F1', () => window.dispatchEvent(new CustomEvent('apex-toggle-debug')));
      this.input.keyboard.on('keydown-F5', () => this.scene.restart());
      this.input.keyboard.on('keydown-ESC', () => this.scene.start('PlaygroundScene'));
    }
    this.scale.on('resize', this.positionCountdown, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', this.positionCountdown, this));

    const startAudio = () => {
      this.audio.init();
      this.audio.startEngine();
      window.removeEventListener('keydown', startAudio);
      window.removeEventListener('pointerdown', startAudio);
    };
    window.addEventListener('keydown', startAudio, { once: true });
    window.addEventListener('pointerdown', startAudio, { once: true });

    window.dispatchEvent(new CustomEvent('apex-race-started', { detail: { name: SUNSET_BAY.name, laps: SUNSET_BAY.laps } }));
  }

  private positionCountdown(): void {
    if (!this.countdownText) return;
    this.countdownText.setPosition(this.scale.width / 2, this.scale.height * 0.38);
  }

  public update(time: number, delta: number): void {
    const dt = Math.min(0.05, delta / 1000);
    this.water.update(time, delta);
    this.env.boatPositions = [
      { x: this.player.x, y: this.player.y },
      ...this.ais.map((a) => ({ x: a.x, y: a.y })),
    ];
    this.env.update(time, delta);

    if (this.phase === 'countdown') {
      this.updateCountdown(delta);
      this.dispatchRaceHUD();
      return;
    }

    // Gather player input (coast on autopilot after finish)
    const playerState = this.manager.racers.find((r) => r.isPlayer);
    const finished = playerState?.isFinished ?? false;
    const controls = finished
      ? { up: false, down: false, left: false, right: false, boost: false }
      : {
          up: Boolean(this.cursors?.up.isDown || this.keyW?.isDown),
          down: Boolean(this.cursors?.down.isDown || this.keyS?.isDown),
          left: Boolean(this.cursors?.left.isDown || this.keyA?.isDown),
          right: Boolean(this.cursors?.right.isDown || this.keyD?.isDown),
          boost: Boolean(this.keySpace?.isDown),
        };

    this.playerPrev = { x: this.player.x, y: this.player.y };
    this.player.update(time, delta, controls);

    // AI
    const bodies: Array<{ x: number; y: number }> = [{ x: this.player.x, y: this.player.y }, ...this.ais.map((a) => ({ x: a.x, y: a.y }))];
    this.ais.forEach((boat, i) => {
      const others = bodies.filter((_, j) => j !== i + 1);
      const input = this.controllers[i].update(dt, boat.x, boat.y, boat.heading, boat.currentSpeed, boat.config.maxSpeed, others);
      boat.update(time, delta, input);
    });

    // Collisions
    this.collideEnv(this.player, 18);
    for (const b of this.ais) this.collideEnv(b, 18);
    this.collideBoats();
    this.clampBounds(this.player);
    for (const b of this.ais) this.clampBounds(b);

    // Race bookkeeping
    const map = new Map<string, RacerBody>();
    map.set('player', {
      x: this.player.x, y: this.player.y,
      prevX: this.playerPrev.x, prevY: this.playerPrev.y,
      velocityX: this.player.velocityX, velocityY: this.player.velocityY,
    });
    AI_BOTS.forEach((bot, i) => {
      const b = this.ais[i];
      map.set(bot.texture, { x: b.x, y: b.y, prevX: b.prevX, prevY: b.prevY, velocityX: b.velocityX, velocityY: b.velocityY });
    });
    this.manager.update(delta, map);

    // Rubber-band: AI ahead of the player ease off, AI behind push harder.
    // ±6% max — invisible hand, not a teleport. Off once finished.
    const ps0 = this.manager.racers.find((r) => r.isPlayer);
    AI_BOTS.forEach((bot, i) => {
      const boat = this.ais[i];
      if (!boat) return;
      if (this.phase !== 'racing' || ps0?.isFinished) {
        boat.paceFactor = 1;
        return;
      }
      const ai = this.manager.racers.find((r) => r.id === bot.texture);
      const diff = (ai?.progression ?? 0) - (ps0?.progression ?? 0);
      boat.paceFactor = Phaser.Math.Clamp(1 - diff * 0.0001, 0.94, 1.06);
    });

    // Checkpoint chime on player gate pass
    const ps = this.manager.racers.find((r) => r.isPlayer);
    if (ps && ps.completedGates > this.prevPlayerGates) {
      this.prevPlayerGates = ps.completedGates;
      this.audio.playCheckpointSound();
      window.dispatchEvent(new CustomEvent('apex-checkpoint', { detail: { lap: ps.lap, gates: ps.completedGates } }));
      if (ps.lap === SUNSET_BAY.laps && !ps.isFinished) {
        window.dispatchEvent(new CustomEvent('apex-final-lap', {}));
      }
    }

    // Finish flow
    if (ps?.isFinished && !this.resultsShown) {
      this.finishDelayT += delta;
      if (this.finishDelayT > 2200) {
        this.resultsShown = true;
        this.phase = 'done';
        this.audio.playFinishFanfare();
        this.persistBestLap(ps.bestLapMs);
        this.showResults();
      }
    }

    // Camera lookahead
    const look = Math.min(180, this.player.currentSpeed * 0.45);
    const tx = this.player.x + Math.cos(this.player.heading) * look;
    const ty = this.player.y + Math.sin(this.player.heading) * look;
    this.lookAhead.x = Phaser.Math.Linear(this.lookAhead.x, tx, 0.1);
    this.lookAhead.y = Phaser.Math.Linear(this.lookAhead.y, ty, 0.1);

    this.drawMinimap(time);
    this.dispatchRaceHUD();
    this.dispatchBoatTelemetry();
  }

  private updateCountdown(delta: number): void {
    this.countdownT += delta;
    const steps = ['3', '2', '1', 'GO!'];
    const idx = Math.min(3, Math.floor(this.countdownT / 800));
    if (idx !== this.countdownStep) {
      this.countdownStep = idx;
      this.countdownText.setText(steps[idx]);
      this.countdownText.setScale(1.4);
      this.tweens.add({ targets: this.countdownText, scale: 1, duration: 350, ease: 'Cubic.easeOut' });
      this.audio.playCountdownBeep(idx === 3);
    }
    // Boats rock in the water while waiting
    const wob = Math.sin(this.countdownT * 0.012) * 0.04;
    this.player.rotation = this.player.heading + wob;
    this.ais.forEach((b, i) => {
      b.rotation = b.heading + Math.sin(this.countdownT * 0.012 + i) * 0.04;
    });
    if (this.countdownT >= 3400) {
      this.phase = 'racing';
      this.cameras.main.zoomTo(1.05, 600, 'Cubic.easeOut');
      this.time.delayedCall(700, () => this.countdownText.setVisible(false));
      window.dispatchEvent(new CustomEvent('apex-race-go', {}));
    }
  }

  private collideEnv(boat: { x: number; y: number; handleCollision(nx: number, ny: number, e: number): void }, radius: number): void {
    for (const o of this.obstacles) {
      const dx = boat.x - o.x;
      const dy = boat.y - o.y;
      const d = Math.hypot(dx, dy);
      const min = radius + o.radius;
      if (d < min && d > 0.01) {
        const nx = dx / d;
        const ny = dy / d;
        boat.x += nx * (min - d);
        boat.y += ny * (min - d);
        boat.handleCollision(nx, ny, o.type === 'buoy' ? 0.35 : 0.6);
      }
    }
  }

  private collideBoats(): void {
    const all: Array<{ x: number; y: number; velocityX: number; velocityY: number; handleCollision(nx: number, ny: number, e: number): void }> = [
      this.player as unknown as { x: number; y: number; velocityX: number; velocityY: number; handleCollision(nx: number, ny: number, e: number): void },
      ...this.ais,
    ];
    const R = 20;
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        const a = all[i];
        const b = all[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d = Math.hypot(dx, dy);
        if (d < R * 2 && d > 0.01) {
          const nx = dx / d;
          const ny = dy / d;
          const overlap = (R * 2 - d) / 2;
          a.x += nx * overlap;
          a.y += ny * overlap;
          b.x -= nx * overlap;
          b.y -= ny * overlap;
          // Impulse exchange along normal, restitution 0.5
          const rvx = a.velocityX - b.velocityX;
          const rvy = a.velocityY - b.velocityY;
          const rel = rvx * nx + rvy * ny;
          if (rel < 0) {
            const jimp = (-(1 + 0.5) * rel) / 2;
            a.velocityX += jimp * nx;
            a.velocityY += jimp * ny;
            b.velocityX -= jimp * nx;
            b.velocityY -= jimp * ny;
          }
        }
      }
    }
  }

  private clampBounds(b: { x: number; y: number }): void {
    const W = SUNSET_BAY.worldBounds.width;
    const H = SUNSET_BAY.worldBounds.height;
    b.x = Phaser.Math.Clamp(b.x, 40, W - 40);
    b.y = Phaser.Math.Clamp(b.y, 40, H - 40);
  }

  private drawMinimap(_time: number): void {
    this.minimapT += 1;
    if (this.minimapT % 6 !== 0) return; // ~10Hz refresh
    const g = this.minimap;
    g.clear();
    const mw = 150;
    const mh = 100;
    const mx = this.scale.width / 2 - mw / 2;
    const my = this.scale.height - mh - 86;
    const W = SUNSET_BAY.worldBounds.width;
    const H = SUNSET_BAY.worldBounds.height;
    g.fillStyle(0x020617, 0.62);
    g.fillRoundedRect(mx - 8, my - 8, mw + 16, mh + 16, 10);
    // Gates
    g.lineStyle(2, 0x38bdf8, 0.9);
    for (const gate of SUNSET_BAY.checkpoints) {
      g.lineBetween(mx + (gate.x1 / W) * mw, my + (gate.y1 / H) * mh, mx + (gate.x2 / W) * mw, my + (gate.y2 / H) * mh);
    }
    // AI dots
    for (const b of this.ais) {
      g.fillStyle(0xfbbf24, 1);
      g.fillCircle(mx + (b.x / W) * mw, my + (b.y / H) * mh, 3);
    }
    // Player dot
    g.fillStyle(0xf43f5e, 1);
    g.fillCircle(mx + (this.player.x / W) * mw, my + (this.player.y / H) * mh, 4);
  }

  private dispatchRaceHUD(): void {
    const { rank, total, state } = this.manager.rankings().length
      ? this.manager.playerRank()
      : { rank: 6, total: 6, state: undefined };
    window.dispatchEvent(
      new CustomEvent('apex-race-update', {
        detail: {
          lap: Math.min(state?.lap ?? 1, SUNSET_BAY.laps),
          laps: SUNSET_BAY.laps,
          rank,
          total,
          phase: this.phase,
          raceTimeMs: this.manager.raceTimeMs,
          raceTime: fmtTime(this.manager.raceTimeMs),
          isFinished: state?.isFinished ?? false,
        },
      }),
    );
  }

  private dispatchBoatTelemetry(): void {
    const knots = Math.round(this.player.currentSpeed * 0.12);
    window.dispatchEvent(
      new CustomEvent('apex-hud-update', {
        detail: {
          knots,
          speed: Math.round(this.player.currentSpeed),
          forwardSpeed: Math.round(this.player.forwardSpeed),
          lateralSpeed: Math.round(this.player.lateralSpeed),
          headingDeg: Math.round((this.player.heading * 180) / Math.PI),
          boostPct: Math.round(this.player.boostEnergy * 100),
          isBoosting: this.player.isBoosting,
          isDrifting: Math.abs(this.player.lateralSpeed) > 40,
          fps: Math.round(this.game.loop.actualFps),
          posX: Math.round(this.player.x),
          posY: Math.round(this.player.y),
        },
      }),
    );
  }

  private persistBestLap(bestMs: number): void {
    if (!bestMs) return;
    try {
      const raw = localStorage.getItem('apex-marina-save');
      const save = raw ? (JSON.parse(raw) as { bestLapTimes?: Record<string, number> }) : {};
      const times = save.bestLapTimes ?? {};
      if (!times[SUNSET_BAY.id] || bestMs < times[SUNSET_BAY.id]) {
        times[SUNSET_BAY.id] = bestMs;
        localStorage.setItem('apex-marina-save', JSON.stringify({ ...save, bestLapTimes: times }));
      }
    } catch {
      // storage unavailable — non-fatal
    }
  }

  private showResults(): void {
    const ordered = this.manager.rankings();
    const payload = ordered.map((r) => ({
      name: r.name,
      isPlayer: r.isPlayer,
      time: r.isFinished ? fmtTime(r.finishTimeMs) : 'DNF',
      best: r.bestLapMs ? fmtTime(r.bestLapMs) : '--:--.-',
    }));
    const playerRank = this.manager.playerRank();
    window.dispatchEvent(
      new CustomEvent('apex-race-results', {
        detail: { standings: payload, rank: playerRank.rank, total: playerRank.total, track: SUNSET_BAY.name },
      }),
    );
  }
}
