import { tableSizes } from '../config';
import type { BallState, GameState } from '../interfaces'
import { Simulation } from '../simulation'

export function captureGameState(simulation: Simulation): GameState {
  const objectBalls: BallState[] = simulation.objectBalls.map(ball => {
    const pocketed = simulation.pocketedBalls.has(ball);
    return {
      name: ball.label,
      posx: pocketed ? 0 : ball.position.x,
      posy: pocketed ? 0 : ball.position.y,
      velx: pocketed ? 0 : ball.velocity.x,
      vely: pocketed ? 0 : ball.velocity.y,
      pocketed
    };
  });

  const cueBall: BallState = simulation.cueBall ? {
    name: simulation.cueBall.label,
    posx: simulation.cueBall.position.x,
    posy: simulation.cueBall.position.y,
    velx: simulation.cueBall.velocity.x,
    vely: simulation.cueBall.velocity.y,
    pocketed: simulation.cueBallPocketed || false
  } : {
    posx: 0, posy: 0, velx: 0, vely: 0, pocketed: true
  };

  return {
    objectBalls,
    cueBall,
    tableWidth: tableSizes.width,
    tableHeight: tableSizes.height,
    isMoving: cueBall.velx !== 0 ||
      cueBall.vely !== 0 ||
      objectBalls.some(ball => ball.velx !== 0 || ball.vely !== 0)
  };
}