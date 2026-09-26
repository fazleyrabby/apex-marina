import Phaser from 'phaser';

export class WaterSystem {
  private baseTile: Phaser.GameObjects.TileSprite;
  private causticsTile: Phaser.GameObjects.TileSprite;
  private wakeRenderTexture: Phaser.GameObjects.RenderTexture;
  private wakeClearGraphics: Phaser.GameObjects.Graphics;
  private stamp: Phaser.GameObjects.Image;
  private worldBounds: { width: number; height: number };

  constructor(scene: Phaser.Scene, worldBounds: { width: number; height: number }) {
    this.worldBounds = worldBounds;

    // 1. Deep Ocean Base Tile
    this.baseTile = scene.add.tileSprite(
      worldBounds.width / 2,
      worldBounds.height / 2,
      worldBounds.width,
      worldBounds.height,
      'tile-water-base'
    );
    this.baseTile.setDepth(-10);

    // 2. Translucent Caustic Wave Layer
    this.causticsTile = scene.add.tileSprite(
      worldBounds.width / 2,
      worldBounds.height / 2,
      worldBounds.width,
      worldBounds.height,
      'tile-water-caustics'
    );
    this.causticsTile.setDepth(-8);
    this.causticsTile.setAlpha(0.75);

    // 3. Persistent Dynamic Wake Buffer (RenderTexture)
    // Origin (0,0) pinned at world (0,0) so texture pixels map 1:1 to world
    // pixels. Starts fully transparent — it must NEVER be painted with a
    // normal-blend black rect (that accumulates into an opaque black box).
    this.wakeRenderTexture = scene.add.renderTexture(0, 0, worldBounds.width, worldBounds.height);
    this.wakeRenderTexture.setOrigin(0, 0);
    this.wakeRenderTexture.setDepth(-5);
    this.wakeRenderTexture.fill(0x000000, 0);

    // Helper graphics for progressive wake dissipation (used with erase only)
    this.wakeClearGraphics = scene.make.graphics({ x: 0, y: 0 });

    // Reusable wake stamp. Created off the display list (never rendered to
    // the stage) and only ever drawn explicitly into the wake buffer.
    this.stamp = scene.make.image({ key: 'fx-wake-stamp' }, false);
  }

  public update(time: number, delta: number): void {
    // Gentle directional current + sine wobble per layer (delta-based so the
    // swell speed is identical on 30Hz mobile and 120Hz desktop).
    const dt = Math.min(0.05, delta / 1000);
    const t = time / 1000;
    // Base layer rides the same current as the swell dashes (angle ~0.6rad)
    this.baseTile.tilePositionX -= (10 + Math.cos(t * 0.5) * 4) * dt;
    this.baseTile.tilePositionY -= (6 + Math.sin(t * 0.4) * 3) * dt;
    // Sparkle layer drifts across it for parallax shimmer
    this.causticsTile.tilePositionX += (14 + Math.cos(t * 0.6 + 0.8) * 5) * dt;
    this.causticsTile.tilePositionY -= (4 + Math.sin(t * 0.5 + 0.4) * 3) * dt;

    // Continuous GPU wake dissipation:
    // We gently fade the render texture by drawing a semi-transparent black rectangle with Erase or multiply
    // Or in WebGL, we draw with blend mode or alpha clear
    this.fadeWakeDecay();
  }

  private fadeWakeDecay(): void {
    // Fade the wake buffer with destination-out erase: this removes alpha
    // progressively without ever adding colour, so old trails dissolve and
    // the buffer stays transparent everywhere else.
    this.wakeClearGraphics.clear();
    this.wakeClearGraphics.fillStyle(0xffffff, 0.03);
    this.wakeClearGraphics.fillRect(0, 0, this.worldBounds.width, this.worldBounds.height);
    this.wakeRenderTexture.erase(this.wakeClearGraphics);
  }

  /**
   * Stamp dynamic foam and wake at the given world coordinates.
   */
  public stampWake(x: number, y: number, angle: number, scale: number, alpha: number): void {
    this.stamp.setPosition(x, y);
    this.stamp.setScale(scale);
    this.stamp.setRotation(angle);
    this.stamp.setAlpha(alpha);
    // Drawn at its own position — texture space == world space (origin 0,0).
    this.wakeRenderTexture.draw(this.stamp);
  }

  public destroy(): void {
    this.baseTile.destroy();
    this.causticsTile.destroy();
    this.wakeRenderTexture.destroy();
    this.wakeClearGraphics.destroy();
    this.stamp.destroy();
  }
}
