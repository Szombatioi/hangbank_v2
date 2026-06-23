// import { AudioQualityCheckerStrategy, QualityMeasure } from './audio_quality_checker';

// export class LoudnessCheck implements AudioQualityCheckerStrategy {
//     private readonly tooLoudThreshold: number
//     constructor() {
//         this.tooLoudThreshold = process.env.LOUDNESS_THRESHOLD ? parseFloat(process.env.LOUDNESS_THRESHOLD) : 0.9;
//     }

//     checkQuality(samples: number[][]): QualityMeasure {
//         //Calculate RMS for the first channel
//         const flatSamples = samples[0];
//         const rms = Math.sqrt(flatSamples.reduce((acc, val) => acc + val * val, 0) / flatSamples.length);

//         const tooLoud = rms > this.tooLoudThreshold;
//         return {
//             name: "quality_loudness",
//             value: rms,
//             threshold: this.tooLoudThreshold,
//             result: tooLoud
//         };
//     }
// }
