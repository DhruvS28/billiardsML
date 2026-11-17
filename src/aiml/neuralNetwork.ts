import { networkArch } from "../config";
import { type NetworkArchitecture } from "../interfaces";

export class NeuralNetwork {

  weightsMatrix: {
    weights1: number[][];
    weights2: number[][];
    weights3: number[][];
  } = {
      weights1: [],
      weights2: [],
      weights3: []
    };

  biasesMatrix: {
    bias1: number[];
    bias2: number[];
    bias3: number[];
  } = {
      bias1: [],
      bias2: [],
      bias3: [],
    };

  constructor(networkArch: NetworkArchitecture) {
    this.weightsMatrix.weights1 = this.createWeightMatrix(networkArch.input, networkArch.layer1);
    this.weightsMatrix.weights2 = this.createWeightMatrix(networkArch.layer1, networkArch.layer2);
    this.weightsMatrix.weights3 = this.createWeightMatrix(networkArch.layer2, networkArch.output);

    this.biasesMatrix.bias1 = Array(this.weightsMatrix.weights1.length).fill(0);
    this.biasesMatrix.bias2 = Array(this.weightsMatrix.weights2.length).fill(0);
    this.biasesMatrix.bias3 = Array(this.weightsMatrix.weights3.length).fill(0);
  }

  createWeightMatrix(rows: number, columns: number) {

    let matrix: number[][] = []
    const xinit = Math.sqrt(6 / (rows + columns)); // Xavier initialization

    for (let i = 0; i < columns; i++) {
      let weights: number[] = [];
      for (let j = 0; j < rows; j++) {
        let weight = (Math.random() * 2 * xinit) - xinit;
        weights.push(weight);
      }
      matrix.push(weights);
    }

    return matrix;
  }

  processLayer(inputs: number[], weightsLayer: number[][], bias: number[], sigmoid: boolean = false) {
    let outputs: number[] = [];

    for (let i = 0; i < weightsLayer.length; i++) {
      let sum = bias[i];
      for (let j = 0; j < inputs.length; j++) {
        sum += inputs[j] * weightsLayer[i][j];
      }
      if (sigmoid) {
        outputs.push(1 / (1 + Math.exp(-sum))); // Sigmoid calculation
      } else {
        outputs.push(Math.max(0, sum)); // ReLU activation calculation
      }
    }
    return outputs
  }

  predict(inputs: number[]) {
    const layer1 = this.processLayer(inputs, this.weightsMatrix.weights1, this.biasesMatrix.bias1);
    const layer2 = this.processLayer(layer1, this.weightsMatrix.weights2, this.biasesMatrix.bias2);
    const output = this.processLayer(layer2, this.weightsMatrix.weights3, this.biasesMatrix.bias3, true);
    return output;
  }

  clone() {
    const newNetwork = new NeuralNetwork(networkArch);
    newNetwork.weightsMatrix.weights1 = this.weightsMatrix.weights1.map(row => [...row]);
    newNetwork.weightsMatrix.weights2 = this.weightsMatrix.weights2.map(row => [...row]);
    newNetwork.weightsMatrix.weights3 = this.weightsMatrix.weights3.map(row => [...row]);
    newNetwork.biasesMatrix.bias1 = [...this.biasesMatrix.bias1];
    newNetwork.biasesMatrix.bias2 = [...this.biasesMatrix.bias2];
    newNetwork.biasesMatrix.bias3 = [...this.biasesMatrix.bias3];
    return newNetwork;
  }

}