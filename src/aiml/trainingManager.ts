import * as gameState from './gameState'
import * as inputEncoder from './inputEncoder'
import { MAX_SHOTS, SimulationState } from "../config";
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
    this.visualize = this.simulations[1];
  }

  updateTraining(): void {
    for (let i = 0; i < this.simulations.length; i++) {
      if (this.simulations[i].state === SimulationState.READY) {
        this.trainingStep(i);
      }
    }
  }

  trainingStep(index: number) {
    console.log(index)
    const individual = this.evolution.population[index];
    const prediction = this.getPrediction(individual, this.simulations[index])
    if (this.shots[index] !== 0) {
      this.evolution.calculateFitness(individual, this.simulations[index].shotStats);
    }
    if (this.shots[index] >= MAX_SHOTS) {
      this.finishEvaluation(individual, index);
      return;
    }

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

  finishEvaluation(individual: Individual, index: number) {
    this.finished[index] = true;
    const allFinished = this.finished.every(value => value === true);
    if (allFinished) {
    this.evolution.evaluateCandidate(individual);
    
    console.log(this.finished)
    
      this.finished.fill(false);
      this.shots.fill(0);
      console.log(this.finished);

      console.log("Generation:", this.evolution.generation);
      console.log("Candidate fitness:", individual.fitness);
      console.log("Best fitness:", this.evolution.bestFitness);
      console.log("Accepted: " + this.evolution.accepted + " ~~~ Average: ", (this.evolution.totalFitness / this.evolution.generation));
      console.log("================================");
      // this.evolution.evaluateGeneration();
      this.simulations.forEach(sim => sim.resetSimulation());
    }
    // this.evolution.iterateCurrentIndividual();
    // console.log(this.evolution.currentIndividualIndex)



    // const nextCandidate = this.evolution.createCandidate(this.evolution.bestIndividual!);

    // this.evolution.setCurrentIndividual(nextCandidate);
  }
}