import type { BoatConfig } from '../types/index.ts';

export const DEFAULT_PLAYER_BOAT: BoatConfig = {
  id: 'boat-player',
  name: 'Wave Runner X1',
  color: '#e11d48',
  maxSpeed: 420,             // ~420 pixels/sec gives high-speed thrilling feel
  reverseMaxSpeed: 140,      // ~33% of forward speed
  acceleration: 260,         // smooth, punchy acceleration
  brakingDecel: 380,         // water resistance brake
  turnSpeed: 2.8,            // radians/sec
  drag: 0.988,               // light longitudinal drag (coasts on water)
  lateralDrift: 0.91,        // keel resistance (controlled drift on hard turns)
  boostMultiplier: 1.45,     // 45% speed boost
  boostDuration: 1.2,        // 1.2s nitro burn
  boostCooldown: 3.5,        // 3.5s cooldown
};
