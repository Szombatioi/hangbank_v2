import { AudioQualityCheckerStrategy, QualityMeasure } from './audio_quality_checker';

export class QuietnessCheck implements AudioQualityCheckerStrategy {
    private readonly tooQuietThreshold: number
    constructor() {
        this.tooQuietThreshold = process.env.QUIETNESS_THRESHOLD ? parseFloat(process.env.QUIETNESS_THRESHOLD) : 0.01;
    }

    checkQuality(samples: number[][]): QualityMeasure {
        //Calculate RMS for the first channel
        const flatSamples = samples[0];
        const rms = Math.sqrt(flatSamples.reduce((acc, val) => acc + val * val, 0) / flatSamples.length);

        const tooQuiet = rms < this.tooQuietThreshold;
        return {
            name: "quality_quietness",
            value: rms,
            threshold: this.tooQuietThreshold,
            result: tooQuiet
        };
    }
}
