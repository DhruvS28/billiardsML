import * as gameState from './gameState'
import * as inputEncoder from './inputEncoder'
import { MAX_SHOTS, NETWORKS, SimulationState } from "../config";
import { Simulation } from "../simulation";
import { Controller } from "./controller";
import { Evolution } from "./evolution";
import type { Individual } from '../interfaces';


export class TrainingManager {

  evolution!: Evolution;
  simulations: Simulation[] = [];
  controllers: Controller[] = [];

  visualize!: Simulation;

  shots: number[] = [];
  finished: boolean[] = [];
  pauseUntil: number = 0;

  constructor(evolution: Evolution) {
    this.evolution = evolution;
    for (let i = 0; i < this.evolution.population.length; i++) {
      this.simulations.push(new Simulation());
      this.controllers.push(new Controller(this.simulations[i]));
      
      this.shots.push(0);
      this.finished.push(false);
    }
    this.visualize = this.simulations[0];
  }

  updateTraining(): void {
    for (let i = 0; i < this.simulations.length; i++) {
      if (this.finished[i]) continue;

      const simulation = this.simulations[i];
      if (simulation.state === SimulationState.COMPLETE) {
        if (this.shots[i] !== 0) {
          const individual = this.evolution.population[i];
          this.evolution.calculateFitness(individual, simulation.shotStats);

          if (this.shots[i] >= MAX_SHOTS) {
            this.finishEvaluation(i);
          } else {
            simulation.state = SimulationState.READY;
          }
        } else {
          simulation.state = SimulationState.READY;
        }
        continue;
      }

      if (simulation.state === SimulationState.READY) this.trainingStep(i);
    }
  }

  trainingStep(index: number) {
    const individual = this.evolution.population[index];
    const prediction = this.getPrediction(individual, this.simulations[index]);
    this.executeShot(prediction, index);
  }

  getPrediction(individual: Individual, simulation: Simulation) {
    const state = gameState.captureGameState(simulation);
    const encodedState = inputEncoder.encodeGameState(state);
    const prediction = individual.network.predict(encodedState);
    return prediction;
  }

  executeShot(prediction: number[], index: number) {
    // Pause so AI doesn't immediately fire if cueBall was pocketed, only for visual
    if (this.simulations[index].shotStats.cueBallPocketed) {
      this.pauseUntil = Date.now() + 0;
    }
    this.shots[index]++;
    this.controllers[index].execute(prediction);
  }

  finishEvaluation(index: number) {
    this.finished[index] = true;
    const allFinished = this.finished.every(value => value === true);
    if (allFinished) {
      this.evolution.population.forEach(candidate => this.evolution.evaluateCandidate(candidate));
    
      console.log("Generation: ", this.evolution.generation + 1);
      console.log("Generation fitness: ", this.evolution.totalFitness / NETWORKS);
      console.log("Best fitness: ", this.evolution.bestFitness);
      // console.log("Accepted: " + this.evolution.accepted + " ~~~ Average: ", (this.evolution.totalFitness / NETWORKS));
      console.log("================================");

      this.evolution.evaluateGeneration();
      this.finished.fill(false);
      this.shots.fill(0);
      this.simulations.forEach(simulation => simulation.resetSimulation());
      this.visualize = this.simulations[0];
    }
  }
}