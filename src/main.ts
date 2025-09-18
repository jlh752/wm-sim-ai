import {RenderSingleBattleResult} from 'wm-sim';
import ExecutionEngine from './engine';
import DATAFILE from './datafile';

const EPISODE_COUNT = 200;
const UNIT_SLOTS = 5;
const REINFORCEMENT_SLOTS = 1;

const EPSILON = 1.0; 
const EPSILON_MIN = 0.01;
const EPSILON_DECAY = 0.995;
const EPSILON_INTERVAL = 10;

const LOG_STEPS = 10;

const engine = new ExecutionEngine({data:DATAFILE, slots:{units:UNIT_SLOTS,reinforcements:REINFORCEMENT_SLOTS}});

document.getElementById("train")?.addEventListener('click', async () => {
    const progress = document.getElementById("progress");
    progress?.setAttribute("value", `${0}`);
    progress?.setAttribute("max", `${EPISODE_COUNT}`);
    await engine.train(EPISODE_COUNT,
        {start: EPSILON, min: EPSILON_MIN, decay: EPSILON_DECAY, decayInterval:EPSILON_INTERVAL},
        (episode:number) => {
            progress?.setAttribute("value", `${episode}`);
            if(episode % LOG_STEPS === 0)
                console.log(`Episode trained: ${episode}`);
        }
    );
});

document.getElementById("run")?.addEventListener('click', async () => {console.log(DATAFILE)
    const result = await engine.run((player,unitIndex) => {
        console.log(`Player ${player} selects: ${unitIndex !== null ? DATAFILE.units[DATAFILE.unitIdLookup[unitIndex]].name : 'PASS'}`);
    });
    const output = RenderSingleBattleResult(result, DATAFILE);
    document.getElementById("log")!.innerHTML = "";
    document.getElementById("log")!.appendChild(output);
    console.log(result);
    console.log(engine.cfg);
});

document.getElementById("save")?.addEventListener('click', async () => {
    const filename = prompt("Filename", 'my-model');
    if(filename) await engine.save(filename);
});

document.getElementById("load")?.addEventListener('click', async () => {
    const filename = prompt("Filename", 'my-model');
    if(filename) await engine.load(filename);
});

document.getElementById("download")?.addEventListener('click', async () => {
    const filename = prompt("Filename", 'my-model');
    if(filename) await engine.download(filename);
});