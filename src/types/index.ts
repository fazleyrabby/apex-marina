export interface BoatConfig {
  id: string;
  name: string;
  color: string;
  maxSpeed: number;           // pixels/second
  reverseMaxSpeed: number;    // pixels/second
  acceleration: number;       // pixels/second^2
  brakingDecel: number;       // braking deceleration
  turnSpeed: number;          // radians/second
  drag: number;               // longitudinal forward drag (e.g. 0.985)
  lateralDrift: number;       // lateral slip damping (e.g. 0.90)
  boostMultiplier: number;    // speed multiplier during nitro
  boostDuration: number;      // seconds
  boostCooldown: number;      // seconds
}

export interface CheckpointGate {
  id: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  normalX: number;
  normalY: number;
}

export interface TrackData {
  id: string;
  name: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  laps: number;
  worldBounds: { width: number; height: number };
  startGrid: Array<{ x: number; y: number; angle: number }>;
  checkpoints: CheckpointGate[];
  aiWaypoints: Array<{ x: number; y: number; targetSpeedRatio?: number }>;
  islands: Array<{ x: number; y: number; radius: number; shape?: string }>;
  rocks: Array<{ x: number; y: number; radius: number }>;
  buoys: Array<{ x: number; y: number }>;
}

export interface AIProfile {
  name: string;
  hullColor: string;
  maxSpeedRatio: number;
  accelerationRatio: number;
  turnSkill: number;
  aggression: number;
  mistakeChance: number;
  avoidanceWeight: number;
}

export interface DiscoveryLocation {
  id: string;
  name: string;
  x: number;
  y: number;
  radius: number;
  discovered: boolean;
  description: string;
}

export interface SaveData {
  version: number;
  selectedBoatId: string;
  unlockedTrackIds: string[];
  bestLapTimes: Record<string, number>;
  discoveriesFound: string[];
  soundEnabled: boolean;
  musicVolume: number;
  sfxVolume: number;
  worldSeed: number;
}
