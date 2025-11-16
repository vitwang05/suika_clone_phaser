import { powerUpTypes } from "../data/powerUpTypes.js";

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

  // Thêm vào container
  container.add([slotCircle, powerUpItem]);

  // Lưu thông tin vào container
  container.powerUpType = powerUpType;
  container.powerUpItem = powerUpItem;
  container.slotCircle = slotCircle;

  // Thêm sự kiện click
  powerUpItem.on("pointerdown", () => {
    handlePowerUpClick(scene, powerUpType);
  });

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

  return container;
}

/**
 * Xử lý khi click vào vật phẩm hỗ trợ
 * @param {Phaser.Scene} scene - Scene hiện tại
 * @param {Object} powerUpType - Loại vật phẩm được click
 */
function handlePowerUpClick(scene, powerUpType) {
  console.log(`Power-up clicked: ${powerUpType.name}`);
  
  // TODO: Thêm logic sử dụng vật phẩm hỗ trợ ở đây
  // Ví dụ: có thể gọi scene.usePowerUp(powerUpType) nếu có method này
  
  // Hiệu ứng khi click
  scene.cameras.main.shake(100, 0.005);
  
  // Có thể thêm animation hoặc logic khác tùy theo từng loại vật phẩm
  switch (powerUpType.key) {
    case "powerup1":
      // Logic cho power-up 1
      break;
    case "powerup2":
      // Logic cho power-up 2
      break;
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
    }
  });
  
  return slots;
}

