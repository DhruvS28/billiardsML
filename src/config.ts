import type { NetworkArchitecture } from "./interfaces";

// Constants to be used for training
export const networkArch: NetworkArchitecture = {
  input: 81,
  layer1: 64,
  layer2: 32,
  output: 2
}

export const NETWORKS = 100;
export const MAX_SHOTS = 10;
export const ELITE_COUNT = 5;

// Other various constants

export const tableSizes = {
  width: 700,
  height: 350,
}

export const ballTypes = {
  CUE_BALL: "cueBall",
  OBJECT_BALL: "objectBall"
}

export const BALL_CONFIG = {
  radius: 7.5,
  friction: 0,
  airFriction: 0.025,
  restitution: 0.99,
  spacing: 15
}

export const POCKET_SIZE = tableSizes.width * 0.0285; 

export const TABLE_CONFIG = {
  borders: [
    { x1: (tableSizes.width) * 0.048, y1: (tableSizes.height) * 0.028, x2: (tableSizes.width) * 0.485, y2: (tableSizes.height) * 0.028 },
    { x1: (tableSizes.width) * 0.515, y1: (tableSizes.height) * 0.028, x2: (tableSizes.width) * 0.952, y2: (tableSizes.height) * 0.028 },
    { x1: (tableSizes.width) * 0.048, y1: (tableSizes.height) * 0.97, x2: (tableSizes.width) * 0.485, y2: (tableSizes.height) * 0.97 },
    { x1: (tableSizes.width) * 0.515, y1: (tableSizes.height) * 0.97, x2: (tableSizes.width) * 0.952, y2: (tableSizes.height) * 0.97 },
    { x1: (tableSizes.width) * 0.012, y1: (tableSizes.height) * 0.085, x2: (tableSizes.width) * 0.012, y2: (tableSizes.height) * 0.915 },
    { x1: (tableSizes.width) * 0.988, y1: (tableSizes.height) * 0.085, x2: (tableSizes.width) * 0.988, y2: (tableSizes.height) * 0.915 },
  ],
  pockets: [
    { x: (tableSizes.width) * 0.02, y: (tableSizes.height) * 0.035 },
    { x: (tableSizes.width) * 0.5, y: (tableSizes.height) * 0.02 },
    { x: (tableSizes.width) * 0.98, y: (tableSizes.height) * 0.035 },
    { x: (tableSizes.width) * 0.02, y: (tableSizes.height) * 0.965 },
    { x: (tableSizes.width) * 0.5, y: (tableSizes.height) * 0.975 },
    { x: (tableSizes.width) * 0.98, y: (tableSizes.height) * 0.965 },
  ]
};

export const SimulationState = {
  READY: "READY",
  RUNNING: "RUNNING",
  COMPLETE: "COMPLETE",
}