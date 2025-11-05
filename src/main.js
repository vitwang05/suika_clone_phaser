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


  function spawnFruit(x,y){
    let type = Phaser.Math.RND.pick(fruitTypes);
    let circle = this.add.circle(x, y, type.radius, type.color);
    this.matter.add.gameObject(circle, {
      shape: { type: "circle", radius: type.radius },
      restitution: 0.5,
    });
    fruits.push(circle);
  }
}

function update() {
    
}

new Phaser.Game(config);
