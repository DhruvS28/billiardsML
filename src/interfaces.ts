import { NeuralNetwork } from './aiml/neuralNetwork'

export interface ShotStats {
  hitObjectBall: boolean;
  cueBallPocketed: boolean;
  objectBallsPocketed: number;
}

export interface BallState {
  name?: string;
  posx: number;
  posy: number;
  velx: number;
  vely: number;
  pocketed: boolean;
}

export interface GameState {
  objectBalls: BallState[];
  cueBall: BallState;
  tableWidth: number;
  tableHeight: number;
  isMoving?: boolean;
}

export interface Individual {
  network: NeuralNetwork;
  fitness: number;
}

export interface NetworkArchitecture {
  input: number;
  layer1: number;
  layer2: number;
  output: number;
}


