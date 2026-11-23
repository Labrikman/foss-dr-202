/**
 * Small browser-side bitcrusher for the DR-202 output chain.
 *
 * The amount control is a wet/dry control: 0 is an exact dry bypass and
 * 100 is fully processed. As the amount rises, the wet signal also becomes
 * more degraded (lower effective sample rate and bit depth).
 *
 * Connect source -> input, then output -> the next node in the audio chain.
 * Call setAmount(0..100) whenever the UI knob changes.
 */
export function createBitcrusher(context, { bufferSize = 4096 } = {}) {
  const input = context.createGain();
  const output = context.createGain();
  const dryGain = context.createGain();
  const wetGain = context.createGain();
  const crusher = context.createScriptProcessor(bufferSize, 2, 2);

  let amount = 0;
  let held = [0, 0];
  let phase = [0, 0];

  const clampAmount = (value) => Math.min(100, Math.max(0, Number(value) || 0));

  const updateMix = () => {
    const wet = amount / 100;
    // Equal-power crossfade makes the transition smooth while preserving
    // exact dry-only routing at 0 and wet-only routing at 100.
    dryGain.gain.setTargetAtTime(Math.cos((wet * Math.PI) / 2), context.currentTime, 0.015);
    wetGain.gain.setTargetAtTime(Math.sin((wet * Math.PI) / 2), context.currentTime, 0.015);
  };

  crusher.onaudioprocess = (event) => {
    const wet = amount / 100;
    // At 100%, hold approximately one sample out of every 24 and quantize
    // to 4 bits. At lower amounts the effect eases in continuously.
    const holdFactor = 1 + wet * 23;
    const levels = Math.pow(2, 16 - wet * 12);

    for (let channel = 0; channel < event.outputBuffer.numberOfChannels; channel += 1) {
      const source = event.inputBuffer.getChannelData(Math.min(channel, event.inputBuffer.numberOfChannels - 1));
      const destination = event.outputBuffer.getChannelData(channel);

      for (let i = 0; i < destination.length; i += 1) {
        phase[channel] += 1;
        if (phase[channel] >= holdFactor) {
          phase[channel] -= holdFactor;
          held[channel] = Math.round(source[i] * levels) / levels;
        }
        destination[i] = held[channel];
      }
    }
  };

  input.connect(dryGain);
  dryGain.connect(output);
  input.connect(crusher);
  crusher.connect(wetGain);
  wetGain.connect(output);

  updateMix();

  return {
    input,
    output,
    setAmount(value) {
      amount = clampAmount(value);
      updateMix();
    },
    dispose() {
      input.disconnect();
      dryGain.disconnect();
      crusher.disconnect();
      wetGain.disconnect();
      output.disconnect();
      crusher.onaudioprocess = null;
    },
  };
}
