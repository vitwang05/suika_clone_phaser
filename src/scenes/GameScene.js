import Phaser from "phaser";
import {
  GAME_CONFIG,
  PREVIEW_POSITIONS,
  ANIMATION_DURATIONS,
  DROP_COOLDOWN_MS,
  SCORE_VALUES,
  POWER_UP_POSITIONS,
  POWER_UP_CONFIG,
  POWER_UP_DEFAULT_COUNTS,
} from "../config/constants.js";
import { fruitTypes } from "../data/fruitTypes.js";
import { spawnFruit, fruits } from "../utils/fruitUtils.js";
import {
  handleTopSensorCollision,
  handleFruitCollision,
} from "../utils/collisionUtils.js";
import { createAllPowerUpSlots } from "../utils/powerUpUtils.js";
import { leaderboardService } from "../services/leaderboardService.js";
import { GameStateController, GameState } from "../utils/gameStateController.js";

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: "GameScene" });
  }

  preload() {}

  create() {
    this.gameOver = false;
    this.topSensor = null;
    this.currentFruitType = null;
    this.nextFruitType = null;
    this.canCheckGameOver = true; // cho phép check top sensor
    this.isDropCooldown = false; // ngăn thả liên tục trong thời gian chờ
    this.isUsingPowerUp = false; // đang sử dụng vật phẩm hỗ trợ
    this.isSelectingFruitForUpgrade = false; // đang chọn fruit để upgrade
    this.powerUpInventory = { ...POWER_UP_DEFAULT_COUNTS };
    this.powerUpSlotMap = {};
    this.activePowerUpKey = null;
    this.score = 0;
    this.currentDropCombo = 0;

    // Khởi tạo Game State Controller
    this.stateController = new GameStateController(this);

    this.createBoundaries();
    this.createTopSensor();
    this.initializeFruits();
    this.createPreviews();
    this.createPowerUpSlots();
    this.initializeUI();
    this.createTapToPlayButton();
    this.setupInputHandlers();
    this.setupCollisionHandlers();
    
    // Đăng ký tất cả components với state controller
    this.registerComponentsWithStateController();
    
    // Bắt đầu ở trạng thái MENU
    this.stateController.setState(GameState.MENU);
    console.log(this.stateController.getState());
  }

  update() {}

  // Setup Functions
  createBoundaries() {
    const { WIDTH, HEIGHT, CENTER_X, CENTER_Y } = GAME_CONFIG;

    // Ground
    this.matter.add.rectangle(CENTER_X, HEIGHT - 150, WIDTH, 50, { isStatic: true });

    // Left wall
    this.matter.add.rectangle(0, CENTER_Y, 50, HEIGHT, { isStatic: true });

    // Right wall
    this.matter.add.rectangle(WIDTH, CENTER_Y, 50, HEIGHT, { isStatic: true });
  }

  createTopSensor() {
    const { WIDTH } = GAME_CONFIG;
    const sensorY = 150;
    this.topSensor = this.matter.add.rectangle(
      GAME_CONFIG.CENTER_X,
      sensorY,
      WIDTH,
      20,
      {
        isSensor: true,
        isStatic: true,
      }
    );
    this.topSensorY = sensorY;
  }

  initializeFruits() {
    const randomIndexFirst = Phaser.Math.Between(0, POWER_UP_CONFIG.MAX_UPGRADE_LEVEL);
    this.currentFruitType = fruitTypes[randomIndexFirst];
    const randomIndex = Phaser.Math.Between(0, POWER_UP_CONFIG.MAX_UPGRADE_LEVEL);
    this.nextFruitType = fruitTypes[randomIndex];
  }

  createPreviews() {
    const { CURRENT, NEXT } = PREVIEW_POSITIONS;

    // Current fruit preview
    this.preview = this.add.circle(
      CURRENT.x,
      CURRENT.y,
      this.currentFruitType.radius,
      this.currentFruitType.color
    );
    this.preview.setDepth(10);

    // Next fruit preview
    this.nextPreview = this.add.circle(
      NEXT.x,
      NEXT.y,
      this.nextFruitType.radius,
      this.nextFruitType.color
    );
    this.nextPreview.setAlpha(0.8);
  }

  createPowerUpSlots() {
    const { SLOT_1, SLOT_2, SLOT_3 } = POWER_UP_POSITIONS;
    const positions = [SLOT_1, SLOT_2, SLOT_3];
    
    // Tạo 3 ô vật phẩm hỗ trợ
    this.powerUpSlots = createAllPowerUpSlots(this, positions);
    
    // Đặt depth để đảm bảo hiển thị trên các layer khác
    this.powerUpSlots.forEach((slot) => {
      slot.setDepth(15);
    });
  }
  getPreviewClampRange(radius) {
    return {
      min: PREVIEW_POSITIONS.PREVIEW_MIN_X + radius,
      max: PREVIEW_POSITIONS.PREVIEW_MAX_X - radius,
    };
  }

  setupInputHandlers() {
    // Move preview with mouse/touch
    this.input.on("pointermove", (pointer) => {
      // Chỉ cho phép di chuyển khi đang chơi
      if (!this.stateController.isState(GameState.PLAYING)) return;
      // Không cho phép di chuyển preview khi đang sử dụng vật phẩm
      if (this.isUsingPowerUp) return;
      if (this.isSelectingFruitForUpgrade) return;
      const { min, max } = this.getPreviewClampRange(
        this.currentFruitType.radius
      );
      this.preview.x = Phaser.Math.Clamp(pointer.x, min, max);
    });

    // Spawn fruit on click
    this.input.on("pointerdown", (pointer, currentlyOver) => {
      if (this.isPointerOverBlockingUI(currentlyOver)) return;
      if (!this.stateController.isState(GameState.PLAYING)) return;
      if (this.gameOver || this.isDropCooldown || this.isUsingPowerUp) return;

      // Bắt đầu cooldown sau khi thả
      this.isDropCooldown = true;
      this.canCheckGameOver = false;
      this.currentDropCombo = 0;
      this.addScore(SCORE_VALUES.DROP);

      spawnFruit(this, this.preview.x, this.preview.y, this.currentFruitType);

      // Ẩn preview trong lúc chờ
      this.preview.setVisible(false);
      // Luôn hiển thị quả tiếp theo ở góc (không ẩn nextPreview)

      // Sau cooldown, bật lại check gameover và hiển thị quả tiếp theo
      this.time.delayedCall(DROP_COOLDOWN_MS, () => {
        this.canCheckGameOver = true;
        this.isDropCooldown = false;

        this.updateFruitPreviews();
        this.preview.setVisible(true);
        this.checkTopOverflow();
        // nextPreview được tạo lại trong updateFruitPreviews, mặc định visible
      });
    });
  }

  isPointerOverBlockingUI(currentlyOver) {
    if (!currentlyOver || currentlyOver.length === 0) {
      return false;
    }
    return currentlyOver.some((gameObject) => gameObject?.isUIBlocking);
  }

  updateFruitPreviews() {
    // Switch next to current
    this.currentFruitType = this.nextFruitType;
    const randomIndex = Phaser.Math.Between(0, POWER_UP_CONFIG.MAX_UPGRADE_LEVEL);
    this.nextFruitType = fruitTypes[randomIndex];

    // Update current preview
    this.preview.setRadius(this.currentFruitType.radius);
    this.preview.setFillStyle(this.currentFruitType.color);
    const { min, max } = this.getPreviewClampRange(
      this.currentFruitType.radius
    );
    this.preview.x = Phaser.Math.Clamp(this.preview.x, min, max);

    // Update next preview
    this.nextPreview.destroy();
    const { NEXT } = PREVIEW_POSITIONS;
    this.nextPreview = this.add.circle(
      NEXT.x,
      NEXT.y,
      this.nextFruitType.radius,
      this.nextFruitType.color
    );
    this.nextPreview.setAlpha(0.8);
  }

  setupCollisionHandlers() {
    this.matter.world.on("collisionstart", (event) => {
      event.pairs.forEach((pair) => {
        const fruitA = pair.bodyA.gameObject;
        const fruitB = pair.bodyB.gameObject;

        handleTopSensorCollision(this, pair);
        handleFruitCollision(this, fruitA, fruitB);
      });
    });
  }

  initializeUI() {
    this.scoreText = this.add
      .text(16, 16, "Score: 0", {
        fontSize: "24px",
        color: "#ffffff",
      })
      .setOrigin(0, 0);
    this.scoreText.setDepth(20);

    // Leaderboard button
    this.leaderboardButton = this.add
      .text(GAME_CONFIG.WIDTH - 100, 16, "🏆", {
        fontSize: "32px",
      })
      .setOrigin(0, 0)
      .setDepth(20)
      .setInteractive({ useHandCursor: true });

    this.leaderboardButton.on("pointerdown", () => {
      this.scene.launch("LeaderboardScene");
    });

    this.leaderboardButton.on("pointerover", () => {
      this.leaderboardButton.setScale(1.2);
    });

    this.leaderboardButton.on("pointerout", () => {
      this.leaderboardButton.setScale(1);
    });

    // Dev button: trigger game over manually
    this.gameOverTestButton = this.add
      .text(GAME_CONFIG.WIDTH - 100, 70, "☠", {
        fontSize: "28px",
        color: "#ff8888",
      })
      .setOrigin(0, 0)
      .setDepth(20)
      .setInteractive({ useHandCursor: true });

    this.gameOverTestButton.on("pointerdown", () => {
      if (!this.gameOver && this.stateController.isState(GameState.PLAYING)) {
        this.handleGameOver();
      }
    });

    this.gameOverTestButton.on("pointerover", () => {
      this.gameOverTestButton.setColor("#ffb3b3");
    });

    this.gameOverTestButton.on("pointerout", () => {
      this.gameOverTestButton.setColor("#ff8888");
    });
  }

  /**
   * Tạo nút "Tap to Play" nhấp nháy
   */
  createTapToPlayButton() {
    const { CENTER_X, CENTER_Y } = GAME_CONFIG;
    
    // Tạo text "Tap to Play"
    this.tapToPlayButton = this.add
      .text(CENTER_X, CENTER_Y, "Tap to Play", {
        fontSize: "48px",
        color: "#ffffff",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(30)
      .setInteractive({ useHandCursor: true });

    // Xử lý click vào nút
    this.tapToPlayButton.on("pointerdown", () => {
      if (this.stateController.isState(GameState.MENU)) {
        this.startGame();
      }
    });

    // Hiệu ứng nhấp nháy (blink)
    this.tweens.add({
      targets: this.tapToPlayButton,
      alpha: { from: 1, to: 0.3 },
      duration: 800,
      ease: "Sine.easeInOut",
      yoyo: true,
      repeat: -1,
    });

    // Hiệu ứng scale nhẹ
    this.tweens.add({
      targets: this.tapToPlayButton,
      scale: { from: 1, to: 1.1 },
      duration: 1000,
      ease: "Sine.easeInOut",
      yoyo: true,
      repeat: -1,
    });
  }

  /**
   * Đăng ký tất cả components với state controller
   */
  registerComponentsWithStateController() {
    this.stateController.registerComponents({
      tapToPlayButton: this.tapToPlayButton,
      scoreText: this.scoreText,
      leaderboardButton: this.leaderboardButton,
      gameOverTestButton: this.gameOverTestButton,
      preview: this.preview,
      nextPreview: this.nextPreview,
      powerUpSlots: this.powerUpSlots,
      matterWorld: this.matter.world,
    });
  }

  /**
   * Bắt đầu game
   */
  startGame() {
    this.stateController.setState(GameState.PLAYING);
  }

  updateScoreText() {
    if (this.scoreText) {
      this.scoreText.setText(`Score: ${this.score}`);
    }
  }

  addScore(points) {
    this.score += points;
    this.updateScoreText();
  }

  handleMergeComboScore() {
    this.currentDropCombo += 1;
    const multiplier = this.currentDropCombo;
    const points = SCORE_VALUES.MERGE * multiplier;
    this.addScore(points);
  }

  async handleGameOver() {
    this.gameOver = true;
    
    // Chuyển sang trạng thái GAME_OVER
    this.stateController.setState(GameState.GAME_OVER);

    // Submit score to leaderboard
    if (this.score > 0) {
      await leaderboardService.submitScore(this.score);
    }

    // Display game over text
    this.add
      .text(GAME_CONFIG.CENTER_X, GAME_CONFIG.CENTER_Y, "GAME OVER", {
        fontSize: "48px",
        color: "#ff5555",
      })
      .setOrigin(0.5);

    // Display final score
    this.add
      .text(
        GAME_CONFIG.CENTER_X,
        GAME_CONFIG.CENTER_Y + 60,
        `Final Score: ${this.score.toLocaleString()}`,
        {
          fontSize: "32px",
          color: "#ffffff",
        }
      )
      .setOrigin(0.5);

    // Screen shake effect
    this.cameras.main.shake(ANIMATION_DURATIONS.SCREEN_SHAKE_GAMEOVER, 0.01);

    // Restart after delay
    this.time.delayedCall(ANIMATION_DURATIONS.RESTART_DELAY, () => {
      this.scene.restart();
    });
  }

  checkTopOverflow() {
    if (!this.canCheckGameOver || this.gameOver) return;
    const threshold =
      this.topSensor?.position?.y || this.topSensorY || PREVIEW_POSITIONS.CURRENT.y;

    const hasOverflow = fruits.some(
      (fruit) =>
        fruit?.active &&
        fruit.fruitType &&
        fruit.y - (fruit.fruitType.radius || 0) <= threshold
    );

    if (hasOverflow) {
      this.handleGameOver();
    }
  }
}
