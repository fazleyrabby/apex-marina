import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.ts';
import { PlaygroundScene } from './scenes/PlaygroundScene.ts';
import { RacingScene } from './scenes/RacingScene.ts';
import { initVisitorCounter } from './utils/visitorCounter.ts';
import { TouchController } from './input/TouchController.ts';
import './style.css';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-canvas-container',
  backgroundColor: '#075985',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: '100%',
    height: '100%',
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: false,
  },
  scene: [BootScene, PlaygroundScene, RacingScene],
};

// Initialize Phaser Game instance (exposed for live debugging via devtools)
const game = new Phaser.Game(config);
(window as unknown as { __apexGame?: Phaser.Game }).__apexGame = game;

// Setup HTML HUD Event Listeners
window.addEventListener('DOMContentLoaded', () => {
  void initVisitorCounter();
  TouchController.getInstance().init();
  const speedEl = document.getElementById('hud-speed-value');
  const boostBarEl = document.getElementById('hud-boost-bar');
  const boostLabelEl = document.getElementById('hud-boost-label');
  const driftIndicatorEl = document.getElementById('hud-drift-indicator');
  const muteBtn = document.getElementById('hud-mute-btn');
  const debugPanel = document.getElementById('hud-debug-panel');

  // Debug metric elements
  const dbgFps = document.getElementById('dbg-fps');
  const dbgPos = document.getElementById('dbg-pos');
  const dbgSpeed = document.getElementById('dbg-speed');
  const dbgForward = document.getElementById('dbg-forward');
  const dbgLateral = document.getElementById('dbg-lateral');
  const dbgHeading = document.getElementById('dbg-heading');

  window.addEventListener('apex-hud-update', (e: Event) => {
    const detail = (e as CustomEvent).detail;
    if (speedEl) speedEl.textContent = detail.knots.toString();

    if (boostBarEl) {
      boostBarEl.style.width = `${detail.boostPct}%`;
      if (detail.isBoosting) {
        boostBarEl.classList.add('boosting');
      } else {
        boostBarEl.classList.remove('boosting');
      }
    }

    if (boostLabelEl) {
      if (detail.isBoosting) {
        boostLabelEl.textContent = 'NITRO BURNING';
        boostLabelEl.style.color = '#38bdf8';
      } else if (detail.boostPct >= 100) {
        boostLabelEl.textContent = 'NITRO READY [SPACE]';
        boostLabelEl.style.color = '#fbbf24';
      } else {
        boostLabelEl.textContent = `RECHARGING (${detail.boostPct}%)`;
        boostLabelEl.style.color = '#94a3b8';
      }
    }

    if (driftIndicatorEl) {
      if (detail.isDrifting) {
        driftIndicatorEl.classList.add('active');
      } else {
        driftIndicatorEl.classList.remove('active');
      }
    }

    // Update Debug Metrics if panel is active
    if (debugPanel && debugPanel.style.display !== 'none') {
      if (dbgFps) dbgFps.textContent = detail.fps;
      if (dbgPos) dbgPos.textContent = `(${detail.posX}, ${detail.posY})`;
      if (dbgSpeed) dbgSpeed.textContent = `${detail.speed} px/s (${detail.knots} kts)`;
      if (dbgForward) dbgForward.textContent = `${detail.forwardSpeed} px/s`;
      if (dbgLateral) dbgLateral.textContent = `${detail.lateralSpeed} px/s`;
      if (dbgHeading) dbgHeading.textContent = `${detail.headingDeg}°`;
    }
  });

  window.addEventListener('apex-toggle-debug', () => {
    if (debugPanel) {
      const isHidden = debugPanel.style.display === 'none' || !debugPanel.style.display;
      debugPanel.style.display = isHidden ? 'block' : 'none';
    }
  });

  if (muteBtn) {
    muteBtn.addEventListener('click', () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'm', code: 'KeyM' }));
    });
  }

  window.addEventListener('apex-sound-toggled', (e: Event) => {
    const detail = (e as CustomEvent).detail;
    if (muteBtn) {
      muteBtn.textContent = detail.isMuted ? '🔇 Unmute (M)' : '🔊 Sound (M)';
      muteBtn.classList.toggle('muted', detail.isMuted);
    }
  });

  // ---- Scene navigation (Explore <-> Race) ----
  const navBtn = document.getElementById('hud-nav-btn');
  const raceBar = document.getElementById('hud-race-bar');
  const lapEl = document.getElementById('hud-lap');
  const posEl = document.getElementById('hud-pos');
  const flashEl = document.getElementById('hud-flash');
  const resultsOverlay = document.getElementById('race-results');
  const resultsSubtitle = document.getElementById('results-subtitle');
  const resultsRows = document.getElementById('results-rows');
  let inRace = false;
  let flashTimer = 0;

  const gotoScene = (key: 'PlaygroundScene' | 'RacingScene'): void => {
    game.scene.stop('PlaygroundScene');
    game.scene.stop('RacingScene');
    game.scene.start(key);
  };

  const flash = (text: string): void => {
    if (!flashEl) return;
    flashEl.textContent = text;
    flashEl.classList.add('show');
    window.clearTimeout(flashTimer);
    flashTimer = window.setTimeout(() => flashEl.classList.remove('show'), 1400);
  };

  const setRaceMode = (racing: boolean): void => {
    inRace = racing;
    if (raceBar) raceBar.style.display = racing ? 'flex' : 'none';
    // Always hide the results card on any scene switch — otherwise a
    // restarted race runs invisibly behind the stale overlay.
    if (resultsOverlay) resultsOverlay.style.display = 'none';
    if (navBtn) {
      navBtn.innerHTML = racing ? '🧭 Explore' : '🏁 Race';
      navBtn.title = racing ? 'Back to free exploration (ESC)' : 'Start a race';
    }
  };

  if (navBtn) {
    navBtn.addEventListener('click', () => {
      gotoScene(inRace ? 'PlaygroundScene' : 'RacingScene');
    });
  }

  window.addEventListener('apex-explore-started', () => setRaceMode(false));
  window.addEventListener('apex-race-started', () => setRaceMode(true));

  window.addEventListener('apex-race-update', (e: Event) => {
    const detail = (e as CustomEvent).detail;
    if (lapEl) lapEl.textContent = `${detail.lap}/${detail.laps}`;
    if (posEl) posEl.textContent = `${detail.rank}/${detail.total}`;
  });

  window.addEventListener('apex-race-go', () => flash('GO!'));
  window.addEventListener('apex-checkpoint', () => flash('CHECKPOINT ✓'));
  window.addEventListener('apex-final-lap', () => flash('FINAL LAP'));

  window.addEventListener('apex-race-results', (e: Event) => {
    const detail = (e as CustomEvent).detail as {
      standings: Array<{ name: string; isPlayer: boolean; time: string; best: string }>;
      rank: number;
      total: number;
      track: string;
    };
    if (resultsSubtitle) {
      const suffix = detail.rank === 1 ? '🏆 Victory!' : detail.rank <= 3 ? '🥉 Podium finish!' : '🌊 Finished!';
      resultsSubtitle.textContent = `${detail.track} — You placed ${detail.rank}/${detail.total} ${suffix}`;
    }
    if (resultsRows) {
      resultsRows.innerHTML = '';
      detail.standings.forEach((s, i) => {
        const row = document.createElement('div');
        row.className = `results-row${s.isPlayer ? ' me' : ''}`;
        row.innerHTML = `<span>${i + 1}. ${s.name}</span><span class="r-time">${s.time} · best ${s.best}</span>`;
        resultsRows.appendChild(row);
      });
    }
    if (resultsOverlay) resultsOverlay.style.display = 'flex';
  });

  document.getElementById('results-retry')?.addEventListener('click', () => gotoScene('RacingScene'));
  document.getElementById('results-explore')?.addEventListener('click', () => gotoScene('PlaygroundScene'));
});
