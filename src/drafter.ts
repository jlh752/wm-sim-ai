import type {Force} from 'wm-sim';
import PolicyNetwork from './policyNetwork';
import GameStateEncoder from './encoder';
import { PLAYER_COUNT } from './consts';
import type { BattleConfigExtended, FormationDefinition } from './types';

class ProbabilitySamplingDrafter {
    public network: PolicyNetwork;
    public epsilon: number;
    constructor(network: PolicyNetwork, epsilon: number = 1) {
        this.network = network;
        this.epsilon = epsilon;
    }

    public selectAction(config:BattleConfigExtended, force:Force, slots:FormationDefinition): { action: number; isExploration: boolean } {
        const encodedState = GameStateEncoder.encodeState(config, config.data.unitCount * (slots.units + slots.reinforcements) * PLAYER_COUNT);
        const actionMask = GameStateEncoder.createActionMask(config.data, force, slots);

        if (Math.random() < this.epsilon) {
            const action = this.pickRandomUnmasked(actionMask);
            return { action, isExploration: true };
        }

        const predictions = this.network.predict(encodedState, actionMask);
        const probabilities = predictions.dataSync();
        if(this.epsilon === 0)console.log(probabilities)

        let cumSum = 0;
        const rand = Math.random();
        for (let i = 0; i < config.data.unitCount; i++) {
            cumSum += probabilities[i];
            if (rand <= cumSum) {
                predictions.dispose();
                return { action: i, isExploration: false };
            }
        }

        predictions.dispose();

        const action = this.pickRandomUnmasked(actionMask);
        return { action: action, isExploration: false };
    }

    private pickRandomUnmasked(actionMask:Float32Array<ArrayBufferLike>){
        const validActions = [];
        for (let i = 0; i < actionMask.length; i++) {
            if (actionMask[i] > 0){
                validActions.push(i);
            }
        }
        return validActions[Math.floor(Math.random() * validActions.length)];
    }
}

export default ProbabilitySamplingDrafter