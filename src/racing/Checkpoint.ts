import type { CheckpointGate } from '../types/index.ts';

function segIntersect(
  p0x: number, p0y: number, p1x: number, p1y: number,
  p2x: number, p2y: number, p3x: number, p3y: number,
): boolean {
  const d = (p1x - p0x) * (p3y - p2y) - (p1y - p0y) * (p3x - p2x);
  if (Math.abs(d) < 1e-9) return false;
  const t = ((p2x - p0x) * (p3y - p2y) - (p2y - p0y) * (p3x - p2x)) / d;
  const u = ((p2x - p0x) * (p1y - p0y) - (p2y - p0y) * (p1x - p0x)) / d;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

/** Segment-crossing + forward-normal validation per spec §18. */
export function crossedGate(
  gate: CheckpointGate,
  prevX: number, prevY: number,
  currX: number, currY: number,
  velX: number, velY: number,
): boolean {
  if (!segIntersect(prevX, prevY, currX, currY, gate.x1, gate.y1, gate.x2, gate.y2)) return false;
  return velX * gate.normalX + velY * gate.normalY > 0;
}

/** Draw floating gate buoys + line for a checkpoint. */
export function renderGate(
  scene: Phaser.Scene,
  gate: CheckpointGate,
  isStart: boolean,
): void {
  const g = scene.add.graphics().setDepth(4);
  g.lineStyle(isStart ? 5 : 3, isStart ? 0xfbbf24 : 0x38bdf8, 0.85);
  g.lineBetween(gate.x1, gate.y1, gate.x2, gate.y2);
  for (const [x, y] of [[gate.x1, gate.y1], [gate.x2, gate.y2]] as Array<[number, number]>) {
    const b = scene.add.image(x, y, 'obstacle-buoy').setDepth(5);
    if (isStart) b.setTint(0xfde68a);
    scene.tweens.add({ targets: b, y: y - 6, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }
}
