import {train, layers, sequential, tensor2d, loadLayersModel} from '@tensorflow/tfjs';
import type { LayersModel, Tensor } from '@tensorflow/tfjs';

class PolicyNetwork {
    public model: LayersModel;
    private batchSize:number;
    private actionSize:number;
    private stateSize:number;

    constructor(stateSize:number, actionSize:number, batchSize:number = 1) {
        this.batchSize = batchSize;
        this.actionSize = actionSize;
        this.stateSize = stateSize;
        this.model = sequential({
            layers: [
                layers.dense({ inputShape: [stateSize], units: 512, activation: 'relu', kernelInitializer: 'heNormal' }),
                layers.dropout({ rate: 0.3 }),
                layers.dense({ units: 256, activation: 'relu' }),
                layers.dense({ units: actionSize, activation: 'softmax', kernelInitializer: 'glorotNormal' })
            ]
        });
        this.model.compile({
            optimizer: train.adam(0.001),
            loss: 'categoricalCrossentropy',
            metrics: ['accuracy']
        });
    }

    public predict(state: Float32Array, actionMask?: Float32Array): Tensor {
        const stateTensor = tensor2d([Array.from(state)]);
        const predictions = this.model.predict(stateTensor) as Tensor;
        if (actionMask) {
            const maskTensor = tensor2d([Array.from(actionMask)]);
            const maskedPredictions = predictions.mul(maskTensor);
            const sum = maskedPredictions.sum(1, true);
            const normalizedPredictions = maskedPredictions.div(sum.add(1e-8));

            stateTensor.dispose();
            predictions.dispose();
            maskTensor.dispose();
            sum.dispose();
            return normalizedPredictions;
        }

        stateTensor.dispose();
        return predictions;
    }

    public async trainStep(states: Float32Array[], actions: number[], rewards: number[]): Promise<number> {
        const statesTensor = tensor2d(states.map(s => Array.from(s)));
        const targets = actions.map((action, i) => {
            const oneHot = new Array(this.actionSize).fill(0);
            oneHot[action] = rewards[i];
            return oneHot;
        });

        const targetsTensor = tensor2d(targets);
        const result = await this.model.fit(statesTensor, targetsTensor, {
            epochs: 1,
            verbose: 0,
            batchSize: Math.min(this.batchSize, states.length)
        });
        statesTensor.dispose();
        targetsTensor.dispose();
        return Array.isArray(result.history.loss) ? result.history.loss[0] as number : result.history.loss as number;
    }

    public async save(path: string): Promise<void> {
        await this.model.save(path);
    }

    public async load(path: string): Promise<PolicyNetwork> {
        const network = new PolicyNetwork(this.stateSize, this.actionSize, this.batchSize);
        network.model = await loadLayersModel(path);
        return network;
    }

    public dispose(): void {
        this.model.dispose();
    }
}

export default PolicyNetwork;