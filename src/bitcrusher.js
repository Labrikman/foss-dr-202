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
export function createBitcrusher(ctx) {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const bypassGain = ctx.createGain();
  const wetGain = ctx.createGain();

  // Réduction de résolution / sample rate via WaveShaper + Biquad lissage léger
  const shaper = ctx.createWaveShaper();
  const postFilter = ctx.createBiquadFilter();
  postFilter.type = 'lowpass';
  postFilter.frequency.value = 12000;

  // Quand amount = 0 : bypass total (zéro coloration, zéro décalage)
  // Quand amount > 0 : 100% dans le chemin traité (pas de doublon dry décalé)
  bypassGain.gain.value = 1;
  wetGain.gain.value = 0;

  input.connect(bypassGain);
  bypassGain.connect(output);

  input.connect(shaper);
  shaper.connect(postFilter);
  postFilter.connect(wetGain);
  wetGain.connect(output);

  const makeCurve = (amount) => {
    const samples = 65536;
    const curve = new Float32Array(samples);
    if (amount <= 0) {
      for (let i = 0; i < samples; i++) {
        curve[i] = (i * 2) / samples - 1;
      }
      return curve;
    }
    // Quantization steps : de 64 niveaux (léger) à 4 niveaux (très lo-fi)
    const ratio = amount / 100;
    const steps = Math.max(4, Math.round(64 - ratio * 60));
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = Math.round(x * steps) / steps;
    }
    return curve;
  };

  shaper.curve = makeCurve(0);

  return {
    input,
    output,
    setAmount(amount) {
      const clamped = Math.min(100, Math.max(0, Number(amount) || 0));
      const now = ctx.currentTime;
      if (clamped === 0) {
        bypassGain.gain.setTargetAtTime(1, now, 0.01);
        wetGain.gain.setTargetAtTime(0, now, 0.01);
      } else {
        bypassGain.gain.setTargetAtTime(0, now, 0.01);
        wetGain.gain.setTargetAtTime(1, now, 0.01);
        shaper.curve = makeCurve(clamped);
        postFilter.frequency.setTargetAtTime(
          14000 - (clamped / 100) * 10500,
          now,
          0.02
        );
      }
    },
  };
}

