import { createBitcrusher } from './bitcrusher.js';

const effectsByContext = new WeakMap();
let amount = 0;
let originalConnect = null;

export function setBitcrusherAmount(nextAmount) {
  amount = Math.min(100, Math.max(0, Number(nextAmount) || 0));
  effectsByContext.forEach((effect) => effect.setAmount(amount));
}

export function installBitcrusherRuntime() {
  if (typeof window === 'undefined' || originalConnect) return;

  originalConnect = AudioNode.prototype.connect;

  AudioNode.prototype.connect = function connectToDestination(destination, ...args) {
    const isDestination =
      typeof AudioDestinationNode !== 'undefined' &&
      destination instanceof AudioDestinationNode;

    if (!isDestination) {
      return originalConnect.call(this, destination, ...args);
    }

    const context = this.context;
    let effect = effectsByContext.get(context);

    if (!effect) {
      effect = createBitcrusher(context);
      effect.setAmount(amount);
      effectsByContext.set(context, effect);
    }

    // Avoid intercepting the effect's own connection back to the speaker.
    if (this !== effect.output) {
      originalConnect.call(this, effect.input);
      originalConnect.call(effect.output, destination);
      return destination;
    }

    return originalConnect.call(this, destination, ...args);
  };

  window.__DR202_BITCRUSHER__ = { setAmount: setBitcrusherAmount };
}
