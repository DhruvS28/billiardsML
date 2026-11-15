import Phaser from 'phaser';

export class Controller {

  scene: any

  constructor(scene: any) {
    this.scene = scene;
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
      return;
    }
    
    this.scene.cueBall.setVelocity(vector.x, vector.y);
    this.scene.isShotActive = true;

    this.scene.stats = {
      hitObjectBall: false,
      cueBallPocketed: false,
      objectBallsPocketed: 0
    };
  }
}