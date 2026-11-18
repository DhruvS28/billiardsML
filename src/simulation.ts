import Matter from 'matter-js';
import Phaser from 'phaser';
import { BALL_CONFIG, ballTypes, tableSizes, SimulationState, TABLE_CONFIG } from './config';
import type { ShotStats } from './interfaces';

export class Simulation {

  engine!: Matter.Engine;
  cueBall!: Matter.Body;
  objectBalls!: Matter.Body[];
  settledFrames = 0;

  gameScore: number = 0;
  shotStats: ShotStats = {
    hitObjectBall: false,
    cueBallPocketed: false,
    objectBallsPocketed: 0
  };

  pocketedBalls: Set<Matter.Body> = new Set<Matter.Body>();
  cueBallPocketed: boolean = false;
  state = SimulationState.READY;

  constructor() {
    this.engine = Matter.Engine.create();
    this.engine.gravity.y = 0;

    this.createCueBall();
    this.createObjectBalls();
    this.setBorders(TABLE_CONFIG.borders);
    this.setPockets(TABLE_CONFIG.pockets);
    this.setCollisions();
  }

  update(delta: number) {
    if (this.state !== SimulationState.RUNNING) return;

    Matter.Engine.update(this.engine, delta);

    // mark shot as COMPLETE after three consecutive settled updates (150-180ms)
    this.settledFrames = this.isTableStatic() ? this.settledFrames + 1 : 0;
    if (this.settledFrames >= 3) {
      this.settledFrames = 0;
      this.state = SimulationState.COMPLETE;
    }
  }

  isTableStatic() {
    return this.objectBalls
      .filter(ball => !this.pocketedBalls.has(ball))
      .every(ball =>
        Math.hypot(ball.velocity.x, ball.velocity.y) < 0.1
      ) &&
      Math.hypot(
        this.cueBall.velocity.x,
        this.cueBall.velocity.y
      ) < 0.1;
  }

  createCueBall() {
    if (this.cueBall) {
      Matter.Composite.remove(this.engine.world, this.cueBall);
    }
    let cueBall = Matter.Bodies.circle(tableSizes.width / 3, tableSizes.height / 2, BALL_CONFIG.radius);
    cueBall.friction = 0;
    cueBall.frictionAir = 0.025;
    cueBall.restitution = 0.99;
    cueBall.label = ballTypes.CUE_BALL;

    this.cueBall = cueBall;
    Matter.Composite.add(this.engine.world, this.cueBall);
  }

  createObjectBalls() {
    if (this.objectBalls?.length > 0) {
      this.objectBalls.forEach(ball => Matter.Composite.remove(this.engine.world, ball));
    }
    this.objectBalls = [];
    this.pocketedBalls.clear();

    const spacing = BALL_CONFIG.spacing;
    const startX = tableSizes.width / 2 + 80;
    const startY = tableSizes.height / 2;

    let ballNumber = 1;

    for (let row = 0; row < 5; row++) {
      for (let col = 0; col <= row; col++) {

        const x = startX + row * spacing * 0.866;
        const y = startY + (col - row / 2) * spacing;

        let ball = Matter.Bodies.circle(x, y, BALL_CONFIG.radius);
        ball.friction = 0;
        ball.frictionAir = 0.025;
        ball.restitution = 0.99;
        ball.label = ballTypes.OBJECT_BALL;
        this.objectBalls.push(ball);
        ballNumber++;
      }
    }
    this.objectBalls.forEach(ball => Matter.Composite.add(this.engine.world, ball));
  }


  setBorders(points: { x1: number, y1: number, x2: number, y2: number }[] = []) {
    points.forEach(({ x1, y1, x2, y2 }) => {
      const length = Phaser.Math.Distance.Between(x1, y1, x2, y2);
      const angle = Phaser.Math.Angle.Between(x1, y1, x2, y2);

      const wall = Matter.Bodies.rectangle(
        (x1 + x2) / 2,
        (y1 + y2) / 2,
        length,
        20,
        {
          isStatic: true,
          angle
        }
      );
      Matter.Composite.add(this.engine.world, wall);
      return wall;
    });
  }

  setPockets(points: { x: number, y: number }[] = []) {
    points.forEach(({ x, y }) => {
      let pocket = Matter.Bodies.rectangle(x, y, 20, 20, {
        isStatic: true,
        isSensor: true,
        label: 'pocket',
      });
      Matter.Composite.add(this.engine.world, pocket);
    });
  }

  setCollisions() {
    Matter.Events.on(this.engine, 'collisionStart', (event: any) => {
      for (const { bodyA, bodyB } of event.pairs) {
        const bodies = [bodyA, bodyB];

        if (!this.shotStats.hitObjectBall) {
          this.shotStats.hitObjectBall =
            bodies.includes(this.cueBall!) &&
            this.objectBalls.some(ball => bodies.includes(ball));
        }

        if (!bodies.some(body => body.label === 'pocket')) continue;

        const ball = bodies.find(body => body.label !== 'pocket');

        if (ball?.label === ballTypes.CUE_BALL) this.cueBallPocketed = true;
        else if (
          ball?.label === ballTypes.OBJECT_BALL &&
          !this.pocketedBalls.has(ball)
        ) {
          this.pocketedBalls.add(ball);
          this.shotStats.objectBallsPocketed++;
        }
      }

      if (this.cueBallPocketed) {
        this.shotStats.cueBallPocketed = true;
        this.cueBallPocketed = false;
        Matter.Body.setVelocity(this.cueBall!, { x: 0, y: 0 });
        Matter.Body.setPosition(this.cueBall!, {
          x: tableSizes.width / 3,
          y: tableSizes.height / 2
        });
      }
    });
  }

  resetSimulation() {
    this.createCueBall();
    this.createObjectBalls();

    this.shotStats = {
      hitObjectBall: false,
      cueBallPocketed: false,
      objectBallsPocketed: 0
    };
    this.gameScore = 0;
    this.settledFrames = 0;
    this.state = SimulationState.READY;
  }
}