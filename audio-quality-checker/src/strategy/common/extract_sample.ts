export function extractSamples(
  audioData: Float32Array,
  startMs: number,
  endMs: number
): Float32Array {
  const startSample = Math.round((startMs / 1000) * 16000);
  const endSample = Math.round((endMs / 1000) * 16000);
  return audioData.slice(startSample, endSample);
}