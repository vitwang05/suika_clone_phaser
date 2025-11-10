import Phaser from "phaser";
import { GAME_CONFIG } from "./constants.js";
import { GameScene } from "../scenes/GameScene.js";

export const createGameConfig = () => ({
  type: Phaser.AUTO,
  width: GAME_CONFIG.WIDTH,
  height: GAME_CONFIG.HEIGHT,
  backgroundColor: GAME_CONFIG.BACKGROUND_COLOR,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    parent: "game-container",
    width: GAME_CONFIG.WIDTH,
    height: GAME_CONFIG.HEIGHT,
  },
  physics: {
    default: "matter",
    matter: {
      gravity: GAME_CONFIG.GRAVITY,
      debug: true,
    },
  },
  scene: GameScene,
});

