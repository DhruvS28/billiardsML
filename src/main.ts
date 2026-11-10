import './style.scss'
import Phaser from 'phaser';
const base = import.meta.env.BASE_URL

// how to make games and physics in javascript

// ive heard of phaser

// after I make a game with phaser can I incorporate ML into it, with neural networks and teach it to play optmally across genrations? 
// Similar to code bullet

// https://www.youtube.com/watch?v=0qtg-9M3peI&t=26s


const sizes = {
  width: 700,
  height: 350,
}

const speedDown = 0;

class GameScene extends Phaser.Scene {
  whiteBall!: Phaser.Physics.Matter.Image;
  balls!: Phaser.Physics.Matter.Image[];
  cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

  isProjecting: boolean = false;
  projectionLine!: Phaser.GameObjects.Graphics;

  scoreDisplay!: HTMLElement | null;
  score: number = 0;

  borderPoints = [
    { x1: (sizes.width) * 0.048, y1: (sizes.height) * 0.028, x2: (sizes.width) * 0.485, y2: (sizes.height) * 0.028 },
    { x1: (sizes.width) * 0.515, y1: (sizes.height) * 0.028, x2: (sizes.width) * 0.952, y2: (sizes.height) * 0.028 },
    { x1: (sizes.width) * 0.048, y1: (sizes.height) * 0.97, x2: (sizes.width) * 0.485, y2: (sizes.height) * 0.97 },
    { x1: (sizes.width) * 0.515, y1: (sizes.height) * 0.97, x2: (sizes.width) * 0.952, y2: (sizes.height) * 0.97 },
    { x1: (sizes.width) * 0.012, y1: (sizes.height) * 0.085, x2: (sizes.width) * 0.012, y2: (sizes.height) * 0.915 },
    { x1: (sizes.width) * 0.988, y1: (sizes.height) * 0.085, x2: (sizes.width) * 0.988, y2: (sizes.height) * 0.915 },
  ];

  pockets = [
    { x: (sizes.width) * 0.02, y: (sizes.height) * 0.035 },
    { x: (sizes.width) * 0.5, y: (sizes.height) * 0.02 },
    { x: (sizes.width) * 0.98, y: (sizes.height) * 0.035 },
    { x: (sizes.width) * 0.02, y: (sizes.height) * 0.965 },
    { x: (sizes.width) * 0.5, y: (sizes.height) * 0.975 },
    { x: (sizes.width) * 0.98, y: (sizes.height) * 0.965 },
  ]

  constructor() {
    super('scene-game');
  }

  preload() {
    this.load.image('bg', `${base}assets/BilliardKit/Billiards Table Big.png`);
    this.load.image('whiteBall', `${base}assets/BilliardKit/Ball-White.png`);
    this.load.image('tableBorder', `${base}assets/BilliardKit/Table Border.png`);

    for (let i = 1; i <= 15; i++) {
      this.load.image(`b${i}`, `${base}assets/BilliardKit/b${i}.png`);
    }
  }
  create() {
    this.add.image(0, 0, 'bg').setOrigin(0, 0).setDisplaySize(sizes.width, sizes.height);
    // this.matter.world.setBounds(20, 20, sizes.width - 40, sizes.height - 40);

    this.scoreDisplay = document.querySelector('.scoreBoard');
    this.setBorders(this.borderPoints);
    this.setPockets(this.pockets);


    this.matter.world.on('collisionstart', (event: { pairs: Array<{ bodyA: object; bodyB: object }> }) => {
      for (const pair of event.pairs) {
        const bodies = [pair.bodyA, pair.bodyB];
        const touchesPocket = bodies.some((body) => 'isSensor' in body && body.isSensor);
        if (!touchesPocket) continue;

        const ballIndex = this.balls.findIndex((ball) => ball.body !== null && bodies.includes(ball.body));
        if (ballIndex === -1) continue;

        const [ball] = this.balls.splice(ballIndex, 1);
        this.score++;
        this.scoreDisplay!.textContent = `Score: ${this.score}`;
        ball.destroy();
      }
    });

    this.whiteBall = this.matter.add.image(sizes.width / 2, sizes.height / 2, 'whiteBall').setDisplaySize(15, 15);
    this.whiteBall.setCircle(7.5);

    this.whiteBall.setFriction(0);
    this.whiteBall.setFrictionAir(0.025);
    this.whiteBall.setBounce(0.99);

    this.createCueBalls();

    this.whiteBall.setInteractive();
    this.cueHitLogic();


    this.cursors = this.input.keyboard!.createCursorKeys();
  }
  update() {

  }

  setBorders(points: { x1: number, y1: number, x2: number, y2: number }[] = []) {

    points.forEach(({ x1, y1, x2, y2 }) => {
      const length = Phaser.Math.Distance.Between(x1, y1, x2, y2);
      const angle = Phaser.Math.Angle.Between(x1, y1, x2, y2);

      const wall = this.matter.add.rectangle(
        (x1 + x2) / 2,
        (y1 + y2) / 2,
        length,
        20,
        {
          isStatic: true,
          angle
        }
      );

      return wall;
    });
  }

  setPockets(points: { x: number, y: number }[] = []) {
    points.forEach(({ x, y }) => {
      this.matter.add.rectangle(x, y, 20, 20, {
        isStatic: true,
        isSensor: true,
        label: 'pocket',
      });
    });
  }

  createCueBalls() {
    this.balls = [];

    const spacing = 15;
    const startX = sizes.width / 2 + 80;
    const startY = sizes.height / 2;

    let ballNumber = 1;

    for (let row = 0; row < 5; row++) {
      for (let col = 0; col <= row; col++) {

        const x = startX + row * spacing * 0.866;
        const y = startY + (col - row / 2) * spacing;

        const ball = this.matter.add.image(x, y, `b${ballNumber}`);

        ball.setDisplaySize(15, 15)
        ball.setCircle(7.5);
        ball.setFriction(0);
        ball.setFrictionAir(0.025);
        ball.setBounce(0.99);
        this.balls.push(ball);

        ballNumber++;
      }
    }
  }

  cueHitLogic() {
    let startx: number, starty: number;

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      startx = pointer.downX;
      starty = pointer.downY;
      this.isProjecting = true;

      this.stopAllBalls();
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isProjecting) return;
      this.showProjectedPath(startx, starty, pointer.x, pointer.y);
    });


    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      this.isProjecting = false;
      this.projectionLine.clear();

      const dx = startx - pointer.upX;
      const dy = starty - pointer.upY;

      const shot = new Phaser.Math.Vector2(dx, dy);
      const dragDistance = shot.length();
      const MIN_DRAG = 25;
      const MAX_DRAG = 200;
      const MAX_SPEED = 18;

      if (dragDistance <= MIN_DRAG) return;

      const power = Phaser.Math.Clamp(
        (dragDistance - MIN_DRAG) / (MAX_DRAG - MIN_DRAG),
        0,
        1
      );
      shot.setLength(power * MAX_SPEED);

      this.whiteBall.setVelocity(shot.x, shot.y);
    });

  }

  stopAllBalls() {
    this.whiteBall.setVelocity(0, 0);
    this.balls.forEach((ball) => {
      ball.setVelocity(0, 0);
    });
  }

  showProjectedPath(startx: number, starty: number, currx: number, curry: number) {
    if (!this.projectionLine) {
      this.projectionLine = this.add.graphics();
    }

    this.projectionLine.clear();
    this.projectionLine.lineStyle(3, 0xffffff, 0.5);

    this.projectionLine.beginPath();
    this.projectionLine.moveTo(this.whiteBall.x, this.whiteBall.y);
    this.projectionLine.lineTo(this.whiteBall.x - (currx - startx), this.whiteBall.y - (curry - starty));
    this.projectionLine.strokePath();
  }


}

const config = {
  type: Phaser.WEBGL,
  width: sizes.width,
  height: sizes.height,
  canvas: document.getElementById('gameCanvas') as HTMLCanvasElement,
  physics: {
    default: 'matter',
    matter: {
      gravity: { y: speedDown, x: 0 },
      debug: true,
    }
  },
  scene: [GameScene]
}

new Phaser.Game(config)
