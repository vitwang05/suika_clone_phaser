import Phaser from "phaser";

const config = {
  type: Phaser.AUTO,
  width: 480,
  height: 720,
  backgroundColor: "#2d2d2d",
  physics: {
    default: "matter",
    matter: {
      gravity: { y: 1 },
      debug: true,
    },
  },
  scene: {
    preload,
    create,
    update,
  },
};

let fruits = [];
let fruitTypes = [
  { key: "small", radius: 20, color: 0xff5555 },
  { key: "medium", radius: 35, color: 0x55ff55 },
  { key: "large", radius: 50, color: 0x5599ff },
];
function preload() {}

function create() {
  this.matter.add.rectangle(240, 720, 480, 50, { isStatic: true });
  this.matter.add.rectangle(0, 360, 50, 720, { isStatic: true });
  this.matter.add.rectangle(480, 360, 50, 720, { isStatic: true });

  //   spawnFruit.call(this, 240, 100);
  this.input.on("pointerdown", (p) => {
    spawnFruit.call(this, p.x, 100);
  });

  this.matter.world.on("collisionstart", (event) => {
    event.pairs.forEach((pair) => {
      let a = pair.bodyA.gameObject;
      let b = pair.bodyB.gameObject;
      if (a && b && a.fruitType && b.fruitType) {
        console.log("collision", a.fruitType.key, b.fruitType.key);
        if (a.fruitType.key === b.fruitType.key) {
          mergeFruits.call(this, a, b);
        }
      }
    });
  });
}

// spawns a fruit at (x, y)
function spawnFruit(x, y) {
  let type = Phaser.Math.RND.pick(fruitTypes);
  let circle = this.add.circle(x, y, type.radius, type.color);
  this.matter.add.gameObject(circle, {
    shape: { type: "circle", radius: type.radius },
    restitution: 0.5,
  });

  circle.fruitType = type;
  circle.level = fruitTypes.indexOf(type);
  circle.on("destroy", () => {
    fruits = fruits.filter((f) => f !== circle);
  });

  fruits.push(circle);
  return circle;
}
// merges two fruits into a larger one
function mergeFruits(fruitA, fruitB) {
  if (!fruitA.active || !fruitB.active) return;

  const currentLevel = fruitA.level;
  if (currentLevel >= fruitTypes.length - 1) return; // already at max level
  const newLevel = currentLevel + 1;
  const newType = fruitTypes[newLevel];

  const newX = (fruitA.x + fruitB.x) / 2;
  const newY = (fruitA.y + fruitB.y) / 2;
  fruitA.destroy();
  fruitB.destroy();
  const newFruit = spawnFruit.call(this, newX, newY, newType);

  this.tweens.add({
    targets: newFruit,
    scale: { from: 1.2, to: 1 },
    duration: 200,
    ease: "Back.easeOut",
  });
}
function update() {}

new Phaser.Game(config);
