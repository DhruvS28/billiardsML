import './style.scss'
import Phaser from 'phaser';
import Matter from 'matter-js';
import { BALL_CONFIG, networkArch, NETWORKS, POCKET_SIZE, SimulationState, TABLE_CONFIG, tableSizes } from './config';
import { Evolution } from "./aiml/evolution";
import { TrainingManager } from './aiml/trainingManager'


const base = import.meta.env.BASE_URL

class GameScene extends Phaser.Scene {
  graphics!: Phaser.GameObjects.Graphics;

  cueBall!: Phaser.Physics.Matter.Image;
  cueBallSprite!: Phaser.GameObjects.Image;
  objectBalls!: Phaser.Physics.Matter.Image[];
  objectBallsSprites!: Phaser.GameObjects.Image[];

  isProjecting: boolean = false;
  projectionLine!: Phaser.GameObjects.Graphics;
  isTraining: boolean = false;

  scoreDisplay!: HTMLElement | null;
  score: number = 0;
  shots: number = 0;

  networkArch = networkArch;
  evolution = new Evolution(NETWORKS, this.networkArch);
  trainingManager = new TrainingManager(this.evolution);

  constructor() {
    super('scene-game');
  }

  preload() {


    this.load.image('bg', `${base}assets/BilliardKit/Billiards Table Big.png`);
    this.load.image('cueBall', `${base}assets/BilliardKit/Ball-White.png`);
    this.load.image('tableBorder', `${base}assets/BilliardKit/Table Border.png`);

    for (let i = 1; i <= 15; i++) {
      this.load.image(`b${i}`, `${base}assets/BilliardKit/b${i}.png`);
    }
  }
  create() {

    this.graphics = this.add.graphics();
    this.add.image(0, 0, 'bg').setOrigin(0, 0).setDisplaySize(tableSizes.width, tableSizes.height);

    // this.scoreDisplay = document.querySelector('.scoreBoard');
    this.renderGraphics();
    this.renderTable();

    this.cueHitLogic();

    document.querySelector("#beginTraining")?.addEventListener("click", () => { this.isTraining = !this.isTraining });
    document.querySelector("#resetBtn")?.addEventListener("click", () => { this.resetTable(); this.isTraining = false });
  }

  update() {
    if (Date.now() < this.trainingManager.pauseUntil) return;

    this.trainingManager.simulations.forEach(sim => sim.update(16.667)); // matter-js recommended for 60 fps

    this.cueBallSprite.setPosition(
      this.trainingManager.visualize.cueBall.position.x,
      this.trainingManager.visualize.cueBall.position.y
    );
    this.objectBallsSprites.forEach((sprite, index) => {
      const body = this.trainingManager.visualize.objectBalls[index];
      sprite.setPosition(
        body.position.x,
        body.position.y
      );
      sprite.setVisible(!this.trainingManager.visualize.pocketedBalls.has(body));
    });

    if (this.isTraining) {
      this.trainingManager.updateTraining()
    }

  }


  renderGraphics() {
    this.graphics.lineStyle(20, 0x654321, 1);

    TABLE_CONFIG.borders.forEach(({ x1, y1, x2, y2 }) => {
      this.graphics.beginPath();
      this.graphics.moveTo(x1, y1);
      this.graphics.lineTo(x2, y2);
      this.graphics.strokePath();
    });

    this.graphics.fillStyle(0x00ff00, 1);

    TABLE_CONFIG.pockets.forEach(({ x, y }) => {
      this.graphics.fillRect(x - POCKET_SIZE / 2, y - POCKET_SIZE / 2, POCKET_SIZE, POCKET_SIZE);
    });
  }

  renderTable() {
    this.cueBallSprite = this.add.image(
      this.trainingManager.visualize.cueBall.position.x,
      this.trainingManager.visualize.cueBall.position.y,
      'cueBall'
    ).setDisplaySize(BALL_CONFIG.radius * 2, BALL_CONFIG.radius * 2);


    this.objectBallsSprites = [];
    this.objectBallsSprites = this.trainingManager.visualize.objectBalls.map((ball, index) => {
      return this.add.image(
        ball.position.x,
        ball.position.y,
        `b${index + 1}`
      ).setDisplaySize(BALL_CONFIG.radius * 2, BALL_CONFIG.radius * 2);
    });
  }

  cueHitLogic() {
    let startx: number, starty: number;

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.isTraining) return;

      this.stopAllBalls(); // better for user experience
      if (!this.trainingManager.visualize.isTableStatic()) {
        return;
      }

      startx = pointer.downX;
      starty = pointer.downY;
      this.isProjecting = true;
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isProjecting) return;
      this.showProjectedPath(startx, starty, pointer.x, pointer.y);
    });


    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (!this.isProjecting) {
        return;
      }
      this.isProjecting = false;
      this.projectionLine?.clear();

      const dx = startx - pointer.upX;
      const dy = starty - pointer.upY;

      const shot = new Phaser.Math.Vector2(dx, dy);
      const dragDistance = shot.length();
      const MIN_DRAG = 25;
      const MAX_DRAG = 200;
      const MAX_SPEED = 15;

      if (dragDistance <= MIN_DRAG) return;

      const power = Phaser.Math.Clamp(
        (dragDistance - MIN_DRAG) / (MAX_DRAG - MIN_DRAG),
        0,
        1
      );
      shot.setLength(power * MAX_SPEED);

      Matter.Body.setVelocity(this.trainingManager.visualize.cueBall, { x: shot.x, y: shot.y });

      this.trainingManager.visualize.state = SimulationState.RUNNING;
      this.trainingManager.visualize.settledFrames = 0;
      this.trainingManager.visualize.shotStats = {
        hitObjectBall: false,
        cueBallPocketed: false,
        objectBallsPocketed: 0
      };
    });

  }

  stopAllBalls() {
    Matter.Body.setVelocity(this.trainingManager.visualize.cueBall, { x: 0, y: 0 });
    this.trainingManager.visualize.objectBalls
      .filter(ball => !this.trainingManager.visualize.pocketedBalls.has(ball))
      .forEach(ball => {
        Matter.Body.setVelocity(ball, { x: 0, y: 0 });
      });
  }

  showProjectedPath(startx: number, starty: number, currx: number, curry: number) {
    if (!this.projectionLine) {
      this.projectionLine = this.add.graphics();
    }

    this.projectionLine.clear();
    this.projectionLine.lineStyle(3, 0xffffff, 0.5);

    this.projectionLine.beginPath();
    this.projectionLine.moveTo(this.trainingManager.visualize.cueBall.position.x, this.trainingManager.visualize.cueBall.position.y);
    this.projectionLine.lineTo(this.trainingManager.visualize.cueBall.position.x - (currx - startx), this.trainingManager.visualize.cueBall.position.y - (curry - starty));
    this.projectionLine.strokePath();
  }

  resetTable() {
    this.trainingManager.visualize.resetSimulation();
    this.cueBallSprite.destroy();
    this.objectBallsSprites.forEach((ball) => ball.destroy());
    this.renderTable();
    this.shots = 0;
    // this.scoreDisplay!.textContent = `Score: ${this.score}`;
  };


}

const config = {
  type: Phaser.WEBGL,
  width: tableSizes.width,
  height: tableSizes.height,
  canvas: document.getElementById('gameCanvas') as HTMLCanvasElement,
  disableVisibilityChange: true,
  physics: {
    default: 'matter',
    matter: {
      gravity: { y: 0, x: 0 },
      debug: false,
    }
  },
  scene: [GameScene]
}

new Phaser.Game(config)
