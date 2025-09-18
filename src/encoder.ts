import type {Force} from 'wm-sim';
import type { BattleConfigExtended, DataFileExtended, FormationDefinition } from './types';

const ALLOWED_STATE = 1, DISABLED_STATE = 0;
class GameStateEncoder {
    public static encodeState(config:BattleConfigExtended, stateSize:number): Float32Array {
        const allUnits = [
            ...(config.player1.force as Force).units,
            ...(config.player1.force as Force).reinforcements,
            ...(config.player2.force as Force).units,
            ...(config.player2.force as Force).reinforcements
        ];
        const stateArray = new Float32Array(stateSize).fill(0);
        allUnits.forEach((unit, index) => {
            const unitIndex = config.data.unitIdLookup[unit];
            if (unitIndex !== undefined) {
                stateArray[index * config.data.unitCount + unitIndex] = 1;
            }
        });

        return stateArray;
    }

    public static createActionMask(data:DataFileExtended, force:Force, slots:FormationDefinition): Float32Array {
        const mask = new Float32Array(data.unitCount).fill(DISABLED_STATE);
        for (let unitId = 1; unitId <= data.unitCount; unitId++) {
            if (force.units.length < slots.units || force.reinforcements.length < slots.reinforcements) {
                const forceCount = force.units.filter(id => id === unitId).length;
                const reinforcementCount = force.reinforcements.filter(id => id === unitId).length;
                const uniqueAllowed = forceCount === 0 || !data.units[unitId].unique;
                const reinforcementAllowed = reinforcementCount === 0 || force.units.length !== data.unitCount;
                if(uniqueAllowed && reinforcementAllowed){
                    mask[unitId - 1] = ALLOWED_STATE;
                }
            }
        }
        return mask;
    }
}

export default GameStateEncoder;