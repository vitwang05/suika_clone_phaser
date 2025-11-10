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

