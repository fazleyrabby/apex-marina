import Phaser from 'phaser';
import { TextureGenerator } from '../utils/TextureGenerator.ts';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  public preload(): void {
    // Generate all procedural assets into Phaser's TextureManager
    TextureGenerator.generateAll(this);
  }

  public create(): void {
    // Transition to Phase 1 Boat Playground Scene
    this.scene.start('PlaygroundScene');
  }
}
