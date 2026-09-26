/**
 * Seeded procedural island layout.
 * Same seed => same trees / rocks / docks, per spec §29-30.
 */

export type IslandSize = 'small' | 'medium' | 'large';

export interface IslandSpec {
  id: string;
  x: number;
  y: number;
  size: IslandSize;
  /** collision radius in world px */
  radius: number;
  /** texture key to render */
  texture: string;
  seed: number;
  trees: Array<{ dx: number; dy: number; kind: 'pine' | 'palm' }>;
  hasHut: boolean;
  hasCampfire: boolean;
  hasDock: boolean;
  dockAngle: number; // radians, direction dock extends from island center
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SIZE_META: Record<IslandSize, { radius: number; texture: string; treeCount: [number, number] }> = {
  small: { radius: 78, texture: 'island-small', treeCount: [2, 4] },
  medium: { radius: 108, texture: 'island-medium', treeCount: [4, 7] },
  large: { radius: 138, texture: 'island-large', treeCount: [6, 10] },
};

export function generateIsland(
  id: string,
  x: number,
  y: number,
  size: IslandSize,
  seed: number,
  opts: Partial<Pick<IslandSpec, 'hasHut' | 'hasCampfire' | 'hasDock' | 'dockAngle'>> = {},
): IslandSpec {
  const meta = SIZE_META[size];
  const rand = mulberry32(seed);
  const [minT, maxT] = meta.treeCount;
  const treeCount = minT + Math.floor(rand() * (maxT - minT + 1));
  const trees: IslandSpec['trees'] = [];
  for (let i = 0; i < treeCount; i++) {
    const a = rand() * Math.PI * 2;
    const r = meta.radius * 0.12 + rand() * meta.radius * 0.38;
    trees.push({
      dx: Math.cos(a) * r,
      dy: Math.sin(a) * r,
      kind: rand() > 0.45 ? 'palm' : 'pine',
    });
  }
  return {
    id,
    x,
    y,
    size,
    radius: meta.radius * 0.82, // sandy rim is forgiving; collide on grass core
    texture: meta.texture,
    seed,
    trees,
    hasHut: opts.hasHut ?? (size === 'large' && rand() > 0.4),
    hasCampfire: opts.hasCampfire ?? rand() > 0.55,
    hasDock: opts.hasDock ?? (size !== 'small' ? rand() > 0.4 : false),
    dockAngle: opts.dockAngle ?? rand() * Math.PI * 2,
  };
}
