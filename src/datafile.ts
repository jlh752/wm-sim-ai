import type { DataFileExtended } from "./types";

const units = {
    "1": {"name": "healer","type": 1,"sub_type":1,"attack": 38,"defense": 34,"level": 40,"skills": [{"skill_id": 1,"chance": 1}]},
    "2": {"name": "antihealer","type": 1,"sub_type":1,"attack": 38,"defense": 34,"level": 40,"skills": [{"skill_id": 2,"chance": 1}]},
    "3": {"name": "damager","type": 1,"sub_type":1,"attack": 38,"defense": 34,"level": 40,"skills": [{"skill_id": 3,"chance": 1}]},
    "4": {"name": "bigdamager","type": 1,"sub_type":1,"attack": 38,"defense": 34,"level": 40,"unique":true,"skills": [{"skill_id": 4,"chance": 1}]},
};
const DATAFILE = {
    units: units,
    skills: {
        "1":{"name":"HEAL","heal":20},
        "2":{"name":"ANTI","antiheal":32,"dmg":2},
        "3":{"name":"DMG","damage":10},
        "4":{"name":"BIGDMG","damage":50},
    },
    types:{
    1   : {name:"Assault"}
    },
    subtypes: {
        1: {name:"Robotic"}
    },
    unitCount:Object.keys(units).length,
    unitIdLookup: Object.keys(units).map(k => typeof k === 'number' ? k : parseInt(k))
        .reduce<Record<number,number>>((map, unitId, index) => {map[index] = unitId; return map;}, {}),
    unitIndexLookup: Object.keys(units).map(k => typeof k === 'number' ? k : parseInt(k))
        .reduce<Record<number,number>>((map, unitId, index) => {map[unitId] = index; return map;}, {})
} as DataFileExtended;
export default DATAFILE;