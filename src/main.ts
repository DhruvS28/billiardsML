import './style.scss'
import Phaser from 'phaser';
import Matter from 'matter-js';
import * as gameState from './aiml/gameState'
import * as inputEncoder from './aiml/inputEncoder'
import { Controller } from './aiml/controller'
import { Evolution } from './aiml/evolution'
import { Simulation } from './simulation'
import { BALL_CONFIG, MAX_SHOTS, networkArch, POCKET_SIZE, TABLE_CONFIG, tableSizes } from './config';


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

  evolution!: Evolution;
  simulation = new Simulation();
  controller: Controller = new Controller(this.simulation);

  pauseUntil: number = 0;

  constructor() {
    super('scene-game');
  }

  preload() {

    this.evolution = new Evolution(100, this.networkArch);

    this.load.image('bg', `${base}assets/BilliardKit/Billiards Table Big.png`);
    this.load.image('cueBall', `${base}assets/BilliardKit/Ball-White.png`);
    this.load.image('tableBorder', `${base}assets/BilliardKit/Table Border.png`);

    for (let i = 1; i <= 15; i++) {
      this.load.image(`b${i}`, `${base}assets/BilliardKit/b${i}.png`);
    }
  }
  create() {

    this.graphics = this.add.graphics();
    // this.add.image(0, 0, 'bg').setOrigin(0, 0).setDisplaySize(tableSizes.width, tableSizes.height);

    // this.scoreDisplay = document.querySelector('.scoreBoard');
    this.simulation.setBorders(TABLE_CONFIG.borders);
    this.simulation.setPockets(TABLE_CONFIG.pockets);
    this.renderGraphics();
    this.renderTable();

    this.cueHitLogic();

    document.querySelector("#beginTraining")?.addEventListener("click", () => { this.trainAI(); this.isTraining = true });
    document.querySelector("#resetBtn")?.addEventListener("click", () => { this.resetTable(); this.isTraining = false });
  }

  update() {
    if (Date.now() < this.pauseUntil) return;

    this.simulation.update(16.667); // matter-js recommended for 60 fps

    for (const ball of this.simulation.pocketedBalls) {
      const index = this.simulation.objectBalls.indexOf(ball);
      if (index === -1) continue;
      this.objectBallsSprites[index].visible = false;
    }

    this.cueBallSprite.setPosition(
      this.simulation.cueBall.position.x,
      this.simulation.cueBall.position.y
    );
    this.objectBallsSprites.forEach((sprite, index) => {
      const body = this.simulation.objectBalls[index];
      sprite.setPosition(
        body.position.x,
        body.position.y
      );
    });

    if (this.simulation.isShotActive && this.isTableStatic()) {
      this.simulation.isShotActive = false;

      if (this.isTraining) {
        this.trainAI();
      }
    }
  }

  trainAI() {
    const individual = this.evolution.getCurrentIndividual();
    const state = gameState.captureGameState(this.simulation);
    const encodedState = inputEncoder.encodeGameState(state);
    const prediction = individual.network.predict(encodedState);
    this.evolution.calculateFitness(individual, this.simulation.shotStats);
    
    // Pause so AI doesn't immediately fire if cueBall was pocketed, only for visual
    if (this.simulation.shotStats.cueBallPocketed) {
     this.pauseUntil = Date.now() + 0;
    }
    this.shots++;
    this.controller.execute(prediction);

    if (this.shots >= MAX_SHOTS) {
      this.evolution.evaluateCandidate(individual);

      console.log("Generation:", this.evolution.generation);
      console.log("Candidate fitness:", individual.fitness);
      console.log("Best fitness:", this.evolution.bestFitness);
      console.log("Accepted: " + this.evolution.accepted + " ~~~ Average: ", (this.evolution.totalFitness / this.evolution.generation));
      console.log("================================");

      const nextCandidate = this.evolution.createCandidate(
        this.evolution.bestIndividual!
      );

      this.evolution.setCurrentIndividual(nextCandidate);

      this.shots = 0;
      this.resetTable();
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
      this.simulation.cueBall.position.x,
      this.simulation.cueBall.position.y,
      'cueBall'
    ).setDisplaySize(BALL_CONFIG.radius * 2, BALL_CONFIG.radius * 2);


    this.objectBallsSprites = [];
    this.objectBallsSprites = this.simulation.objectBalls.map((ball, index) => {
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
      this.stopAllBalls(); // better for user experience
      if (!this.isTableStatic()) {
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

      Matter.Body.setVelocity(this.simulation.cueBall, { x: shot.x, y: shot.y });

      this.simulation.isShotActive = true;
      this.simulation.shotStats = {
        hitObjectBall: false,
        cueBallPocketed: false,
        objectBallsPocketed: 0
      };
    });

  }

  isTableStatic() {
    return this.simulation.objectBalls
      .filter(ball => !this.simulation.pocketedBalls.has(ball))
      .every(ball =>
        Math.hypot(ball.velocity.x, ball.velocity.y) < 0.1
      ) &&
      Math.hypot(
        this.simulation.cueBall.velocity.x,
        this.simulation.cueBall.velocity.y
      ) < 0.1;
  }

  stopAllBalls() {
    Matter.Body.setVelocity(this.simulation.cueBall, { x: 0, y: 0 });
    this.simulation.objectBalls
      .filter(ball => !this.simulation.pocketedBalls.has(ball))
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
    this.projectionLine.moveTo(this.simulation.cueBall.position.x, this.simulation.cueBall.position.y);
    this.projectionLine.lineTo(this.simulation.cueBall.position.x - (currx - startx), this.simulation.cueBall.position.y - (curry - starty));
    this.projectionLine.strokePath();
  }

  resetTable() {
    this.simulation.createCueBall();
    this.simulation.createObjectBalls();
    this.cueBallSprite.destroy();
    this.objectBallsSprites.forEach((ball) => ball.destroy());
    this.renderTable();
    this.score = 0;
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
