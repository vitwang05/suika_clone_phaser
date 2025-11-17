import { PHYSICS_CONFIG, ANIMATION_DURATIONS, FLASH_CONFIG } from "../config/constants.js";
import { fruitTypes } from "../data/fruitTypes.js";

// Global fruits array
export let fruits = [];

export function spawnFruit(scene, x, y, type) {
  const circle = scene.add.circle(x, y, type.radius, type.color);
  scene.matter.add.gameObject(circle, {
    shape: { type: "circle", radius: type.radius },
    restitution: PHYSICS_CONFIG.RESTITUTION,
    friction: PHYSICS_CONFIG.FRICTION,
  });

  circle.fruitType = type;
  circle.level = fruitTypes.indexOf(type);

  circle.on("destroy", () => {
    fruits = fruits.filter((f) => f !== circle);
  });

  fruits.push(circle);
  return circle;
}

export function mergeFruits(scene, fruitA, fruitB) {
  // Prevent duplicate merges
  if (
    !fruitA.active ||
    !fruitB.active ||
    fruitA.merging ||
    fruitB.merging
  ) {
    return;
  }

  fruitA.merging = true;
  fruitB.merging = true;

  const currentLevel = fruitA.level;
  if (currentLevel >= fruitTypes.length - 1) return;

  const newType = fruitTypes[currentLevel + 1];
  const newX = (fruitA.x + fruitB.x) / 2;
  const newY = (fruitA.y + fruitB.y) / 2;

  // Fade out old fruits
  scene.tweens.add({
    targets: [fruitA, fruitB],
    alpha: { from: 1, to: 0 },
    duration: ANIMATION_DURATIONS.MERGE_FADE,
    onComplete: () => {
      fruitA.destroy();
      fruitB.destroy();

      if (typeof scene.handleMergeComboScore === "function") {
        scene.handleMergeComboScore();
      }
      createMergeFlash(scene, newX, newY, newType);
      spawnFruit(scene, newX, newY, newType);
      scene.cameras.main.shake(
        ANIMATION_DURATIONS.SCREEN_SHAKE_MERGE,
        0.002
      );
    },
  });
}

function createMergeFlash(scene, x, y, fruitType) {
  const flash = scene.add.circle(
    x,
    y,
    fruitType.radius * FLASH_CONFIG.SIZE_MULTIPLIER,
    FLASH_CONFIG.COLOR,
    FLASH_CONFIG.ALPHA_START
  );

  scene.tweens.add({
    targets: flash,
    alpha: { from: FLASH_CONFIG.ALPHA_START, to: FLASH_CONFIG.ALPHA_END },
    scale: { from: FLASH_CONFIG.SCALE_START, to: FLASH_CONFIG.SCALE_END },
    duration: ANIMATION_DURATIONS.FLASH,
    onComplete: () => flash.destroy(),
  });
}

/**
 * Xóa tất cả fruits nằm trong hoặc một phần trong vùng bán kính
 * @param {Phaser.Scene} scene - Scene hiện tại
 * @param {number} centerX - Tọa độ X của tâm vòng tròn
 * @param {number} centerY - Tọa độ Y của tâm vòng tròn
 * @param {number} radius - Bán kính vòng tròn xóa
 * @returns {number} Số lượng fruits đã xóa
 */
export function deleteFruitsInRadius(scene, centerX, centerY, radius) {
  let deletedCount = 0;
  const fruitsToDelete = [];

  // Kiểm tra tất cả fruits
  fruits.forEach((fruit) => {
    if (!fruit.active || !fruit.body) return;

    const fruitX = fruit.x;
    const fruitY = fruit.y;
    const fruitRadius = fruit.fruitType ? fruit.fruitType.radius : 0;

    // Tính khoảng cách từ tâm vòng tròn đến tâm fruit
    const distance = Phaser.Math.Distance.Between(centerX, centerY, fruitX, fruitY);

    // Kiểm tra nếu fruit dính một phần trong vùng bán kính
    // Nếu khoảng cách <= bán kính xóa + bán kính fruit, thì có giao nhau và fruit bị xóa
    // Điều này có nghĩa là chỉ cần fruit chạm một phần nhỏ trong vòng tròn cũng bị xóa
    if (distance <= radius + fruitRadius) {
      fruitsToDelete.push(fruit);
    }
  });

  // Xóa các fruits
  fruitsToDelete.forEach((fruit) => {
    if (fruit.active) {
      // Hiệu ứng fade out trước khi xóa
      scene.tweens.add({
        targets: fruit,
        alpha: { from: 1, to: 0 },
        scaleX: { from: 1, to: 0 },
        scaleY: { from: 1, to: 0 },
        duration: 100,
        onComplete: () => {
          fruit.destroy();
        },
      });
      deletedCount++;
    }
  });

  return deletedCount;
}

/**
 * Nâng cấp level của một fruit
 * @param {Phaser.Scene} scene - Scene hiện tại
 * @param {Phaser.GameObjects.Circle} fruit - Fruit cần nâng cấp
 * @returns {boolean} true nếu nâng cấp thành công, false nếu không
 */
export function upgradeFruitLevel(scene, fruit) {
  if (!fruit || !fruit.active || !fruit.fruitType) return false;
  
  const currentLevel = fruit.level;
  
  // Kiểm tra nếu đã là level cao nhất
  if (currentLevel >= fruitTypes.length - 1) return false;
  
  const newLevel = currentLevel + 1;
  const newType = fruitTypes[newLevel];
  const fruitX = fruit.x;
  const fruitY = fruit.y;
  
  // Fade out fruit cũ
  scene.tweens.add({
    targets: fruit,
    alpha: { from: 1, to: 0 },
    scaleX: { from: 1, to: 0 },
    scaleY: { from: 1, to: 0 },
    duration: ANIMATION_DURATIONS.MERGE_FADE,
    onComplete: () => {
      fruit.destroy();
      
      // Tạo flash effect
      createMergeFlash(scene, fruitX, fruitY, newType);
      
      // Spawn fruit mới với level cao hơn
      spawnFruit(scene, fruitX, fruitY, newType);
      
      // Screen shake
      scene.cameras.main.shake(ANIMATION_DURATIONS.SCREEN_SHAKE_MERGE, 0.002);
    },
  });
  
  return true;
}

