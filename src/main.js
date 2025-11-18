import Phaser from "phaser";
import { createGameConfig } from "./config/gameConfig.js";
import { leaderboardService } from "./services/leaderboardService.js";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForPlayFabSDK(timeoutMs = 5000) {
  const pollInterval = 50;
  let elapsed = 0;

  while (elapsed < timeoutMs) {
    if (
      typeof globalThis.PlayFabClient !== "undefined" ||
      typeof globalThis.PlayFabClientSDK !== "undefined"
    ) {
      return true;
    }
    await wait(pollInterval);
    elapsed += pollInterval;
  }

  return false;
}

// Initialize PlayFab SDK và Game
async function initGame() {
  const sdkReady = await waitForPlayFabSDK();
  if (!sdkReady) {
    console.warn(
      "PlayFab SDK not available after waiting, continuing with fallback mode."
    );
  }

  // Khởi tạo PlayFab/Leaderboard service
  await leaderboardService.initialize();

  // Khởi tạo Phaser Game
  const config = createGameConfig();
  new Phaser.Game(config);
}

initGame();
