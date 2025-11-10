import Phaser from "phaser";
import { createGameConfig } from "./config/gameConfig.js";

// Initialize Game
const config = createGameConfig();
new Phaser.Game(config);
