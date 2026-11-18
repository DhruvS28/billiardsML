import Phaser from 'phaser';
import Matter from 'matter-js';
import type { Simulation } from '../simulation';
import { SimulationState } from '../config';

export class Controller {

  simulation: any

  constructor(simulation: Simulation) {
    this.simulation = simulation;
  }

  convertOutput(predictionOutput: number[]): Phaser.Math.Vector2 {
    let vecx = ((predictionOutput[0] * 2) - 1) * 18;
    let vecy = ((predictionOutput[1] * 2) - 1) * 18;
    let shot = new Phaser.Math.Vector2(vecx, vecy);
    const magnitude = shot.length();
    if (magnitude === 0) {
      return new Phaser.Math.Vector2(0, 0);
    }

    // normalize vector to length 1, but smae direction
    // use the original magnitude to determine power
    shot.normalize();
    const power = Phaser.Math.Clamp(magnitude, 0, 1);
    shot.scale(power * 18);

    return shot;
  }

  execute(predictionOutput: number[]) {
    let vector = this.convertOutput(predictionOutput);

    if (vector.length() === 0) {
      this.simulation.shotStats = {
        hitObjectBall: false,
        cueBallPocketed: false,
        objectBallsPocketed: 0
      };
      this.simulation.state = SimulationState.COMPLETE;
      return;
    }
    
    Matter.Body.setVelocity(this.simulation.cueBall, { x: vector.x, y: vector.y });
    this.simulation.state = SimulationState.RUNNING;
    this.simulation.settledFrames = 0;
    this.simulation.shotStats = {
      hitObjectBall: false,
      cueBallPocketed: false,
      objectBallsPocketed: 0
    };
  }
}