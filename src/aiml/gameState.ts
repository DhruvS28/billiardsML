import { sizes } from '../main';
import type { BallState, GameState } from '../interfaces'

export function captureGameState(scene: any): GameState {
  // console.log(scene.objectBalls)
  const objectBalls: BallState[] = scene.objectBalls.map((ball: any) => ({
      name: ball.name,
      posx: ball.isDestroyed ? 0 : ball.x,
      posy: ball.isDestroyed ? 0 : ball.y,
      velx: ball.isDestroyed ? 0 : ball.body.velocity.x,
      vely: ball.isDestroyed ? 0 : ball.body.velocity.y,
      pocketed: ball.isDestroyed || false,
    }));

  const cueBall: BallState = scene.cueBall ? {
    name: scene.cueBall.name,
    posx: scene.cueBall.x,
    posy: scene.cueBall.y,
    velx: scene.cueBall.body.velocity.x,
    vely: scene.cueBall.body.velocity.y,
    pocketed: scene.cueBall.pocketed || false
  } : { posx: 0, posy: 0, velx: 0, vely: 0, pocketed: true };

  return {
    objectBalls,
    cueBall: cueBall,
    tableWidth: sizes.width,
    tableHeight: sizes.height,
    isMoving: cueBall.velx !== 0 || cueBall.vely !== 0 || objectBalls.some(ball => ball.velx !== 0 || ball.vely !== 0)
  };
}