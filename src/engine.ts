import {BattleRunner} from 'wm-sim';
import type {Force, BattleResult} from 'wm-sim';
import {loadLayersModel} from '@tensorflow/tfjs';
import {PLAYER1, PLAYER2, PLAYER_COUNT} from './consts';
import DATAFILE from './datafile';
import DrafterTrainer from './trainer';
import ProbabilitySamplingDrafter from './drafter';
import type {FormationDefinition, DataFileExtended, BattleConfigExtended, TrainState} from './types';

interface EngineParams {
    data:DataFileExtended;
    slots:FormationDefinition
}

interface EpsilonConfiguration {
    start:number;
    min:number;
    decay:number;
    decayInterval:number;
}

const BATCH_SIZE = 16;
export default class ExecutionEngine {
    public state: TrainState = {turnCounter: 0, currentPlayer: 0};
    private trainer: DrafterTrainer;
    public cfg: BattleConfigExtended = {
        player1: { force: { units: [], reinforcements: [] }, power: 89.77 },
        player2: { force: { units: [], reinforcements: [] }, power: 89.77 },
        epicMode: false,
        data: DATAFILE
    };
    private PASS_ID:number = 0;
    private formation:FormationDefinition;

    constructor(params:EngineParams){
        this.trainer = new DrafterTrainer(params.data, params.slots, BATCH_SIZE);
        this.cfg.data = params.data;
        this.PASS_ID = Object.keys(params.data.units).length;
        this.formation = params.slots;
    }

    public async train(episodes: number = 100, epsilonConfig:EpsilonConfiguration, onTrain?:(episode:number)=>void) {
        let epsilon = epsilonConfig.start;
        for (let episode = 0; episode < episodes; episode++) {
            await this.trainer.runEpisode();
            if (episode >= BATCH_SIZE) {
                await this.trainer.trainNetwork();
                onTrain?.(episode);
            }

            if (episode % epsilonConfig.decayInterval === 0 && episode > 0) {
                epsilon = epsilonConfig.min + (epsilon-epsilonConfig.min)*epsilonConfig.decay;
            }
        }
    }

    public async run(onPick?:(player:number, unitIndex:number | null)=>void): Promise<BattleResult> {
        const network = this.trainer.network;
        this.state = { currentPlayer: 0, turnCounter: 0};

        this.cfg.player1.force = {units:[], reinforcements: []};
        const ai1 = new ProbabilitySamplingDrafter(network, 0);
        this.cfg.player2.force = {units:[], reinforcements: []};
        const ai2 = new ProbabilitySamplingDrafter(network, 0);

        while (this.canContinueDrafting()) {
            const currentAI = this.state.currentPlayer === PLAYER1 ? ai1 : ai2;
            const force = (this.state.currentPlayer === PLAYER1 ? this.cfg.player1.force : this.cfg.player2.force) as Force;
            const { action } = await currentAI.selectAction(this.cfg, force, this.formation);

            this.applyAction(action);

            onPick?.(this.state.currentPlayer + 1, action === this.PASS_ID ? null : action);

            this.state.currentPlayer = this.state.currentPlayer === PLAYER1 ? PLAYER2 : PLAYER1;
            this.state.turnCounter++;

        }

        return (new BattleRunner()).run(this.cfg);
    }

    private canContinueDrafting(): boolean {
        const totalSlots = (this.formation.units + this.formation.reinforcements) * PLAYER_COUNT;
        const filledSlots = (this.cfg.player1.force as Force).units.length + (this.cfg.player1.force as Force).reinforcements.length +
            (this.cfg.player2.force as Force).units.length + (this.cfg.player2.force as Force).reinforcements.length;
        return filledSlots < totalSlots && this.state.turnCounter < totalSlots;
    }

    private applyAction(action: number): void {
        if (action === this.PASS_ID) return;

        const unitId = action + 1;
        const currentForce = this.state.currentPlayer === 0 ? (this.cfg.player1.force as Force).units: (this.cfg.player2.force as Force).units;
        const currentReinforcements = this.state.currentPlayer === 0 ? (this.cfg.player1.force as Force).reinforcements: (this.cfg.player2.force as Force).reinforcements;

        if (currentForce.length < this.formation.units) {
            currentForce.push(unitId);
        } else if (currentReinforcements.length < this.formation.reinforcements) {
            currentReinforcements.push(unitId);
        }
    }
  
    public async save(filename:string) {
        await this.trainer.network.model.save(`localstorage://${filename}`);
    }
    public async load(filename:string) {
        this.trainer.network.model = await loadLayersModel(`localstorage://${filename}`);
    }
    public async download(filename:string) {
        await this.trainer.network.model.save(`download://${filename}`);
    }
}

export type {EngineParams, EpsilonConfiguration};