import type {DataFile, BattleConfig} from 'wm-sim';

interface DataFileExtended extends DataFile {
    unitCount:number;
    unitIdLookup:Record<number,number>//index to id
    unitIndexLookup:Record<number,number>//id to index
}

interface BattleConfigExtended extends BattleConfig {
    data:DataFileExtended;
}

interface TrainState {
    currentPlayer:0|1;
    turnCounter:number;
}

interface FormationDefinition {
    units:number;
    reinforcements:number;
}

export type {FormationDefinition, TrainState, BattleConfigExtended, DataFileExtended};