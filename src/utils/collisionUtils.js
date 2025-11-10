import { mergeFruits } from "./fruitUtils.js";

export function handleTopSensorCollision(scene, pair) {
  const { topSensor } = scene;
  if (pair.bodyA !== topSensor && pair.bodyB !== topSensor) return;

  // Tạm tắt check game over khi đang cooldown sau khi thả
  if (!scene.canCheckGameOver) return;

  const fruit =
    pair.bodyA.gameObject?.fruitType || pair.bodyB.gameObject?.fruitType
      ? pair.bodyA.gameObject?.fruitType
        ? pair.bodyA.gameObject
        : pair.bodyB.gameObject
      : null;

  if (fruit && !scene.gameOver) {
    scene.handleGameOver();
  }
}

export function handleFruitCollision(scene, fruitA, fruitB) {
  if (!fruitA || !fruitB || !fruitA.fruitType || !fruitB.fruitType) return;

  if (fruitA.fruitType.key === fruitB.fruitType.key) {
    mergeFruits(scene, fruitA, fruitB);
  }
}

