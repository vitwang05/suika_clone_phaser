import Phaser from "phaser";
import {
  GAME_CONFIG,
  PREVIEW_POSITIONS,
  ANIMATION_DURATIONS,
  DROP_COOLDOWN_MS,
  SCORE_VALUES,
  POWER_UP_POSITIONS,
} from "../config/constants.js";
import { fruitTypes } from "../data/fruitTypes.js";
import { spawnFruit } from "../utils/fruitUtils.js";
import {
  handleTopSensorCollision,
  handleFruitCollision,
} from "../utils/collisionUtils.js";
import { createAllPowerUpSlots } from "../utils/powerUpUtils.js";

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
    this.score = 0;
    this.currentDropCombo = 0;

    this.createBoundaries();
    this.createTopSensor();
    this.initializeFruits();
    this.createPreviews();
    this.createPowerUpSlots();
    this.initializeUI();
    this.setupInputHandlers();
    this.setupCollisionHandlers();
  }

  update() {}

  // Setup Functions
  createBoundaries() {
    const { WIDTH, HEIGHT, CENTER_X, CENTER_Y } = GAME_CONFIG;

    // Ground
    this.matter.add.rectangle(CENTER_X, HEIGHT, WIDTH, 50, { isStatic: true });

    // Left wall
    this.matter.add.rectangle(0, CENTER_Y, 50, HEIGHT, { isStatic: true });

    // Right wall
    this.matter.add.rectangle(WIDTH, CENTER_Y, 50, HEIGHT, { isStatic: true });
  }

  createTopSensor() {
    const { WIDTH } = GAME_CONFIG;
    this.topSensor = this.matter.add.rectangle(
      GAME_CONFIG.CENTER_X,
      150,
      WIDTH,
      20,
      {
        isSensor: true,
        isStatic: true,
      }
    );
  }

  initializeFruits() {
    this.currentFruitType = Phaser.Math.RND.pick(fruitTypes);
    this.nextFruitType = Phaser.Math.RND.pick(fruitTypes);
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
      const { min, max } = this.getPreviewClampRange(
        this.currentFruitType.radius
      );
      this.preview.x = Phaser.Math.Clamp(pointer.x, min, max);
    });

    // Spawn fruit on click
    this.input.on("pointerdown", () => {
      if (this.gameOver || this.isDropCooldown) return;

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
        // nextPreview được tạo lại trong updateFruitPreviews, mặc định visible
      });
    });
  }

  updateFruitPreviews() {
    // Switch next to current
    this.currentFruitType = this.nextFruitType;
    this.nextFruitType = Phaser.Math.RND.pick(fruitTypes);

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

  handleGameOver() {
    this.gameOver = true;

    // Display game over text
    this.add
      .text(GAME_CONFIG.CENTER_X, GAME_CONFIG.CENTER_Y, "GAME OVER", {
        fontSize: "48px",
        color: "#ff5555",
      })
      .setOrigin(0.5);

    // Screen shake effect
    this.cameras.main.shake(ANIMATION_DURATIONS.SCREEN_SHAKE_GAMEOVER, 0.01);

    // Pause physics
    this.matter.world.pause();

    // Restart after delay
    this.time.delayedCall(ANIMATION_DURATIONS.RESTART_DELAY, () => {
      this.scene.restart();
    });
  }
}
