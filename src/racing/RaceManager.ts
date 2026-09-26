import type { TrackData } from '../types/index.ts';
import { crossedGate } from './Checkpoint.ts';

export interface RacerState {
  id: string;
  name: string;
  isPlayer: boolean;
  checkpointIndex: number; // next expected gate 0..N-1
  completedGates: number;
  lap: number; // 1-based
  progression: number;
  distToNext: number;
  isFinished: boolean;
  finishTimeMs: number;
  bestLapMs: number;
  lastLapStartMs: number;
  finishedGatesTotal: number;
}

export interface RacerBody {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  velocityX: number;
  velocityY: number;
}

/**
 * Checkpoint / lap / position bookkeeping per spec §18-19.
 * progression = lap*10000 + checkpointIndex*100 + fractionToNext
 */
export class RaceManager {
  public racers: RacerState[] = [];
  public totalLaps: number;
  public totalGates: number;
  public raceTimeMs = 0;
  public playerFinished = false;

  constructor(private track: TrackData) {
    this.totalLaps = track.laps;
    this.totalGates = track.checkpoints.length;
  }

  public addRacer(id: string, name: string, isPlayer: boolean): RacerState {
    const r: RacerState = {
      id, name, isPlayer,
      checkpointIndex: 0,
      completedGates: 0,
      lap: 1,
      progression: 0,
      distToNext: Number.MAX_VALUE,
      isFinished: false,
      finishTimeMs: 0,
      bestLapMs: 0,
      lastLapStartMs: 0,
      finishedGatesTotal: 0,
    };
    this.racers.push(r);
    return r;
  }

  public update(deltaMs: number, bodies: Map<string, RacerBody>): void {
    this.raceTimeMs += deltaMs;
    const gates = this.track.checkpoints;

    for (const r of this.racers) {
      if (r.isFinished) continue;
      const b = bodies.get(r.id);
      if (!b) continue;
      const gate = gates[r.checkpointIndex];
      if (crossedGate(gate, b.prevX, b.prevY, b.x, b.y, b.velocityX, b.velocityY)) {
        r.completedGates++;
        r.finishedGatesTotal++;
        r.checkpointIndex = (r.checkpointIndex + 1) % this.totalGates;
        // Wrapped past start/finish => new lap
        if (r.checkpointIndex === 0) {
          const lapTime = this.raceTimeMs - r.lastLapStartMs;
          if (r.bestLapMs === 0 || lapTime < r.bestLapMs) r.bestLapMs = lapTime;
          r.lastLapStartMs = this.raceTimeMs;
          r.lap++;
        }
        const need = this.totalLaps * this.totalGates;
        if (r.finishedGatesTotal >= need) {
          r.isFinished = true;
          r.finishTimeMs = this.raceTimeMs;
          r.lap = this.totalLaps;
          if (r.isPlayer) this.playerFinished = true;
        }
      }
      // Progression for live ranking
      const next = gates[r.checkpointIndex];
      const ncx = (next.x1 + next.x2) / 2;
      const ncy = (next.y1 + next.y2) / 2;
      const dist = Math.hypot(b.x - ncx, b.y - ncy);
      r.distToNext = dist;
      // Segment length: distance from previous gate center to next gate center
      const prev = gates[(r.checkpointIndex + this.totalGates - 1) % this.totalGates];
      const pcx = (prev.x1 + prev.x2) / 2;
      const pcy = (prev.y1 + prev.y2) / 2;
      const segLen = Math.max(1, Math.hypot(ncx - pcx, ncy - pcy));
      const frac = 1 - Math.min(1, Math.max(0, dist / segLen));
      const lapBase = Math.min(r.lap, this.totalLaps);
      r.progression = lapBase * 10000 + r.finishedGatesTotal * 100 + frac;
    }
  }

  /** Descending progression; finished racers lock by finish time first. */
  public rankings(): RacerState[] {
    return [...this.racers].sort((a, b) => {
      if (a.isFinished && b.isFinished) return a.finishTimeMs - b.finishTimeMs;
      if (a.isFinished) return -1;
      if (b.isFinished) return 1;
      return b.progression - a.progression;
    });
  }

  public playerRank(): { rank: number; total: number; state: RacerState | undefined } {
    const ordered = this.rankings();
    const idx = ordered.findIndex((r) => r.isPlayer);
    return { rank: idx + 1, total: ordered.length, state: ordered[idx] };
  }

  public get totalNeededGates(): number {
    return this.totalLaps * this.totalGates;
  }
}
