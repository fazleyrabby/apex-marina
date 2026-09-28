/**
 * TouchController — virtual on-screen boat controls for touch devices.
 *
 * Singleton holding the current touch input state in the same shape the
 * scenes already use for keyboard (`{ up, down, left, right, boost }`), so
 * scenes just OR the two sources together. The overlay markup lives in
 * index.html (`#touch-controls`) and is only shown on coarse-pointer
 * devices. Pointer Events give us multi-touch for free (throttle + steer
 * held simultaneously), each button tracking its own pointer id.
 */

export interface TouchState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  boost: boolean;
}

type TouchKey = keyof TouchState;

const FRESH_STATE = (): TouchState => ({ up: false, down: false, left: false, right: false, boost: false });

export class TouchController {
  private static instance: TouchController | null = null;

  public readonly state: TouchState = FRESH_STATE();
  public isTouch = false;
  private initialized = false;

  private constructor() {}

  public static getInstance(): TouchController {
    if (!TouchController.instance) TouchController.instance = new TouchController();
    return TouchController.instance;
  }

  public static detectTouchDevice(): boolean {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia?.('(pointer: coarse)').matches ||
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0
    );
  }

  /** Wire up overlay buttons; call once on DOMContentLoaded. */
  public init(): void {
    if (this.initialized) return;
    this.initialized = true;
    this.isTouch = TouchController.detectTouchDevice();

    const overlay = document.getElementById('touch-controls');
    if (!overlay) return;

    if (this.isTouch) {
      document.body.classList.add('touch-device');
      overlay.style.display = 'flex';
    }

    overlay.querySelectorAll<HTMLButtonElement>('[data-touch]').forEach((btn) => {
      const key = btn.dataset.touch as TouchKey;
      if (!(key in this.state)) return;
      let activePointer: number | null = null;

      const press = (e: PointerEvent): void => {
        e.preventDefault();
        activePointer = e.pointerId;
        this.state[key] = true;
        btn.classList.add('pressed');
        try {
          btn.setPointerCapture(e.pointerId);
        } catch {
          // pointer capture unavailable — non-fatal
        }
      };
      const release = (e: PointerEvent): void => {
        if (activePointer !== null && e.pointerId !== activePointer) return;
        activePointer = null;
        this.state[key] = false;
        btn.classList.remove('pressed');
      };

      btn.addEventListener('pointerdown', press);
      btn.addEventListener('pointerup', release);
      btn.addEventListener('pointercancel', release);
      btn.addEventListener('lostpointercapture', release);
      // Long-press context menu (iOS) would steal the touch — suppress it.
      btn.addEventListener('contextmenu', (e) => e.preventDefault());
    });

    // Any interrupted gesture (alert, tab switch) must not leave a key stuck on.
    const clearAll = (): void => {
      (Object.keys(this.state) as TouchKey[]).forEach((k) => {
        this.state[k] = false;
      });
      overlay.querySelectorAll('.pressed').forEach((el) => el.classList.remove('pressed'));
    };
    window.addEventListener('blur', clearAll);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) clearAll();
    });
  }
}
