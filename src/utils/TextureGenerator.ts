import Phaser from 'phaser';

/**
 * Generates crisp, procedural vector textures in memory at boot.
 * Guarantees zero 404s and immediate 60 FPS gameplay without external asset dependencies.
 */
export class TextureGenerator {
  public static generateAll(scene: Phaser.Scene): void {
    this.createPlayerBoatTexture(scene);
    this.createAIBoatTextures(scene);
    this.createWaterTextures(scene);
    this.createWakeStampTexture(scene);
    this.createBuoyTexture(scene);
    this.createRockTexture(scene);
    this.createIslandTexture(scene);
    this.createIslandVariants(scene);
    this.createVegetationTextures(scene);
    this.createStructureTextures(scene);
    this.createFoamRingTexture(scene);
    this.createRippleTexture(scene);
    this.createMarineTextures(scene);
  }

  private static createPlayerBoatTexture(scene: Phaser.Scene): void {
    const key = 'boat-player';
    if (scene.textures.exists(key)) return;

    const w = 72;
    const h = 32;
    const canvas = scene.textures.createCanvas(key, w, h);
    if (!canvas) return;
    const ctx = canvas.getContext();

    // Direction points to the right (+X is 0 degrees in Phaser rotation)
    ctx.save();
    ctx.translate(w / 2, h / 2);

    // Subtle boat drop shadow
    ctx.shadowColor = 'rgba(2, 6, 23, 0.4)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;

    // Main Hull (sleek wedge speedboat)
    ctx.beginPath();
    ctx.moveTo(30, 0);          // Bow tip
    ctx.quadraticCurveTo(12, -14, -22, -13); // Port side
    ctx.lineTo(-24, 13);         // Transom stern
    ctx.quadraticCurveTo(12, 14, 30, 0);   // Starboard side
    ctx.closePath();

    const hullGrad = ctx.createLinearGradient(0, -14, 0, 14);
    hullGrad.addColorStop(0, '#f43f5e'); // Rose red
    hullGrad.addColorStop(0.5, '#e11d48');
    hullGrad.addColorStop(1, '#9f1239'); // Shadowed lower edge
    ctx.fillStyle = hullGrad;
    ctx.fill();

    ctx.shadowColor = 'transparent'; // Reset shadow for details

    // Hull Outline
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#881337';
    ctx.stroke();

    // White Center Deck Stripe
    ctx.beginPath();
    ctx.moveTo(26, 0);
    ctx.quadraticCurveTo(8, -5, -20, -5);
    ctx.lineTo(-20, 5);
    ctx.quadraticCurveTo(8, 5, 26, 0);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Golden Racing Pinstripe
    ctx.beginPath();
    ctx.moveTo(22, 0);
    ctx.lineTo(-18, 0);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#f59e0b';
    ctx.stroke();

    // Cockpit / Windshield (Tinted glass)
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.quadraticCurveTo(4, -7, -4, -6);
    ctx.lineTo(-4, 6);
    ctx.quadraticCurveTo(4, 7, 14, 0);
    ctx.closePath();
    const glassGrad = ctx.createLinearGradient(0, -7, 0, 7);
    glassGrad.addColorStop(0, '#38bdf8');
    glassGrad.addColorStop(0.6, '#0f172a');
    ctx.fillStyle = glassGrad;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#0284c7';
    ctx.stroke();

    // Twin Outboard Engine Mounts at Transom
    ctx.fillStyle = '#334155';
    ctx.fillRect(-27, -9, 5, 6);
    ctx.fillRect(-27, 3, 5, 6);

    ctx.fillStyle = '#64748b';
    ctx.fillRect(-28, -8, 2, 4);
    ctx.fillRect(-28, 4, 2, 4);

    // Bow Chrome Tip
    ctx.beginPath();
    ctx.arc(28, 0, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#f8fafc';
    ctx.fill();

    ctx.restore();
    canvas.refresh();
  }

  private static createAIBoatTextures(scene: Phaser.Scene): void {
    const aiColors = [
      { id: 'boat-ai-1', primary: '#eab308', dark: '#a16207', name: 'Yellow' },
      { id: 'boat-ai-2', primary: '#0ea5e9', dark: '#0369a1', name: 'Cyan' },
      { id: 'boat-ai-3', primary: '#f97316', dark: '#c2410c', name: 'Orange' },
      { id: 'boat-ai-4', primary: '#10b981', dark: '#047857', name: 'Emerald' },
      { id: 'boat-ai-5', primary: '#8b5cf6', dark: '#5b21b6', name: 'Violet' },
    ];

    for (const boat of aiColors) {
      if (scene.textures.exists(boat.id)) continue;
      const w = 72;
      const h = 32;
      const canvas = scene.textures.createCanvas(boat.id, w, h);
      if (!canvas) continue;
      const ctx = canvas.getContext();

      ctx.save();
      ctx.translate(w / 2, h / 2);

      // Hull
      ctx.beginPath();
      ctx.moveTo(30, 0);
      ctx.quadraticCurveTo(12, -13, -22, -12);
      ctx.lineTo(-24, 12);
      ctx.quadraticCurveTo(12, 13, 30, 0);
      ctx.closePath();

      const hullGrad = ctx.createLinearGradient(0, -13, 0, 13);
      hullGrad.addColorStop(0, boat.primary);
      hullGrad.addColorStop(1, boat.dark);
      ctx.fillStyle = hullGrad;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = boat.dark;
      ctx.stroke();

      // Deck Accent
      ctx.beginPath();
      ctx.moveTo(24, 0);
      ctx.quadraticCurveTo(8, -5, -18, -4);
      ctx.lineTo(-18, 4);
      ctx.quadraticCurveTo(8, 5, 24, 0);
      ctx.closePath();
      ctx.fillStyle = '#f8fafc';
      ctx.fill();

      // Cockpit
      ctx.beginPath();
      ctx.arc(4, 0, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#0f172a';
      ctx.fill();

      // Engine
      ctx.fillStyle = '#334155';
      ctx.fillRect(-26, -6, 4, 12);

      ctx.restore();
      canvas.refresh();
    }
  }

  private static createWaterTextures(scene: Phaser.Scene): void {
    // Lightweight baked water: everything is pre-rendered once at boot into
    // seamless tiles. Per-frame cost is just 2 scrolling TileSprites.
    // RULES (learned the hard way): fills only, no strokes; every element
    // drawn wrap-safe at all 9 neighbour offsets so tiles repeat invisibly.
    const seeded = (seed: number) => () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    const wrapped = (ctx: CanvasRenderingContext2D, size: number, draw: () => void) => {
      for (let ox = -1; ox <= 1; ox++) {
        for (let oy = -1; oy <= 1; oy++) {
          ctx.save();
          ctx.translate(ox * size, oy * size);
          draw();
          ctx.restore();
        }
      }
    };

    // 1. Sunlit turquoise base (512x512, seamless) — matches reference water
    const baseKey = 'tile-water-base';
    if (!scene.textures.exists(baseKey)) {
      const size = 512;
      const canvas = scene.textures.createCanvas(baseKey, size, size);
      if (canvas) {
        const ctx = canvas.getContext();
        const rnd = seeded(20260926);
        // Vivid tropical mid-teal (reference water)
        ctx.fillStyle = '#0a99b4';
        ctx.fillRect(0, 0, size, size);

        // Punchy mottling: bright aqua patches + clean deep-teal patches.
        // Fewer, more saturated — overlapping grey washes caused the murk.
        const blotch = (x: number, y: number, r: number, color: string) => {
          wrapped(ctx, size, () => {
            const g = ctx.createRadialGradient(x, y, 0, x, y, r);
            g.addColorStop(0, color);
            g.addColorStop(1, 'rgba(10, 153, 180, 0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
          });
        };
        for (let i = 0; i < 6; i++) {
          blotch(rnd() * size, rnd() * size, 100 + rnd() * 90, 'rgba(96, 218, 238, 0.22)');
        }
        for (let i = 0; i < 5; i++) {
          blotch(rnd() * size, rnd() * size, 90 + rnd() * 90, 'rgba(3, 110, 145, 0.24)');
        }

        // Wave dashes: short curved slivers drifting with the current.
        // This is what reads as "water" top-down — never long branch lines.
        const dash = (x: number, y: number, ang: number, len: number, w: number, color: string) => {
          wrapped(ctx, size, () => {
            ctx.fillStyle = color;
            const mx = x + Math.cos(ang) * len * 0.5;
            const my = y + Math.sin(ang) * len * 0.5;
            // Slight curve via two overlapping quads
            ctx.beginPath();
            ctx.moveTo(x, y - w);
            ctx.quadraticCurveTo(mx, my - w * 1.6, x + Math.cos(ang) * len, y + Math.sin(ang) * len - w * 0.5);
            ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len + w * 0.5);
            ctx.quadraticCurveTo(mx, my + w * 1.6, x, y + w);
            ctx.closePath();
            ctx.fill();
          });
        };
        // A loose dominant current so dashes feel like flowing water, not noise
        const flowAng = rnd() * Math.PI * 2;
        for (let i = 0; i < 42; i++) {
          const a = flowAng + (rnd() - 0.5) * 1.1;
          dash(
            rnd() * size, rnd() * size, a,
            10 + rnd() * 18, 1.0 + rnd() * 1.2,
            `rgba(225, 245, 250, ${0.10 + rnd() * 0.12})`,
          );
        }

        // Foam patches: soft clusters of dots, dense in the middle
        for (let i = 0; i < 6; i++) {
          const cx = rnd() * size;
          const cy = rnd() * size;
          const r = 14 + rnd() * 22;
          wrapped(ctx, size, () => {
            for (let d = 0; d < 22; d++) {
              const a = rnd() * Math.PI * 2;
              const dist = Math.pow(rnd(), 1.6) * r; // denser toward center
              ctx.fillStyle = `rgba(245, 252, 254, ${0.22 + rnd() * 0.30 * (1 - dist / r)})`;
              ctx.beginPath();
              ctx.arc(cx + Math.cos(a) * dist, cy + Math.sin(a) * dist, 0.8 + rnd() * 1.8, 0, Math.PI * 2);
              ctx.fill();
            }
          });
        }

        // Sun glitter: fewer, brighter, varied (no uniform dust)
        wrapped(ctx, size, () => {
          for (let i = 0; i < 70; i++) {
            const bright = rnd() > 0.55;
            ctx.fillStyle = bright ? `rgba(255,255,255,${0.45 + rnd() * 0.3})` : 'rgba(255,255,255,0.16)';
            ctx.beginPath();
            ctx.arc(rnd() * size, rnd() * size, bright ? 0.8 + rnd() * 1.4 : 0.6 + rnd() * 0.8, 0, Math.PI * 2);
            ctx.fill();
          }
        });
        canvas.refresh();
      }
    }

    // 2. Sparse drifting sparkle layer (512x512, seamless, mostly transparent)
    const causticKey = 'tile-water-caustics';
    if (!scene.textures.exists(causticKey)) {
      const size = 512;
      const canvas = scene.textures.createCanvas(causticKey, size, size);
      if (canvas) {
        const ctx = canvas.getContext();
        const rnd = seeded(987654);
        ctx.clearRect(0, 0, size, size);
        wrapped(ctx, size, () => {
          // Tiny glint dots
          for (let i = 0; i < 70; i++) {
            ctx.fillStyle = `rgba(240, 253, 255, ${0.10 + rnd() * 0.20})`;
            ctx.beginPath();
            ctx.arc(rnd() * size, rnd() * size, 0.7 + rnd() * 1.6, 0, Math.PI * 2);
            ctx.fill();
          }
          // A few soft glow flecks (filled circles, no strokes)
          for (let i = 0; i < 12; i++) {
            const x = rnd() * size;
            const y = rnd() * size;
            const r = 4 + rnd() * 7;
            const g = ctx.createRadialGradient(x, y, 0, x, y, r);
            g.addColorStop(0, 'rgba(255,255,255,0.20)');
            g.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
          }
        });
        canvas.refresh();
      }
    }
  }

  private static createWakeStampTexture(scene: Phaser.Scene): void {
    const key = 'fx-wake-stamp';
    if (scene.textures.exists(key)) return;

    const size = 48;
    const canvas = scene.textures.createCanvas(key, size, size);
    if (!canvas) return;
    const ctx = canvas.getContext();

    // Soft feathered circular foam puff
    const center = size / 2;
    const radGrad = ctx.createRadialGradient(center, center, 0, center, center, center);
    radGrad.addColorStop(0, 'rgba(240, 249, 255, 0.7)');
    radGrad.addColorStop(0.35, 'rgba(224, 242, 254, 0.4)');
    radGrad.addColorStop(0.7, 'rgba(186, 230, 253, 0.15)');
    radGrad.addColorStop(1, 'rgba(186, 230, 253, 0)');

    ctx.fillStyle = radGrad;
    ctx.fillRect(0, 0, size, size);
    canvas.refresh();
  }

  private static createBuoyTexture(scene: Phaser.Scene): void {
    const key = 'obstacle-buoy';
    if (scene.textures.exists(key)) return;

    const size = 32;
    const canvas = scene.textures.createCanvas(key, size, size);
    if (!canvas) return;
    const ctx = canvas.getContext();

    ctx.save();
    ctx.translate(size / 2, size / 2);

    // Drop shadow
    ctx.shadowColor = 'rgba(2, 6, 23, 0.5)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;

    // Outer Buoy Ring (Safety Orange)
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, Math.PI * 2);
    ctx.fillStyle = '#ea580c';
    ctx.fill();

    ctx.shadowColor = 'transparent';

    // White High-Vis Stripes
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-11, -3, 22, 6);

    // Inner Core / Mooring Ring
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#1e293b';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#e2e8f0';
    ctx.fill();

    ctx.restore();
    canvas.refresh();
  }

  private static createRockTexture(scene: Phaser.Scene): void {
    const key = 'obstacle-rock';
    if (scene.textures.exists(key)) return;

    const size = 64;
    const canvas = scene.textures.createCanvas(key, size, size);
    if (!canvas) return;
    const ctx = canvas.getContext();

    ctx.save();
    ctx.translate(size / 2, size / 2);

    // Shadow
    ctx.shadowColor = 'rgba(2, 6, 23, 0.6)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;

    // Irregular Rock Polygon
    ctx.beginPath();
    ctx.moveTo(18, -12);
    ctx.lineTo(24, 4);
    ctx.lineTo(12, 22);
    ctx.lineTo(-14, 20);
    ctx.lineTo(-24, 6);
    ctx.lineTo(-18, -16);
    ctx.lineTo(0, -24);
    ctx.closePath();

    const rockGrad = ctx.createLinearGradient(-15, -20, 15, 20);
    rockGrad.addColorStop(0, '#94a3b8'); // Slate sunlit face
    rockGrad.addColorStop(0.5, '#475569');
    rockGrad.addColorStop(1, '#1e293b'); // Dark shadow face
    ctx.fillStyle = rockGrad;
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#334155';
    ctx.stroke();

    // Crevice lines
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-6, -10);
    ctx.lineTo(4, 2);
    ctx.lineTo(14, 0);
    ctx.stroke();

    ctx.restore();
    canvas.refresh();
  }

  private static createIslandTexture(scene: Phaser.Scene): void {
    const key = 'island-test';
    if (scene.textures.exists(key)) return;

    const size = 256;
    const canvas = scene.textures.createCanvas(key, size, size);
    if (!canvas) return;
    const ctx = canvas.getContext();

    const center = size / 2;

    // 1. Shallow Water Reef Outline
    ctx.beginPath();
    ctx.arc(center, center, 115, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.35)'; // Cyan shallow
    ctx.fill();

    // 2. Sand Beach
    ctx.beginPath();
    ctx.arc(center, center, 95, 0, Math.PI * 2);
    ctx.fillStyle = '#d6b77a'; // Golden sand
    ctx.fill();

    // 3. Lush Grass Canopy
    ctx.beginPath();
    ctx.arc(center, center, 72, 0, Math.PI * 2);
    const grassGrad = ctx.createRadialGradient(center - 15, center - 15, 10, center, center, 75);
    grassGrad.addColorStop(0, '#84cc16'); // Bright lime
    grassGrad.addColorStop(0.7, '#4d7c0f'); // Deep green
    grassGrad.addColorStop(1, '#365314');
    ctx.fillStyle = grassGrad;
    ctx.fill();

    // 4. Stylized Trees / Foliage clusters
    const drawTree = (x: number, y: number, r: number) => {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = '#166534';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x - 2, y - 2, r * 0.7, 0, Math.PI * 2);
      ctx.fillStyle = '#22c55e';
      ctx.fill();
    };

    drawTree(center - 24, center - 18, 16);
    drawTree(center + 20, center - 12, 18);
    drawTree(center - 6, center + 24, 15);
    drawTree(center + 28, center + 18, 14);

    canvas.refresh();
  }

  /** Larger / smaller painterly island variants so the archipelago doesn't repeat. */
  private static createIslandVariants(scene: Phaser.Scene): void {
    const variants: Array<{ key: string; size: number; sand: number; grass: number }> = [
      { key: 'island-small', size: 192, sand: 72, grass: 52 },
      { key: 'island-medium', size: 288, sand: 108, grass: 82 },
      { key: 'island-large', size: 352, sand: 138, grass: 104 },
    ];
    for (const v of variants) {
      if (scene.textures.exists(v.key)) continue;
      const canvas = scene.textures.createCanvas(v.key, v.size, v.size);
      if (!canvas) continue;
      const ctx = canvas.getContext();
      const c = v.size / 2;

      // Shallow reef
      ctx.beginPath();
      ctx.arc(c, c, v.sand + 22, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(56, 189, 248, 0.32)';
      ctx.fill();
      // Outer sand wobble for organic shoreline
      ctx.beginPath();
      for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.35) {
        const wob = 1 + Math.sin(a * 3 + v.size) * 0.05;
        const r = v.sand * wob;
        const px = c + Math.cos(a) * r;
        const py = c + Math.sin(a) * r;
        if (a === 0) ctx.moveTo(px, py);
        else ctx.quadraticCurveTo(c + Math.cos(a - 0.17) * r * 1.04, c + Math.sin(a - 0.17) * r * 1.04, px, py);
      }
      ctx.closePath();
      ctx.fillStyle = '#d6b77a';
      ctx.fill();
      // Sand speckle
      ctx.fillStyle = 'rgba(120, 84, 40, 0.25)';
      for (let i = 0; i < 40; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.random() * v.sand * 0.9;
        ctx.beginPath();
        ctx.arc(c + Math.cos(a) * r, c + Math.sin(a) * r, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
      // Grass canopy
      ctx.beginPath();
      ctx.arc(c, c, v.grass, 0, Math.PI * 2);
      const g = ctx.createRadialGradient(c - 14, c - 14, 8, c, c, v.grass + 6);
      g.addColorStop(0, '#84cc16');
      g.addColorStop(0.65, '#4d7c0f');
      g.addColorStop(1, '#365314');
      ctx.fillStyle = g;
      ctx.fill();
      // Baked foliage clusters
      const blobs = 4 + Math.floor(v.size / 90);
      for (let i = 0; i < blobs; i++) {
        const a = (i / blobs) * Math.PI * 2 + 0.5;
        const rr = v.grass * 0.45 * (0.7 + ((i * 37) % 30) / 60);
        const bx = c + Math.cos(a) * rr;
        const by = c + Math.sin(a) * rr;
        const br = 12 + ((i * 53) % 10);
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, Math.PI * 2);
        ctx.fillStyle = '#166534';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(bx - 2, by - 2, br * 0.65, 0, Math.PI * 2);
        ctx.fillStyle = '#22c55e';
        ctx.fill();
      }
      canvas.refresh();
    }
  }

  /** Individual swayable trees (planted on top of islands). */
  private static createVegetationTextures(scene: Phaser.Scene): void {
    if (!scene.textures.exists('tree-pine')) {
      const c = scene.textures.createCanvas('tree-pine', 40, 56);
      if (c) {
        const ctx = c.getContext();
        ctx.save();
        ctx.translate(20, 28);
        ctx.fillStyle = '#4A3428';
        ctx.fillRect(-2.5, 8, 5, 14); // trunk
        const layers: Array<[number, number, number]> = [[0, -12, 15], [0, -2, 18], [0, 8, 13]];
        for (const [x, y, r] of layers) {
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fillStyle = '#166534';
          ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(-4, -14, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#22c55e';
        ctx.fill();
        ctx.restore();
        c.refresh();
      }
    }
    if (!scene.textures.exists('tree-palm')) {
      const c = scene.textures.createCanvas('tree-palm', 48, 56);
      if (c) {
        const ctx = c.getContext();
        ctx.save();
        ctx.translate(24, 30);
        ctx.strokeStyle = '#8B5E3C';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, 20);
        ctx.quadraticCurveTo(3, 6, 0, -4);
        ctx.stroke();
        ctx.fillStyle = '#16a34a'; // fronds
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          ctx.beginPath();
          ctx.ellipse(Math.cos(a) * 11, -6 + Math.sin(a) * 7, 11, 5, a, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(0, -4, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#78350f'; // coconuts
        ctx.fill();
        ctx.restore();
        c.refresh();
      }
    }
  }

  /** Docks, huts, campfire — small wooden architecture. */
  private static createStructureTextures(scene: Phaser.Scene): void {
    if (!scene.textures.exists('dock-plank')) {
      const c = scene.textures.createCanvas('dock-plank', 64, 32);
      if (c) {
        const ctx = c.getContext();
        ctx.fillStyle = '#8B5E3C';
        ctx.fillRect(0, 0, 64, 32);
        ctx.fillStyle = '#6b4429';
        for (let x = 0; x < 64; x += 16) ctx.fillRect(x, 0, 2, 32);
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(0, 2, 64, 3);
        ctx.fillStyle = '#4A3428';
        ctx.fillRect(4, 26, 6, 6);
        ctx.fillRect(54, 26, 6, 6);
        c.refresh();
      }
    }
    if (!scene.textures.exists('hut')) {
      const c = scene.textures.createCanvas('hut', 72, 64);
      if (c) {
        const ctx = c.getContext();
        ctx.save();
        ctx.translate(36, 32);
        ctx.shadowColor = 'rgba(2,6,23,0.45)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 3;
        ctx.fillStyle = '#a67c52'; // walls
        ctx.fillRect(-20, -6, 40, 24);
        ctx.strokeStyle = '#4A3428';
        ctx.lineWidth = 2;
        ctx.strokeRect(-20, -6, 40, 24);
        ctx.shadowColor = 'transparent';
        ctx.beginPath(); // thatch roof
        ctx.moveTo(-28, -6);
        ctx.lineTo(0, -26);
        ctx.lineTo(28, -6);
        ctx.closePath();
        const rg = ctx.createLinearGradient(0, -26, 0, -6);
        rg.addColorStop(0, '#d6a35c');
        rg.addColorStop(1, '#8B5E3C');
        ctx.fillStyle = rg;
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#1e293b'; // door + window glow
        ctx.fillRect(-6, 4, 12, 14);
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(8, 0, 8, 7);
        ctx.restore();
        c.refresh();
      }
    }
    if (!scene.textures.exists('campfire')) {
      const c = scene.textures.createCanvas('campfire', 32, 32);
      if (c) {
        const ctx = c.getContext();
        ctx.save();
        ctx.translate(16, 16);
        ctx.strokeStyle = '#4A3428';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-7, 7);
        ctx.lineTo(7, 7);
        ctx.moveTo(-5, 8);
        ctx.lineTo(5, 5);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 2, 7, 0, Math.PI * 2);
        ctx.fillStyle = '#f97316';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, 3, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#fbbf24';
        ctx.fill();
        ctx.restore();
        c.refresh();
      }
    }
  }

  private static createFoamRingTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists('foam-ring')) return;
    const size = 288;
    const c = scene.textures.createCanvas('foam-ring', size, size);
    if (!c) return;
    const ctx = c.getContext();
    const ctr = size / 2;
    const grad = ctx.createRadialGradient(ctr, ctr, 96, ctr, ctr, 140);
    grad.addColorStop(0, 'rgba(223,247,255,0)');
    grad.addColorStop(0.55, 'rgba(223,247,255,0.55)');
    grad.addColorStop(0.75, 'rgba(223,247,255,0.28)');
    grad.addColorStop(1, 'rgba(223,247,255,0)');
    ctx.fillStyle = grad;
    // Dashed foam break so it reads as lapping tide, not a solid ring
    for (let a = 0; a < Math.PI * 2; a += 0.22) {
      ctx.beginPath();
      ctx.arc(ctr + Math.cos(a) * 118, ctr + Math.sin(a) * 118, 9, 0, Math.PI * 2);
      ctx.fill();
    }
    c.refresh();
  }

  private static createRippleTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists('fx-ripple')) return;
    const c = scene.textures.createCanvas('fx-ripple', 96, 32);
    if (!c) return;
    // Filled crescent slivers (no strokes) — reads as a small wake ripple
    const ctx = c.getContext();
    for (let i = 0; i < 3; i++) {
      const rx = 40 - i * 11;
      const ry = 11 - i * 3;
      ctx.fillStyle = `rgba(224, 242, 254, ${0.30 - i * 0.08})`;
      ctx.beginPath();
      ctx.ellipse(48, 16, rx, ry, 0, 0.15, Math.PI * 0.95);
      ctx.ellipse(48, 16, Math.max(1, rx - 2.5), Math.max(1, ry - 2.5), 0, Math.PI * 0.95, 0.15, true);
      ctx.closePath();
      ctx.fill();
    }
    c.refresh();
  }

  /** Tiny fish + top-down dolphin silhouettes (fills only, facing +x). */
  private static createMarineTextures(scene: Phaser.Scene): void {
    if (!scene.textures.exists('fish')) {
      const c = scene.textures.createCanvas('fish', 20, 12);
      if (c) {
        const ctx = c.getContext();
        // Tail
        ctx.fillStyle = '#4d8aa5';
        ctx.beginPath();
        ctx.moveTo(6, 6);
        ctx.lineTo(0, 1);
        ctx.lineTo(0, 11);
        ctx.closePath();
        ctx.fill();
        // Body
        ctx.fillStyle = '#9fd0e0';
        ctx.beginPath();
        ctx.ellipse(12, 6, 7, 3.6, 0, 0, Math.PI * 2);
        ctx.fill();
        // Dark back
        ctx.fillStyle = '#3f7d99';
        ctx.beginPath();
        ctx.ellipse(12, 4.6, 6, 2, 0, 0, Math.PI * 2);
        ctx.fill();
        // Eye
        ctx.fillStyle = '#0b2530';
        ctx.beginPath();
        ctx.arc(16.5, 5.4, 0.9, 0, Math.PI * 2);
        ctx.fill();
        c.refresh();
      }
    }
    if (!scene.textures.exists('dolphin')) {
      const c = scene.textures.createCanvas('dolphin', 76, 30);
      if (c) {
        const ctx = c.getContext();
        ctx.translate(38, 15);
        // Tail flukes
        ctx.fillStyle = '#2e5a74';
        ctx.beginPath();
        ctx.moveTo(-26, 0);
        ctx.lineTo(-36, -7);
        ctx.lineTo(-32, 0);
        ctx.lineTo(-36, 7);
        ctx.closePath();
        ctx.fill();
        // Body: pointed snout (+x) tapering to tail stalk (-x)
        const bodyGrad = ctx.createLinearGradient(0, -8, 0, 8);
        bodyGrad.addColorStop(0, '#4d8aa5');
        bodyGrad.addColorStop(0.5, '#6fa9c2');
        bodyGrad.addColorStop(1, '#33566c');
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.moveTo(30, 0); // snout
        ctx.quadraticCurveTo(14, -8, -8, -6);
        ctx.lineTo(-26, -2.5);
        ctx.lineTo(-26, 2.5);
        ctx.lineTo(-8, 6);
        ctx.quadraticCurveTo(14, 8, 30, 0);
        ctx.closePath();
        ctx.fill();
        // Pale belly stripe
        ctx.fillStyle = 'rgba(220, 240, 247, 0.75)';
        ctx.beginPath();
        ctx.ellipse(8, 1.5, 14, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        // Pectoral flippers
        ctx.fillStyle = '#2e5a74';
        ctx.beginPath();
        ctx.moveTo(6, -5);
        ctx.lineTo(-2, -12);
        ctx.lineTo(2, -4);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(6, 5);
        ctx.lineTo(-2, 12);
        ctx.lineTo(2, 4);
        ctx.closePath();
        ctx.fill();
        // Dorsal ridge (thin, darker)
        ctx.fillStyle = '#23485e';
        ctx.beginPath();
        ctx.ellipse(-4, 0, 7, 1.8, 0, 0, Math.PI * 2);
        ctx.fill();
        c.refresh();
      }
    }
  }
}
