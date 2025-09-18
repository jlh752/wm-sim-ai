# War Metal AI Force Drafter
**Basic Reinforcement Learning Implementation**

This repo uses reinforcement learning to train and utilise basic machine learning models capable of drafting teams for the game War Metal. Tensorflow.js is used to handle the actual machine learning. The simulation is executed using the [wm-sim](https://github.com/jlh752/wm-sim) package, please see it's repo for more info regarding War Metal battles.

[demo](http://jlh752.github.io/wm-sim-ai) *work in progress*

## Features
* **self-play strategy** - where 2 AI agents take turns picking their next unit
* **one-hot encoding** - encoding each possible unit in each possible team/force position
* **action masking** - controls the options available to the AI (e.g. you can only pick a *Unique* unit once per team)
* **exploration controls** - eplison decay for exploration during training or no-exploration for real simulations
* **buffered training** - batching training for performance with back propogation of rewards based on which team won the battle

## Improvements
* **heuristic-based encoding** - the current encoding is very inefficient training-wise. Implementing the state using heuristics (e.g. team 1 has X healing potentional and Y damage potential) would make the training process much more efficient
* **opponent AI strategies** - with a heuristic-based encoding of the state, it would be more beneficial to train against a wider variety of opponents rather than a 2nd AI utilising the same model. This speeds up training, deals with unexpected situations better, and reduces the chances of the training process optimising in an non-optimal way
* **intermediate rewards** - by only considering the final battle result in the reward structure the current strategy misses key opportunities for fine-grained training
