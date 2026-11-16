import type { BallState } from '../interfaces'


export function encodeGameState(state: any): number[] {
  const encodedState: number[] = [];

  encodedState.push(state.cueBall.posx / state.tableWidth);
  encodedState.push(state.cueBall.posy / state.tableHeight);
  encodedState.push(state.cueBall.velx / 18);
  encodedState.push(state.cueBall.vely / 18);
  encodedState.push(!state.cueBall.isDestroyed ? 1 : 0);

  state.objectBalls.forEach((ball: BallState) => {
    encodedState.push(ball.posx / state.tableWidth);
    encodedState.push(ball.posy / state.tableHeight);
    encodedState.push(ball.velx / 18);
    encodedState.push(ball.vely / 18);
    encodedState.push(!ball.pocketed ? 1 : 0);
  });
  encodedState.push(state.isMoving ? 1 : 0)
  return encodedState;
}
