import {BattleRunner} from 'wm-sim';
import type {Force} from 'wm-sim';
import PolicyNetwork from './policyNetwork';
import ProbabilitySamplingDrafter from './drafter';
import GameStateEncoder from './encoder';
import { PLAYER_COUNT } from './consts';
import type { BattleConfigExtended, FormationDefinition, DataFileExtended } from './types';

interface TrainingExample {
  state: Float32Array;
  action: number;
  reward: number;
  nextState: Float32Array;
}
interface TrainState {
    currentPlayer:0|1;
    turnCounter:number;
};
const MEMORY_SIZE = 10000;
const PLAYER1 = 0, PLAYER2 = 1;
const WINNING_REWARD = 1, LOSING_REWARD = -1, DRAW_REWARD = 0;
class DrafterTrainer {
    public network: PolicyNetwork;
    private trainingData: TrainingExample[];
    private episodeCount: number = 0;
    private runner:BattleRunner;
    private data:DataFileExtended;
    private formation:FormationDefinition;
    private batchSize:number;

    constructor(data:DataFileExtended, formation:FormationDefinition, batchSize:number = 1) {
        const stateSize = data.unitCount * (formation.units + formation.reinforcements) * PLAYER_COUNT;
        this.network = new PolicyNetwork(stateSize, data.unitCount, batchSize);
        this.trainingData = [];
        this.runner = new BattleRunner();
        this.data = data;
        this.formation = formation;
        this.batchSize = batchSize;
    }

    public async runEpisode(epsilon:number = 0.5) {
        const config:BattleConfigExtended = {
            player1: { force: { units: [], reinforcements: [] }, power: 89.77 },
            player2: { force: { units: [], reinforcements: [] }, power: 89.77 },
            epicMode: false,
            data: this.data,
        };
        const state:TrainState = { currentPlayer: PLAYER1, turnCounter: 0 };

        const ai1 = new ProbabilitySamplingDrafter(this.network, epsilon);
        const ai2 = new ProbabilitySamplingDrafter(this.network, epsilon);
        const episodeData: TrainingExample[] = [];
        const stateSize = Object.keys(this.data.units).length * (this.formation.units + this.formation.reinforcements) * PLAYER_COUNT;
        while (this.canContinueDrafting(config, state)) {
            const currentAI = state.currentPlayer === PLAYER1 ? ai1 : ai2;
            const encodedState = GameStateEncoder.encodeState(config, stateSize).slice();
            const force = (state.currentPlayer === PLAYER1 ? config.player1.force : config.player2.force) as Force;
            const { action } = await currentAI.selectAction(config, force, this.formation);

            this.applyAction(config, state, action);

            episodeData.push({
                state: encodedState,
                action,
                reward: 0,
                nextState: GameStateEncoder.encodeState(config, stateSize)
            });

            state.currentPlayer = state.currentPlayer === PLAYER1 ? PLAYER2 : PLAYER1;
            state.turnCounter++;
        }

        const battleResult = this.runner.run(config);
        episodeData.forEach((example, index) => {
            let reward = battleResult.winner === index % PLAYER_COUNT ? WINNING_REWARD
                : (battleResult.winner === null ? DRAW_REWARD : LOSING_REWARD);
            example.reward = reward;
        });

        this.trainingData.push(...episodeData);
        this.episodeCount++;
    }

    public async trainNetwork(): Promise<number> {
        if (this.trainingData.length < this.batchSize) return 0;

        const batch = this.sampleBatch(this.batchSize);
        const states = batch.map(e => e.state);
        const actions = batch.map(e => e.action);
        const rewards = batch.map(e => e.reward);

        const loss = await this.network.trainStep(states, actions, rewards);
        if (this.trainingData.length > MEMORY_SIZE) {
            this.trainingData = this.trainingData.slice(-MEMORY_SIZE/2);
        }

        return loss;
    }

    private sampleBatch(size: number): TrainingExample[] {
        const batch = [];
        for (let i = 0; i < size; i++) {
            const index = Math.floor(Math.random() * this.trainingData.length);
            batch.push(this.trainingData[index]);
        }
        return batch;
    }

    private canContinueDrafting(config:BattleConfigExtended, state:TrainState): boolean {
        const totalSlots = (this.formation.units + this.formation.reinforcements) * PLAYER_COUNT;
        const force1 = (config.player1.force as Force), force2 = (config.player2.force as Force);
        const filledSlots = force1.units.length + force1.reinforcements.length +
            force2.units.length + force2.reinforcements.length;
        return filledSlots < totalSlots && state.turnCounter < totalSlots;
    }

    private applyAction(config:BattleConfigExtended, state:TrainState, action: number): void {
        const unitId = action + 1;
        const force = (state.currentPlayer === PLAYER1 ? config.player1.force : config.player2.force) as Force;
        if (force.units.length < this.formation.units) {
            force.units.push(unitId);
        } else if (force.reinforcements.length < this.formation.reinforcements) {
            force.reinforcements.push(unitId);
        }
    }

    public dispose(): void {
        this.network.dispose();
    }
}

export default DrafterTrainer;