import Phaser from "phaser";
import { GAME_CONFIG } from "../config/constants.js";
import { leaderboardService } from "../services/leaderboardService.js";

export class LeaderboardScene extends Phaser.Scene {
  constructor() {
    super({ key: "LeaderboardScene" });
  }

  create() {
    const { WIDTH, HEIGHT, CENTER_X, CENTER_Y } = GAME_CONFIG;

    // Background overlay
    const overlay = this.add.rectangle(CENTER_X, CENTER_Y, WIDTH, HEIGHT, 0x000000, 0.8);
    overlay.setDepth(50);

    // Title
    const title = this.add
      .text(CENTER_X, 150, "LEADERBOARD", {
        fontSize: "48px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(51);

    // Close button
    const closeButton = this.add
      .text(WIDTH - 50, 50, "✕", {
        fontSize: "36px",
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setDepth(51)
      .setInteractive({ useHandCursor: true });

    closeButton.on("pointerdown", () => {
      this.scene.stop();
    });

    closeButton.on("pointerover", () => {
      closeButton.setColor("#ff5555");
    });

    closeButton.on("pointerout", () => {
      closeButton.setColor("#ffffff");
    });

    // Loading text
    const loadingText = this.add
      .text(CENTER_X, CENTER_Y, "Loading...", {
        fontSize: "24px",
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setDepth(51);

    // Load leaderboard data
    this.loadLeaderboard(loadingText);
  }

  async loadLeaderboard(loadingText) {
    try {
      const [topLeaderboard, playerRankEntry] = await Promise.all([
        leaderboardService.getTopLeaderboard(10),
        leaderboardService.getCurrentPlayerRankEntry(),
      ]);
      loadingText.setVisible(false);

      if (topLeaderboard.length === 0) {
        this.showEmptyMessage();
        return;
      }

      this.displayLeaderboard(topLeaderboard, playerRankEntry);
    } catch (error) {
      console.error("Failed to load leaderboard:", error);
      loadingText.setText("Failed to load leaderboard");
      loadingText.setColor("#ff5555");
    }
  }

  displayLeaderboard(leaderboard, playerRankEntry) {
    const { CENTER_X, CENTER_Y } = GAME_CONFIG;
    const startY = 250;
    const spacing = 50;

    // Header
    const headerBg = this.add.rectangle(CENTER_X, startY - 30, 600, 40, 0x333333, 0.8);
    headerBg.setDepth(51);

    this.add
      .text(150, startY - 30, "RANK", {
        fontSize: "20px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(52);

    this.add
      .text(CENTER_X, startY - 30, "PLAYER", {
        fontSize: "20px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(52);

    this.add
      .text(570, startY - 30, "SCORE", {
        fontSize: "20px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(52);

    // Leaderboard entries
    leaderboard.forEach((entry, index) => {
      const y = startY + index * spacing;
      const isTopThree = index < 3;
      const isCurrentPlayer =
        playerRankEntry && entry.playerId === playerRankEntry.playerId;
      const bgColor = isCurrentPlayer ? 0x1b3a4b : isTopThree ? 0x444444 : 0x222222;
      const textColor = isCurrentPlayer ? "#4ecdc4" : isTopThree ? "#ffd700" : "#ffffff";

      // Background
      const bg = this.add.rectangle(CENTER_X, y, 600, 45, bgColor, 0.6);
      bg.setDepth(51);

      // Rank
      const rankText = this.add
        .text(150, y, this.getRankDisplay(entry.rank), {
          fontSize: "24px",
          color: textColor,
          fontStyle: "bold",
        })
        .setOrigin(0.5)
        .setDepth(52);

      // Username
      const usernameText = this.add
        .text(CENTER_X, y, entry.username || "Guest", {
          fontSize: "22px",
          color: textColor,
        })
        .setOrigin(0.5)
        .setDepth(52);

      // Score
      const scoreText = this.add
        .text(570, y, entry.score.toLocaleString(), {
          fontSize: "24px",
          color: textColor,
          fontStyle: "bold",
        })
        .setOrigin(0.5)
        .setDepth(52);

      // Medal cho top 3
      if (isTopThree) {
        const medalEmoji = ["🥇", "🥈", "🥉"][index];
        rankText.setText(medalEmoji);
      }
    });

    const infoY = startY + leaderboard.length * spacing + 40;
    if (playerRankEntry) {
      this.add
        .text(
          CENTER_X,
          infoY,
          `Your Rank: #${playerRankEntry.rank} • Score: ${playerRankEntry.score.toLocaleString()}`,
          {
            fontSize: "24px",
            color: "#4ecdc4",
            fontStyle: "bold",
          }
        )
        .setOrigin(0.5)
        .setDepth(52);
    } else {
      this.add
        .text(
          CENTER_X,
          infoY,
          "Play a game to enter the leaderboard!",
          {
            fontSize: "22px",
            color: "#ffffff",
          }
        )
        .setOrigin(0.5)
        .setDepth(52);
    }
  }

  getRankDisplay(rank) {
    if (rank <= 3) return "";
    return `#${rank}`;
  }

  showEmptyMessage() {
    const { CENTER_X, CENTER_Y } = GAME_CONFIG;
    this.add
      .text(CENTER_X, CENTER_Y, "No scores yet!\nBe the first to play!", {
        fontSize: "28px",
        color: "#ffffff",
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(51);
  }
}

