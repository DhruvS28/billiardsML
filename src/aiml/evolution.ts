import { ELITE_COUNT, NETWORKS } from '../config';
import type { Individual, NetworkArchitecture } from '../interfaces';
import { NeuralNetwork } from './neuralNetwork'



export class Evolution {

  population: Individual[] = [];
  generation: number = 0;
  currentIndividualIndex: number = 0;
  accepted: number = 0;
  totalFitness: number = 0;

  bestIndividual: Individual | null = null;
  bestFitness: number = -Infinity;

  mutationProbability: number = 0.25 // % chance


  constructor(populationSize: number, networkArch: NetworkArchitecture) {
    for (let i = 0; i < populationSize; i++) {
      this.population.push({ network: new NeuralNetwork(networkArch), fitness: 0 });
    }
  }

  initializeTraining() {
    const initialIndividual = this.population[0];

    this.bestIndividual = initialIndividual;
    this.bestFitness = -Infinity;

    return this.createCandidate(initialIndividual);
  }

  calculateFitness(individual: Individual, stats: any) {
    if (stats.hitObjectBall) {
      individual.fitness += 2;
    }
    if (stats.cueBallPocketed) {
      individual.fitness -= 7;
    }
    if (stats.objectBallsPocketed) {
      for (let i = 0; i < stats.objectBallsPocketed; i++) {
        individual.fitness += 10 + (5 * i);
      }
    }
    if (!stats.hitObjectBall && !stats.cueBallPocketed && !stats.objectBallsPocketed) {
      individual.fitness -= 2;
    }
    return individual.fitness;
  }

  resetFitness(individual: Individual) {
    individual.fitness = 0;
  }

  getCurrentIndividual() {
    return this.population[this.currentIndividualIndex];
  }

  iterateCurrentIndividual() {
    this.currentIndividualIndex++;
  }

  setCurrentIndividual(individual: Individual) {
    this.population[this.currentIndividualIndex] = individual;
  }

  mutateValue(value: number) {
    if (Math.random() < this.mutationProbability) {
      let noise = (Math.random() * 2 * 0.05) - 0.05;
      return value + noise;
    }
    return value;
  }

  mutateWeights(weights: number[][]) {
    for (let neuron = 0; neuron < weights.length; neuron++) {
      for (let weight = 0; weight < weights[neuron].length; weight++) {
        let newWeight = this.mutateValue(weights[neuron][weight]);
        weights[neuron][weight] = newWeight;
      }
    }
  }

  mutateBiases(biases: number[]) {
    for (let bias = 0; bias < biases.length; bias++) {
      let newBias = this.mutateValue(biases[bias]);
      biases[bias] = newBias;
    }
  }

  mutateNetwork(network: NeuralNetwork) {
    this.mutateWeights(network.weightsMatrix.weights1);
    this.mutateWeights(network.weightsMatrix.weights2);
    this.mutateWeights(network.weightsMatrix.weights3);
    this.mutateBiases(network.biasesMatrix.bias1);
    this.mutateBiases(network.biasesMatrix.bias2);
    this.mutateBiases(network.biasesMatrix.bias3);
  }

  createCandidate(individual: Individual) {
    let newNetwork = individual.network.clone();
    this.mutateNetwork(newNetwork);
    return { network: newNetwork, fitness: 0 };
  }

  // by itself: hill climbing
  evaluateCandidate(candidate: Individual) {
    if (candidate.fitness > this.bestFitness) {
      this.bestIndividual = {
        network: candidate.network.clone(),
        fitness: candidate.fitness
      };
      this.bestFitness = candidate.fitness;
    }
    this.totalFitness += candidate.fitness;
  }

  // population-based neuroevolution.
  evaluateGeneration() {
    const elitePopulation = [...this.population]
      .sort((a, b) => b.fitness - a.fitness).splice(0, ELITE_COUNT);
    const newPopulation = elitePopulation.map(elite => ({ network: elite.network.clone(), fitness: 0 }));

    for (let i = 0; i < (NETWORKS - ELITE_COUNT); i++) {
      const parent = newPopulation[Math.floor(Math.random() * ELITE_COUNT)];
      newPopulation.push(this.createCandidate(parent));
    }
    this.population = newPopulation;
    this.totalFitness = 0;
    this.generation++;
  }

}