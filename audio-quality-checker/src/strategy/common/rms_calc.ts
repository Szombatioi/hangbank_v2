export function calcRms(samples: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    sum += (samples[i] ?? 0) ** 2;
  }
  return Math.sqrt(sum / samples.length);
}

export function rmsToDb(rms: number): number {
  return 20 * Math.log10(Math.max(rms, 1e-10)); // -∞ elkerülése
}