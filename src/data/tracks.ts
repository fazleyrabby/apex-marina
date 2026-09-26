import type { TrackData } from '../types/index.ts';

/**
 * Sunset Bay: a full-world loop (~7km of water) routed around the Phase 2
 * archipelago. Clockwise: south straight → east climb → north straight →
 * west dive → south return. All legs keep 250px+ clearance from islands.
 */
function gate(
  id: number,
  cx: number,
  cy: number,
  angleDeg: number,
  halfWidth: number,
): TrackData['checkpoints'][number] {
  const a = (angleDeg * Math.PI) / 180;
  // Gate segment runs perpendicular to travel direction.
  const px = Math.cos(a + Math.PI / 2);
  const py = Math.sin(a + Math.PI / 2);
  const nx = Math.cos(a);
  const ny = Math.sin(a);
  return { id, x1: cx - px * halfWidth, y1: cy - py * halfWidth, x2: cx + px * halfWidth, y2: cy + py * halfWidth, normalX: nx, normalY: ny };
}

export const SUNSET_BAY: TrackData = {
  id: 'sunset-bay',
  name: 'Sunset Bay',
  difficulty: 'Easy',
  laps: 3,
  worldBounds: { width: 3600, height: 2400 },
  startGrid: [
    { x: 1640, y: 1970, angle: 0 },
    { x: 1640, y: 2030, angle: 0 },
    { x: 1580, y: 1970, angle: 0 },
    { x: 1580, y: 2030, angle: 0 },
    { x: 1520, y: 1970, angle: 0 },
    { x: 1520, y: 2030, angle: 0 },
  ],
  checkpoints: [
    gate(0, 1800, 2000, 0, 130), // start/finish, south straight heading east
    gate(1, 3040, 1480, -90, 130), // east climb heading north
    gate(2, 2720, 620, -170, 130), // north-east turn heading west
    gate(3, 1400, 500, 173, 130), // north straight heading west
    gate(4, 520, 1200, 90, 130), // west dive heading south
    gate(5, 800, 1950, 2, 130), // south return heading east
  ],
  aiWaypoints: [
    { x: 2050, y: 2000 },
    { x: 2700, y: 1900 },
    { x: 3050, y: 1500 },
    { x: 3000, y: 900 },
    { x: 2600, y: 550 },
    { x: 1800, y: 450 },
    { x: 1000, y: 550 },
    { x: 550, y: 900 },
    { x: 500, y: 1500 },
    { x: 800, y: 1950 },
    { x: 1300, y: 1990 },
  ],
  islands: [],
  rocks: [],
  buoys: [],
};

export const RACES: TrackData[] = [SUNSET_BAY];
