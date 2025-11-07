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

let currentFruitType = null;
let nextFruitType = null;
function preload() {}

function create() {
  // sensor
  const topSensor = this.matter.add.rectangle(240, -10, 480, 20, {
    isSensor: true,
    isStatic: true,
  });

  this.topSensor = topSensor;

  // ground and walls
  this.matter.add.rectangle(240, 720, 480, 50, { isStatic: true });
  this.matter.add.rectangle(0, 360, 50, 720, { isStatic: true });
  this.matter.add.rectangle(480, 360, 50, 720, { isStatic: true });

  //start game
  currentFruitType = Phaser.Math.RND.pick(fruitTypes);
  nextFruitType = Phaser.Math.RND.pick(fruitTypes);

  // player
  this.preview = this.add.circle(
    240,
    80,
    currentFruitType.radius,
    currentFruitType.color
  );
  this.preview.setDepth(10);

  // next fruit
  this.nextPreview = this.add.circle(
    430,
    70,
    nextFruitType.radius,
    nextFruitType.color
  );
  this.nextPreview.setAlpha(0.8);

  this.input.on("pointermove", (p) => {
    this.preview.x = Phaser.Math.Clamp(p.x, 40, 440);
  });

  //   spawnFruit.call(this, 240, 100);
  this.input.on("pointerdown", (p) => {
    if(this.gameOver) return;

    // spawn fruit thật từ vị trí người chơi
    spawnFruit.call(this, this.preview.x, this.preview.y, currentFruitType);


    // chuyển next -> current
    currentFruitType = nextFruitType;
    nextFruitType = Phaser.Math.RND.pick(fruitTypes);

    this.preview.setRadius(currentFruitType.radius);
    this.preview.setFillStyle(currentFruitType.color);


    this.nextPreview.destroy();
    this.nextPreview = this.add.circle(
      430,
      70,
      nextFruitType.radius,
      nextFruitType.color
    );
    this.nextPreview.setAlpha(0.8);

  });

  this.matter.world.on("collisionstart", (event) => {
    event.pairs.forEach((pair) => {
      let a = pair.bodyA.gameObject;
      let b = pair.bodyB.gameObject;

      if (pair.bodyA === topSensor || pair.bodyB === topSensor) {
        const fruit = a?.fruitType ? a : b?.fruitType ? b : null;
        if (fruit && !this.gameOver) {
          handleGameOver.call(this);
        }
      }

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
function spawnFruit(x, y, type) {
  const circle = this.add.circle(x, y, type.radius, type.color);
  this.matter.add.gameObject(circle, {
    shape: { type: "circle", radius: type.radius },
    restitution: 0.5,
    friction: 0.1,
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
  // nếu một trong hai đã merge hoặc bị hủy -> bỏ qua
  if (!fruitA.active || !fruitB.active || fruitA.merging || fruitB.merging)
    return;

  fruitA.merging = true;
  fruitB.merging = true;

  const currentLevel = fruitA.level;
  if (currentLevel >= fruitTypes.length - 1) return;

  const newType = fruitTypes[currentLevel + 1];
  const newX = (fruitA.x + fruitB.x) / 2;
  const newY = (fruitA.y + fruitB.y) / 2;

  // fade 2 quả cũ
  this.tweens.add({
    targets: [fruitA, fruitB],
    alpha: { from: 1, to: 0 },
    duration: 100,
    onComplete: () => {
      // Xóa 2 quả cũ
      fruitA.destroy();
      fruitB.destroy();

      // flash sáng nhỏ
      const flash = this.add.circle(
        newX,
        newY,
        newType.radius * 1.2,
        0xffffff,
        0.6
      );
      this.tweens.add({
        targets: flash,
        alpha: { from: 0.6, to: 0 },
        scale: { from: 1, to: 1.8 },
        duration: 200,
        onComplete: () => flash.destroy(),
      });

      // spawn quả mới an toàn
      spawnFruit.call(this, newX, newY, newType);

      // rung nhẹ màn hình
      this.cameras.main.shake(80, 0.002);
    },
  });
}

// xử lý khi trò chơi kết thúc
function handleGameOver() {
  this.gameOver = true;
  this.add
    .text(240, 360, "GAME OVER", {
      fontSize: "48px",
      color: "#ff5555",
    })
    .setOrigin(0.5);

  this.cameras.main.shake(200, 0.01);

  // tạm dừng vật lý
  this.matter.world.pause();

  // tùy chọn: sau vài giây hiện restart
  this.time.delayedCall(2000, () => {
    this.scene.restart();
  });
}

function update() {}

new Phaser.Game(config);
