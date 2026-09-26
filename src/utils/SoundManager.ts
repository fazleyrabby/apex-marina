/**
 * Procedural Audio Synthesizer using Web Audio API.
 * Provides rich dynamic boat sounds with zero external audio assets.
 */
export class SoundManager {
  private static instance: SoundManager | null = null;
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;

  // Engine Synthesizer Nodes
  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineGain: GainNode | null = null;
  private engineRunning: boolean = false;

  // Wake / Spray Synthesizer
  private wakeNoiseNode: AudioBufferSourceNode | null = null;
  private wakeFilter: BiquadFilterNode | null = null;
  private wakeGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private constructor() {}

  public static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  public init(): void {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.3;
      this.masterGain.connect(this.ctx.destination);
      this.buildNoiseBuffer();
    } catch {
      console.warn('Web Audio not supported or blocked by autoplay policy.');
    }
  }

  public resume(): void {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private buildNoiseBuffer(): void {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 2;
    this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
  }

  public startEngine(): void {
    if (!this.ctx || !this.masterGain || this.engineRunning) return;
    this.resume();

    // Dual oscillator for rich inboard/outboard motor rumble
    this.engineOsc1 = this.ctx.createOscillator();
    this.engineOsc2 = this.ctx.createOscillator();
    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineGain = this.ctx.createGain();

    this.engineOsc1.type = 'sawtooth';
    this.engineOsc1.frequency.setValueAtTime(55, this.ctx.currentTime);

    this.engineOsc2.type = 'triangle';
    this.engineOsc2.frequency.setValueAtTime(110, this.ctx.currentTime);

    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(320, this.ctx.currentTime);
    this.engineFilter.Q.setValueAtTime(2.5, this.ctx.currentTime);

    this.engineGain.gain.setValueAtTime(0.12, this.ctx.currentTime);

    this.engineOsc1.connect(this.engineFilter);
    this.engineOsc2.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);

    this.engineOsc1.start();
    this.engineOsc2.start();

    // Setup wake loop
    if (this.noiseBuffer) {
      this.wakeNoiseNode = this.ctx.createBufferSource();
      this.wakeNoiseNode.buffer = this.noiseBuffer;
      this.wakeNoiseNode.loop = true;

      this.wakeFilter = this.ctx.createBiquadFilter();
      this.wakeFilter.type = 'bandpass';
      this.wakeFilter.frequency.setValueAtTime(800, this.ctx.currentTime);
      this.wakeFilter.Q.setValueAtTime(1.0, this.ctx.currentTime);

      this.wakeGain = this.ctx.createGain();
      this.wakeGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

      this.wakeNoiseNode.connect(this.wakeFilter);
      this.wakeFilter.connect(this.wakeGain);
      this.wakeGain.connect(this.masterGain);
      this.wakeNoiseNode.start();
    }

    this.engineRunning = true;
  }

  /**
   * Update engine pitch and wake wash based on boat velocity.
   */
  public updateBoatSound(speedRatio: number, isBoosting: boolean, isDrifting: boolean): void {
    if (!this.ctx || !this.engineRunning || !this.engineOsc1 || !this.engineOsc2 || !this.engineFilter) return;

    const t = this.ctx.currentTime;
    const clampedRatio = Math.max(0, Math.min(1.5, speedRatio));

    // Base pitch modulation: 55Hz idle -> 180Hz full throttle
    const baseFreq = isBoosting ? 220 : 55 + clampedRatio * 110;
    this.engineOsc1.frequency.setTargetAtTime(baseFreq, t, 0.08);
    this.engineOsc2.frequency.setTargetAtTime(baseFreq * 1.5, t, 0.08);

    // Filter opens up as speed increases
    const filterFreq = 300 + clampedRatio * 900 + (isBoosting ? 500 : 0);
    this.engineFilter.frequency.setTargetAtTime(filterFreq, t, 0.1);

    // Wake spray volume
    if (this.wakeGain && this.wakeFilter) {
      const targetGain = Math.min(0.22, clampedRatio * 0.14 + (isDrifting ? 0.08 : 0));
      this.wakeGain.gain.setTargetAtTime(targetGain, t, 0.1);
      const sprayFreq = 800 + clampedRatio * 600;
      this.wakeFilter.frequency.setTargetAtTime(sprayFreq, t, 0.1);
    }
  }

  public playBoostSound(): void {
    if (!this.ctx || !this.masterGain) return;
    this.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(260, t);
    osc.frequency.exponentialRampToValueAtTime(740, t + 0.35);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.5);
  }

  public playCollisionSound(): void {
    if (!this.ctx || !this.masterGain) return;
    this.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.2);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(220, t);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.22);
  }

  public playCheckpointSound(): void {
    if (!this.ctx || !this.masterGain) return;
    this.resume();

    const t = this.ctx.currentTime;
    const notes = [523.25, 659.25]; // C5, E5
    notes.forEach((freq, index) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + index * 0.08);

      gain.gain.setValueAtTime(0.18, t + index * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, t + index * 0.08 + 0.25);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(t + index * 0.08);
      osc.stop(t + index * 0.08 + 0.25);
    });
  }

  public playCountdownBeep(final = false): void {
    if (!this.ctx || !this.masterGain) return;
    this.resume();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(final ? 880 : 440, t);
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + (final ? 0.5 : 0.18));
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + (final ? 0.5 : 0.18));
  }

  public playFinishFanfare(): void {
    if (!this.ctx || !this.masterGain) return;
    this.resume();
    const t = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + i * 0.12);
      gain.gain.setValueAtTime(0.2, t + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.4);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(t + i * 0.12);
      osc.stop(t + i * 0.12 + 0.4);
    });
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain) {
      this.masterGain.gain.value = this.isMuted ? 0 : 0.3;
    }
    return this.isMuted;
  }

  public isSoundMuted(): boolean {
    return this.isMuted;
  }
}
