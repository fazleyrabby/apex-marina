import type { AIProfile } from '../types/index.ts';

export interface AIInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  boost: boolean;
}

export interface AINeighbor {
  x: number;
  y: number;
}

const ARRIVAL_R = 110;
const SEPARATION_R = 70;

function normAngle(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

/**
 * Waypoint steering + corner throttling + boid separation + aggression
 * boosts, per spec §16.
 */
export class AIController {
  public waypointIndex = 0;
  private mistakeTimer = 0;
  private mistakeSteer = 0;
  private boostCooldown = 2 + Math.random() * 4;

  constructor(
    public profile: AIProfile,
    private waypoints: Array<{ x: number; y: number }>,
    startIndex = 0,
  ) {
    this.waypointIndex = startIndex % waypoints.length;
  }

  public update(
    dt: number,
    x: number, y: number, heading: number, speed: number, maxSpeed: number,
    neighbors: AINeighbor[],
  ): AIInput {
    this.boostCooldown -= dt;
    if (this.mistakeTimer > 0) this.mistakeTimer -= dt;

    const wp = this.waypoints[this.waypointIndex];
    if (Math.hypot(wp.x - x, wp.y - y) < ARRIVAL_R) {
      this.waypointIndex = (this.waypointIndex + 1) % this.waypoints.length;
    }
    const target = this.waypoints[this.waypointIndex];
    const desired = Math.atan2(target.y - y, target.x - x);
    let dTheta = normAngle(desired - heading);

    // Occasional rookie mistake: hold a wrong line briefly
    if (this.mistakeTimer <= 0 && Math.random() < this.profile.mistakeChance * dt) {
      this.mistakeTimer = 0.7;
      this.mistakeSteer = Math.random() > 0.5 ? 0.6 : -0.6;
    }
    if (this.mistakeTimer > 0) dTheta += this.mistakeSteer;

    // Boid separation: lateral push away from clumped neighbors
    let separation = 0;
    for (const n of neighbors) {
      const dx = x - n.x;
      const dy = y - n.y;
      const d = Math.hypot(dx, dy);
      if (d > 0 && d < SEPARATION_R) {
        const side = Math.sign(normAngle(Math.atan2(dy, dx) - heading)) || 1;
        separation += side * this.profile.avoidanceWeight * (1 - d / SEPARATION_R);
      }
    }

    const steer = dTheta * 2.2 * this.profile.turnSkill + separation * 0.8;
    const absTurn = Math.abs(dTheta);

    // Corner throttling: brake on hairpins, full throttle on straights
    const throttle = absTurn > Math.PI / 3;
    const fullSend = absTurn < Math.PI / 9;

    // Boost on straights, scaled by aggression
    let boost = false;
    if (fullSend && speed > maxSpeed * 0.55 && this.boostCooldown <= 0) {
      if (Math.random() < this.profile.aggression * dt * 0.55) {
        boost = true;
        this.boostCooldown = 4 + Math.random() * 5 * (1.2 - this.profile.aggression);
      }
    }

    return {
      up: !throttle || fullSend,
      down: absTurn > Math.PI / 2.2,
      left: steer < -0.12,
      right: steer > 0.12,
      boost,
    };
  }
}
