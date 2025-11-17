import { powerUpTypes } from "../data/powerUpTypes.js";
import { fruitTypes } from "../data/fruitTypes.js";
import { POWER_UP_CONFIG, GAME_CONFIG, POWER_UP_POSITIONS } from "../config/constants.js";
import { deleteFruitsInRadius, upgradeFruitLevel, fruits } from "./fruitUtils.js";

/**
 * Tạo một ô vật phẩm hỗ trợ
 * @param {Phaser.Scene} scene - Scene hiện tại
 * @param {number} x - Vị trí x
 * @param {number} y - Vị trí y
 * @param {Object} powerUpType - Loại vật phẩm hỗ trợ
 * @returns {Phaser.GameObjects.Container} Container chứa slot và item
 */
export function createPowerUpSlot(scene, x, y, powerUpType) {
  const slotRadius = 50; // Bán kính của ô slot
  const itemRadius = powerUpType.radius; // Bán kính của vật phẩm bên trong

  // Tạo container để nhóm slot và item
  const container = scene.add.container(x, y);

  // Tạo ô slot (viền tròn)
  const slotCircle = scene.add.circle(0, 0, slotRadius, 0x333333, 0.3);
  slotCircle.setStrokeStyle(3, 0x666666);

  // Tạo vật phẩm bên trong (hình tròn với màu)
  const powerUpItem = scene.add.circle(0, 0, itemRadius, powerUpType.color);
  powerUpItem.setInteractive({ useHandCursor: true });
  powerUpItem.isUIBlocking = true;

  // Thêm vào container
  container.add([slotCircle, powerUpItem]);

  // Lưu thông tin vào container
  container.powerUpType = powerUpType;
  container.powerUpItem = powerUpItem;
  container.slotCircle = slotCircle;

  // Badge hiển thị số lượng
  const badgeBg = scene.add.circle(slotRadius - 18, -slotRadius + 18, 18, 0x000000, 0.65);
  badgeBg.setStrokeStyle(2, 0xffffff, 0.9);
  badgeBg.setInteractive({ useHandCursor: true });
  badgeBg.isUIBlocking = true;
  badgeBg.on("pointerdown", (pointer) => {
    stopPointerPropagation(pointer);
    powerUpItem.emit("pointerdown", pointer);
  });
  const countText = scene.add
    .text(slotRadius - 18, -slotRadius + 18, "0", {
      fontSize: "18px",
      fontStyle: "bold",
      color: "#ffffff",
    })
    .setOrigin(0.5);
  countText.setInteractive({ useHandCursor: true });
  countText.isUIBlocking = true;
  countText.on("pointerdown", (pointer) => {
    stopPointerPropagation(pointer);
    powerUpItem.emit("pointerdown", pointer);
  });

  container.add([badgeBg, countText]);
  container.countBadge = badgeBg;
  container.countText = countText;

  // Thêm sự kiện tùy theo loại vật phẩm
  if (powerUpType.key === "powerup1") {
    // Vật phẩm thứ nhất: drag & drop để tạo vòng tròn xóa
    setupPowerUp1DragAndDrop(scene, container, powerUpItem, powerUpType);
  } else if (powerUpType.key === "powerup2") {
    // Vật phẩm thứ hai: click để chọn fruit để upgrade
    powerUpItem.on("pointerdown", (pointer) => {
      stopPointerPropagation(pointer);
      if (!canUsePowerUp(scene, powerUpType.key)) {
        handleUnavailablePowerUp(scene, powerUpType);
        return;
      }
      setupPowerUp2FruitSelection(scene, powerUpType);
    });
  } else {
    // Các vật phẩm khác: click
    powerUpItem.on("pointerdown", (pointer) => {
      stopPointerPropagation(pointer);
      if (!canUsePowerUp(scene, powerUpType.key)) {
        handleUnavailablePowerUp(scene, powerUpType);
        return;
      }
      handlePowerUpClick(scene, powerUpType);
    });
  }

  // Hiệu ứng hover
  powerUpItem.on("pointerover", () => {
    scene.tweens.add({
      targets: powerUpItem,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 150,
      ease: "Power2",
    });
  });

  powerUpItem.on("pointerout", () => {
    scene.tweens.add({
      targets: powerUpItem,
      scaleX: 1,
      scaleY: 1,
      duration: 150,
      ease: "Power2",
    });
  });

  updatePowerUpSlotUI(scene, container);

  return container;
}

/**
 * Setup drag & drop cho vật phẩm thứ nhất (tạo vòng tròn xóa)
 * @param {Phaser.Scene} scene - Scene hiện tại
 * @param {Phaser.GameObjects.Container} container - Container của power-up slot
 * @param {Phaser.GameObjects.Circle} powerUpItem - Item bên trong slot
 * @param {Object} powerUpType - Loại vật phẩm
 */
function setupPowerUp1DragAndDrop(scene, container, powerUpItem, powerUpType) {
  let isDragging = false;
  let previewCircle = null;

  // Di chuyển khi kéo - sử dụng local event handler
  const pointerMoveHandler = (pointer) => {
    if (!isDragging || !previewCircle) return;
    
    const worldX = pointer.worldX;
    const worldY = pointer.worldY;
    
    // Giới hạn trong vùng game
    const clampedX = Phaser.Math.Clamp(worldX, 50, GAME_CONFIG.WIDTH - 50);
    const clampedY = Phaser.Math.Clamp(worldY, 50, GAME_CONFIG.HEIGHT - 50);
    
    previewCircle.setPosition(clampedX, clampedY);
  };

  // Thả để kích hoạt - sử dụng local event handler
  const pointerUpHandler = (pointer) => {
    if (!isDragging || !previewCircle) return;
    
    const worldX = previewCircle.x;
    const worldY = previewCircle.y;
    
    // Xóa preview
    previewCircle.destroy();
    previewCircle = null;
    
    // Khôi phục alpha của vật phẩm
    powerUpItem.setAlpha(1);
    
    // Kiểm tra nếu thả trong vùng game hợp lệ (không phải trong vùng slot)
    if (worldY < POWER_UP_POSITIONS.SLOT_Y - 100) {
      // Kích hoạt xóa fruits
      activateDeleteCircle(scene, worldX, worldY, powerUpType);
    }
    
    // Xóa event handlers
    scene.input.off("pointermove", pointerMoveHandler);
    scene.input.off("pointerup", pointerUpHandler);
    
    // Cho phép thả fruit trở lại
    scene.isUsingPowerUp = false;
    
    isDragging = false;
  };

  // Thêm event handlers khi bắt đầu kéo
  powerUpItem.on("pointerdown", (pointer) => {
    stopPointerPropagation(pointer);
    if (scene.gameOver) return;
    if (!canUsePowerUp(scene, powerUpType.key)) {
      handleUnavailablePowerUp(scene, powerUpType);
      return;
    }

    isDragging = true;
    
    // Đánh dấu đang sử dụng vật phẩm để không cho phép thả fruit
    scene.isUsingPowerUp = true;
    
    
    // Tạo preview vòng tròn tại vị trí con trỏ
    const worldX = pointer.worldX;
    const worldY = pointer.worldY;
    
    previewCircle = scene.add.circle(
      worldX,
      worldY,
      POWER_UP_CONFIG.DELETE_RADIUS,
      0xff6b9d,
      0.3
    );
    previewCircle.setStrokeStyle(3, 0xff6b9d);
    previewCircle.setDepth(12);
    
    // Làm mờ vật phẩm gốc
    powerUpItem.setAlpha(0.5);
    
    // Thêm event handlers cho drag
    scene.input.on("pointermove", pointerMoveHandler);
    scene.input.on("pointerup", pointerUpHandler);
  });
}

/**
 * Kích hoạt vòng tròn xóa tại vị trí được thả
 * @param {Phaser.Scene} scene - Scene hiện tại
 * @param {number} x - Tọa độ X
 * @param {number} y - Tọa độ Y
 * @param {Object} powerUpType - Loại vật phẩm
 */
function activateDeleteCircle(scene, x, y, powerUpType) {
  const radius = POWER_UP_CONFIG.DELETE_RADIUS;
  
  // Tạo hiệu ứng vòng tròn xóa
  const deleteCircle = scene.add.circle(x, y, radius, 0xff6b9d, 0.5);
  deleteCircle.setStrokeStyle(4, 0xff6b9d);
  deleteCircle.setDepth(13);
  
  // Animation mở rộng và fade
  scene.tweens.add({
    targets: deleteCircle,
    scaleX: 1.5,
    scaleY: 1.5,
    alpha: { from: 0.5, to: 0 },
    duration: 300,
    ease: "Power2",
    onComplete: () => {
      deleteCircle.destroy();
    },
  });
  
  // Xóa fruits trong vùng bán kính
  const deletedCount = deleteFruitsInRadius(scene, x, y, radius);
  
  // Hiệu ứng screen shake
  if (deletedCount > 0) {
    scene.cameras.main.shake(150, 0.01);
  }
  
  consumePowerUp(scene, powerUpType.key);
  console.log(`Deleted ${deletedCount} fruits at (${x}, ${y})`);
}

/**
 * Setup chế độ chọn fruit để upgrade cho vật phẩm thứ 2
 * @param {Phaser.Scene} scene - Scene hiện tại
 * @param {Object} powerUpType - Loại vật phẩm
 */
function setupPowerUp2FruitSelection(scene, powerUpType) {
  if (scene.gameOver || scene.isUsingPowerUp) return;
  if (!canUsePowerUp(scene, powerUpType.key)) {
    handleUnavailablePowerUp(scene, powerUpType);
    return;
  }
  
  // Đánh dấu đang sử dụng vật phẩm
  scene.isUsingPowerUp = true;
  scene.isSelectingFruitForUpgrade = true;
  scene.activePowerUpKey = powerUpType.key;
  
  // Hiệu ứng khi bắt đầu chọn
  scene.cameras.main.shake(100, 0.005);
  
  // Làm cho tất cả fruits có thể click được và thêm visual feedback
  const selectableFruits = [];
  
  fruits.forEach((fruit) => {
    if (!fruit.active || !fruit.body || !fruit.fruitType) return;
    
    // Chỉ cho phép chọn fruit có level <= MAX_UPGRADE_LEVEL
    if (fruit.level <= POWER_UP_CONFIG.MAX_UPGRADE_LEVEL) {
      // Kiểm tra nếu chưa phải level cao nhất
      if (fruit.level < fruitTypes.length - 1) {
        // Thêm visual highlight
        const highlight = scene.add.circle(
          fruit.x,
          fruit.y,
          fruit.fruitType.radius + 5,
          0x4ecdc4,
          0.3
        );
        highlight.setStrokeStyle(3, 0x4ecdc4);
        highlight.setDepth(fruit.depth + 1);
        
        // Lưu highlight vào fruit để có thể xóa sau
        fruit.upgradeHighlight = highlight;
        
        // Thêm vào danh sách có thể chọn
        selectableFruits.push(fruit);
        
        // Thêm click handler
        fruit.setInteractive({ useHandCursor: true });
        fruit.once("pointerdown", () => {
          handleFruitUpgradeSelection(scene, fruit);
        });
      }
    }
  });
  
  // Nếu không có fruit nào có thể chọn, hủy chế độ chọn
  if (selectableFruits.length === 0) {
    cancelPowerUp2Selection(scene, { logMessage: "Không có fruit nào có thể upgrade" });
    return;
  }
  
  // Lưu danh sách fruits có thể chọn để có thể cleanup sau
  scene.selectableFruitsForUpgrade = selectableFruits;
  
  // Hiển thị nút hủy bỏ
  showPowerUpCancelButton(scene, () => {
    cancelPowerUp2Selection(scene, { logMessage: "Đã hủy chọn fruit để upgrade" });
  });

  console.log(`Chọn một fruit để upgrade (${selectableFruits.length} fruits có thể chọn)`);
}

/**
 * Xử lý khi người chơi chọn fruit để upgrade
 * @param {Phaser.Scene} scene - Scene hiện tại
 * @param {Phaser.GameObjects.Circle} fruit - Fruit được chọn
 */
function handleFruitUpgradeSelection(scene, fruit) {
  if (!scene.isSelectingFruitForUpgrade) return;
  
  cleanupSelectableFruitsForUpgrade(scene);
  hidePowerUpCancelButton(scene);
  
  // Upgrade fruit
  const success = upgradeFruitLevel(scene, fruit);
  
  if (success) {
    console.log(`Fruit upgraded to level ${fruit.level + 1}`);
    consumePowerUp(scene, "powerup2");
  }
  
  // Kết thúc chế độ chọn
  scene.isUsingPowerUp = false;
  scene.isSelectingFruitForUpgrade = false;
  scene.activePowerUpKey = null;
}

/**
 * Hủy chế độ chọn fruit cho power-up 2
 * @param {Phaser.Scene} scene - Scene hiện tại
 * @param {{ logMessage?: string }} options - Tùy chọn
 */
function cancelPowerUp2Selection(scene, options = {}) {
  if (!scene.isSelectingFruitForUpgrade) return;

  cleanupSelectableFruitsForUpgrade(scene);
  hidePowerUpCancelButton(scene);

  scene.isUsingPowerUp = false;
  scene.isSelectingFruitForUpgrade = false;
  scene.activePowerUpKey = null;

  if (options.logMessage) {
    console.log(options.logMessage);
  }
}

/**
 * Dọn dẹp highlight và interactivity cho các fruits được phép chọn
 * @param {Phaser.Scene} scene - Scene hiện tại
 */
function cleanupSelectableFruitsForUpgrade(scene) {
  if (!scene.selectableFruitsForUpgrade) return;

  scene.selectableFruitsForUpgrade.forEach((fruit) => {
    if (fruit.upgradeHighlight) {
      fruit.upgradeHighlight.destroy();
      fruit.upgradeHighlight = null;
    }
    if (fruit.input) {
      fruit.disableInteractive();
    }
  });

  scene.selectableFruitsForUpgrade = null;
}

/**
 * Hiển thị nút hủy lựa chọn power-up
 * @param {Phaser.Scene} scene - Scene hiện tại
 * @param {Function} onCancel - Callback khi nhấn nút
 */
function showPowerUpCancelButton(scene, onCancel) {
  if (!scene.powerUpCancelButton) {
    const button = scene.add
      .text(GAME_CONFIG.WIDTH - 110, 80, "Cancel", {
        fontSize: "24px",
        color: "#ffffff",
        backgroundColor: "#ff6b9d",
        padding: { left: 16, right: 16, top: 8, bottom: 8 },
      })
      .setOrigin(0.5)
      .setDepth(40)
      .setInteractive({ useHandCursor: true });
    button.isUIBlocking = true;

    button.on("pointerover", () => {
      button.setStyle({ backgroundColor: "#ff88b5" });
    });

    button.on("pointerout", () => {
      button.setStyle({ backgroundColor: "#ff6b9d" });
    });

    scene.powerUpCancelButton = button;
  }

  const button = scene.powerUpCancelButton;
  button.setVisible(true);
  button.removeAllListeners("pointerdown");
  button.on("pointerdown", (pointer, localX, localY, event) => {
    if (event) {
      event.stopPropagation();
    }
    onCancel();
  });
}

/**
 * Ẩn nút hủy lựa chọn power-up
 * @param {Phaser.Scene} scene - Scene hiện tại
 */
function hidePowerUpCancelButton(scene) {
  if (scene.powerUpCancelButton) {
    scene.powerUpCancelButton.setVisible(false);
    scene.powerUpCancelButton.removeAllListeners("pointerdown");
  }
}

/**
 * Xử lý khi click vào vật phẩm hỗ trợ (cho các vật phẩm khác)
 * @param {Phaser.Scene} scene - Scene hiện tại
 * @param {Object} powerUpType - Loại vật phẩm được click
 */
function handlePowerUpClick(scene, powerUpType) {
  if (!canUsePowerUp(scene, powerUpType.key)) {
    handleUnavailablePowerUp(scene, powerUpType);
    return;
  }

  console.log(`Power-up clicked: ${powerUpType.name}`);
  
  // TODO: Thêm logic sử dụng vật phẩm hỗ trợ ở đây
  // Ví dụ: có thể gọi scene.usePowerUp(powerUpType) nếu có method này
  
  // Hiệu ứng khi click
  scene.cameras.main.shake(100, 0.005);
  
  // Có thể thêm animation hoặc logic khác tùy theo từng loại vật phẩm
  switch (powerUpType.key) {
    case "powerup3":
      // Logic cho power-up 3
      break;
  }
}

/**
 * Tạo tất cả các ô vật phẩm hỗ trợ
 * @param {Phaser.Scene} scene - Scene hiện tại
 * @param {Array} positions - Mảng các vị trí {x, y} cho từng slot
 * @returns {Array} Mảng các container của power-up slots
 */
export function createAllPowerUpSlots(scene, positions) {
  const slots = [];
  
  powerUpTypes.forEach((powerUpType, index) => {
    if (positions[index]) {
      const slot = createPowerUpSlot(
        scene,
        positions[index].x,
        positions[index].y,
        powerUpType
      );
      slots.push(slot);

      if (!scene.powerUpSlotMap) {
        scene.powerUpSlotMap = {};
      }
      scene.powerUpSlotMap[powerUpType.key] = slot;
      updatePowerUpSlotUI(scene, slot);
    }
  });
  
  return slots;
}

function getPowerUpCount(scene, key) {
  if (!scene.powerUpInventory) return 0;
  return Math.max(0, scene.powerUpInventory[key] ?? 0);
}

function canUsePowerUp(scene, key) {
  return getPowerUpCount(scene, key) > 0;
}

function consumePowerUp(scene, key) {
  if (!scene.powerUpInventory) return false;
  if (!canUsePowerUp(scene, key)) return false;

  scene.powerUpInventory[key] = Math.max(0, (scene.powerUpInventory[key] ?? 0) - 1);
  updatePowerUpSlotByKey(scene, key);
  return true;
}

function updatePowerUpSlotByKey(scene, key) {
  if (!scene.powerUpSlotMap) return;
  const slot = scene.powerUpSlotMap[key];
  if (slot) {
    updatePowerUpSlotUI(scene, slot);
  }
}

function updatePowerUpSlotUI(scene, slot) {
  if (!slot || !slot.powerUpType) return;
  const count = getPowerUpCount(scene, slot.powerUpType.key);
  const hasPowerUp = count > 0;

  if (slot.countBadge) {
    slot.countBadge.setFillStyle(hasPowerUp ? 0x111111 : 0x0a2e2b, 0.7);
  }

  if (slot.countText) {
    slot.countText.setText(hasPowerUp ? `${count}` : "+");
    slot.countText.setColor(hasPowerUp ? "#ffffff" : "#4ecdc4");
    slot.countText.setFontStyle("bold");
  }

  if (slot.powerUpItem) {
    slot.powerUpItem.setAlpha(hasPowerUp ? 1 : 0.35);
  }
}

function handleUnavailablePowerUp(scene, powerUpType) {
  stopPointerPropagation(scene?.input?.activePointer);
  console.log(`Bạn chưa sở hữu ${powerUpType.name}. Nhấn dấu + để nạp thêm trong tương lai.`);
  
  const slot = scene.powerUpSlotMap ? scene.powerUpSlotMap[powerUpType.key] : null;
  if (slot && slot.countBadge && slot.countText) {
    scene.tweens.add({
      targets: [slot.countBadge, slot.countText],
      alpha: { from: 1, to: 0.4 },
      yoyo: true,
      duration: 120,
      repeat: 1,
      onComplete: () => {
        slot.countBadge.setAlpha(0.7);
        slot.countText.setAlpha(1);
      },
    });
  }
}

function stopPointerPropagation(pointer) {
  const nativeEvent = pointer?.event;
  if (nativeEvent) {
    if (typeof nativeEvent.stopPropagation === "function") {
      nativeEvent.stopPropagation();
    }
    if (typeof nativeEvent.stopImmediatePropagation === "function") {
      nativeEvent.stopImmediatePropagation();
    }
  }
}


