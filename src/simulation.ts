import Matter from 'matter-js';
import Phaser from 'phaser';
import { BALL_CONFIG, ballTypes, tableSizes } from './config';
import type { ShotStats } from './interfaces';

export class Simulation {

  engine!: Matter.Engine;
  cueBall!: Matter.Body;
  objectBalls!: Matter.Body[];

  shotStats: ShotStats = {
    hitObjectBall: false,
    cueBallPocketed: false,
    objectBallsPocketed: 0
  };

  isShotActive: boolean = false;
  pocketedBalls: Set<Matter.Body> = new Set<Matter.Body>();
  cueBallPocketed: boolean = false;

  gameScore: number = 0;

  constructor() {
    this.engine = Matter.Engine.create();
    let world = this.engine.world;
    this.engine.gravity.y = 0;

    this.createCueBall();
    this.createObjectBalls();

    this.setCollisions();
  }

  update(delta: number) {
    // console.log(
    // Matter.Composite.allBodies(this.engine.world).length
    // );
    Matter.Engine.update(this.engine, delta);
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
        else if (ball?.label === ballTypes.OBJECT_BALL) this.pocketedBalls.add(ball);
      }

      if (this.cueBallPocketed) {
        this.shotStats.cueBallPocketed = true;
        Matter.Body.setVelocity(this.cueBall!, { x: 0, y: 0 });
        Matter.Body.setPosition(this.cueBall!, {
          x: tableSizes.width / 3,
          y: tableSizes.height / 2
        });
        this.cueBallPocketed = false;
      }
    });
  }
}