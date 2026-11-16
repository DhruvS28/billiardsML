import './style.scss'
import Phaser from 'phaser';
import * as gameState from './aiml/gameState'
import * as inputEncoder from './aiml/inputEncoder'
import { Controller } from './aiml/controller'
import { Evolution } from './aiml/evolution'
import { MAX_SHOTS, networkArch, type NetworkArchitecture, type ShotStats } from './interfaces';

const base = import.meta.env.BASE_URL

export const sizes = {
  width: 700,
  height: 350,
}

const speedDown = 0;

class GameScene extends Phaser.Scene {
  cueBall!: Phaser.Physics.Matter.Image;
  objectBalls!: Phaser.Physics.Matter.Image[];
  cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

  isProjecting: boolean = false;
  projectionLine!: Phaser.GameObjects.Graphics;
  isShotActive: boolean = false;
  isTraining: boolean = false;

  scoreDisplay!: HTMLElement | null;
  score: number = 0;
  shots: number = 0;

  networkArch = networkArch;

  evolution!: Evolution;
  controller: Controller = new Controller(this);

  stats: ShotStats = {
    hitObjectBall: false,
    cueBallPocketed: false,
    objectBallsPocketed: 0
  };

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
    this.evolution = new Evolution(100, this.networkArch);

    this.load.image('bg', `${base}assets/BilliardKit/Billiards Table Big.png`);
    this.load.image('cueBall', `${base}assets/BilliardKit/Ball-White.png`);
    this.load.image('tableBorder', `${base}assets/BilliardKit/Table Border.png`);

    for (let i = 1; i <= 15; i++) {
      this.load.image(`b${i}`, `${base}assets/BilliardKit/b${i}.png`);
    }
  }
  create() {
    // this.matter.world.engine.timing.timeScale = 1;
    this.add.image(0, 0, 'bg').setOrigin(0, 0).setDisplaySize(sizes.width, sizes.height);
    // this.matter.world.setBounds(20, 20, sizes.width - 40, sizes.height - 40);

    this.scoreDisplay = document.querySelector('.scoreBoard');
    this.setBorders(this.borderPoints);
    this.setPockets(this.pockets);

    this.setCollisions();

    this.setCueBall();
    this.setObjectBalls();

    this.cueBall.setInteractive();
    this.cueHitLogic();


    this.cursors = this.input.keyboard!.createCursorKeys();
    document.querySelector("#beginTraining")?.addEventListener("click", () => { this.trainAI(); this.isTraining = true });
    document.querySelector("#resetBtn")?.addEventListener("click", () => { this.resetTable(); this.isTraining = false });
  }

  update() {
    if (this.isShotActive && this.isTableStatic()) {
      this.isShotActive = false;

      if (this.isTraining) {
        this.trainAI();
      }
    }
  }

  trainAI() {
    const individual = this.evolution.getCurrentIndividual();
    const state = gameState.captureGameState(this);
    const encodedState = inputEncoder.encodeGameState(state);
    const prediction = individual.network.predict(encodedState);
    this.evolution.calculateFitness(individual, this.stats);
    this.shots++;
    this.controller.execute(prediction);

    if (this.shots >= MAX_SHOTS) {
      this.evolution.evaluateCandidate(individual);

      console.log("Generation:", this.evolution.generation);
      console.log("Candidate fitness:", individual.fitness);
      console.log("Best fitness:", this.evolution.bestFitness);
      console.log("Accepted: " + this.evolution.accepted + " ~~~ Average: ", (this.evolution.totalFitness/this.evolution.generation));
      console.log("================================");

      const nextCandidate = this.evolution.createCandidate(
        this.evolution.bestIndividual!
      );

      this.evolution.setCurrentIndividual(nextCandidate);

      this.shots = 0;
      this.resetTable();
    }
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

  setCueBall() {
    this.cueBall = this.matter.add.image(sizes.width / 3, sizes.height / 2, 'cueBall').setDisplaySize(15, 15);
    this.cueBall.setName('cueBall');
    this.cueBall.setCircle(7.5);
    this.cueBall.setFriction(0);
    this.cueBall.setFrictionAir(0.025);
    this.cueBall.setBounce(0.99);
  }

  setObjectBalls() {
    this.objectBalls = [];

    const spacing = 15;
    const startX = sizes.width / 2 + 80;
    const startY = sizes.height / 2;

    let ballNumber = 1;

    for (let row = 0; row < 5; row++) {
      for (let col = 0; col <= row; col++) {

        const x = startX + row * spacing * 0.866;
        const y = startY + (col - row / 2) * spacing;

        const ball = this.matter.add.image(x, y, `b${ballNumber}`);
        ball.setName(`b${ballNumber}`);
        ball.setDisplaySize(15, 15)
        ball.setCircle(7.5);
        ball.setFriction(0);
        ball.setFrictionAir(0.025);
        ball.setBounce(0.99);
        this.objectBalls.push(ball);
        ballNumber++;
      }
    }
  }

  setCollisions() {
    this.matter.world.on('collisionstart', (event: any) => {
      let cueBallPocketed = false;
      const pocketedBalls = new Set<number>();

      for (const pair of event.pairs) {
        const bodies = [pair.bodyA, pair.bodyB];

        if (!this.stats.hitObjectBall) {
          this.stats.hitObjectBall =
            bodies.includes(this.cueBall.body!) &&
            this.objectBalls.some(ball =>
              ball.body !== null && bodies.includes(ball.body)
            );
        }

        const touchesPocket = bodies.some(
          body => 'isSensor' in body && body.isSensor
        );

        if (!touchesPocket) continue;

        if (
          this.cueBall.body !== null &&
          bodies.includes(this.cueBall.body)
        ) {
          cueBallPocketed = true;
          continue;
        }

        const ballIndex = this.objectBalls.findIndex(
          ball => ball.body !== null && bodies.includes(ball.body)
        );

        if (ballIndex !== -1) {
          pocketedBalls.add(ballIndex);
        }
      }

      if (cueBallPocketed) {
        this.stats.cueBallPocketed = true;
        this.cueBall.setVelocity(0, 0);
        this.score--;
        this.cueBall.setPosition(sizes.width / 3, sizes.height / 2);
        
        // Pause so AI doesn't immediately fire
        this.matter.world.pause();
        this.time.delayedCall(500, () => {
          this.matter.world.resume();
        });
      }

      for (const index of pocketedBalls) {
        const ball = this.objectBalls[index];

        if (!ball || ball.body === null) continue;

        this.score++;
        ball.destroy();
        this.stats.objectBallsPocketed = 1;
      }

      this.scoreDisplay!.textContent = `Score: ${this.score}`;
    });
  }

  cueHitLogic() {
    let startx: number, starty: number;

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.stopAllBalls(); // better for human user experience
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
      const MAX_SPEED = 18;

      if (dragDistance <= MIN_DRAG) return;

      const power = Phaser.Math.Clamp(
        (dragDistance - MIN_DRAG) / (MAX_DRAG - MIN_DRAG),
        0,
        1
      );
      shot.setLength(power * MAX_SPEED);

      this.cueBall.setVelocity(shot.x, shot.y);
      this.isShotActive = true;
      this.stats = {
        hitObjectBall: false,
        cueBallPocketed: false,
        objectBallsPocketed: 0
      };
    });

  }

  isTableStatic() {
    return this.objectBalls.filter((ball: any) => !ball.isDestroyed).every((ball) => {
      return Math.hypot(ball.body?.velocity.x ?? 0, ball.body?.velocity.y ?? 0) < 0.1;
    }) && Math.hypot(this.cueBall.body?.velocity.x ?? 0, this.cueBall.body?.velocity.y ?? 0) < 0.1;
  }

  stopAllBalls() {
    this.cueBall.setVelocity(0, 0);
    this.objectBalls.filter((ball: any) => !ball.isDestroyed).forEach((ball) => {
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
    this.projectionLine.moveTo(this.cueBall.x, this.cueBall.y);
    this.projectionLine.lineTo(this.cueBall.x - (currx - startx), this.cueBall.y - (curry - starty));
    this.projectionLine.strokePath();
  }

  resetTable() {
    this.cueBall.destroy();
    this.objectBalls.forEach((ball) => ball.destroy());
    this.objectBalls = [];

    this.setCueBall();
    this.setObjectBalls();
    this.score = 0;
    this.shots = 0;
    this.scoreDisplay!.textContent = `Score: ${this.score}`;
  };


}

const config = {
  type: Phaser.WEBGL,
  width: sizes.width,
  height: sizes.height,
  canvas: document.getElementById('gameCanvas') as HTMLCanvasElement,
  disableVisibilityChange: true,
  physics: {
    default: 'matter',
    matter: {
      gravity: { y: speedDown, x: 0 },
      debug: false,
    }
  },
  scene: [GameScene]
}

new Phaser.Game(config)
