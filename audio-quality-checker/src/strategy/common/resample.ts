import { WavDecodeResult } from "../audio_quality_checker";

export function resample(input: WavDecodeResult, targetSampleRate = 16000): WavDecodeResult {
  const inputRate = input.sampleRate;
  const ratio = inputRate / targetSampleRate;

  const resampledChannels = input.channelData.map((channel) => {
    const outputLength = Math.round(channel.length / ratio);
    const output = new Float32Array(outputLength);

    for (let i = 0; i < outputLength; i++) {
      // Lineáris interpoláció
      const srcIndex = i * ratio;
      const srcFloor = Math.floor(srcIndex);
      const srcCeil = Math.min(srcFloor + 1, channel.length - 1);
      const fraction = srcIndex - srcFloor;

      output[i] = channel[srcFloor] * (1 - fraction) + channel[srcCeil] * fraction;
    }

    return output;
  });

  return {
    sampleRate: targetSampleRate,
    channelData: resampledChannels, // Float32Array → 32f bit depth
  };
}