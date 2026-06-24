import { AudioQualityCheckerStrategy, QualityMeasure, WavDecodeResult } from './audio_quality_checker';
import { runVad } from './common/vad';
import { AudioSegment } from './noise_check';

export class VolumeCheck implements AudioQualityCheckerStrategy {
    readonly requiredWavCount = 1;

    private readonly windowMs: number;
    private readonly overlapMs: number;
    private readonly stepMs: number;

    private readonly tooQuietThreshold: number; //in dBFS, e.g. -40 dBFS
    private readonly tooLoudThreshold: number; //in dBFS, e.g. -5 dBFS

    constructor() {
        this.windowMs = process.env.VOLUME_CHECK_WINDOW_MS ? parseInt(process.env.VOLUME_CHECK_WINDOW_MS) : 200; // Default to 200ms windows
        this.overlapMs = process.env.VOLUME_CHECK_OVERLAP_MS ? parseInt(process.env.VOLUME_CHECK_OVERLAP_MS) : 100; // Default to 100ms overlap
        this.stepMs = this.windowMs - this.overlapMs;

        this.tooQuietThreshold = process.env.VOLUME_CHECK_TOO_QUIET_THRESHOLD ? parseFloat(process.env.VOLUME_CHECK_TOO_QUIET_THRESHOLD) : -40;
        this.tooLoudThreshold = process.env.VOLUME_CHECK_TOO_LOUD_THRESHOLD ? parseFloat(process.env.VOLUME_CHECK_TOO_LOUD_THRESHOLD) : -5;
    }

    async checkQuality(_master: WavDecodeResult, wav: WavDecodeResult): Promise<QualityMeasure> {
        const samples = wav.channelData[0]; //Mono only

        // Run a VAD first and only measure the speaking segments. Silence — including
        // the pauses between words — is excluded here, since measuring it would read
        // as "Too quiet" and drag the volume judgement down. An overall-silent take is
        // still flagged as too quiet via the no-speech fallback below.
        const segments = await runVad(wav);
        const speechSegments = segments.filter(s => s.isSpeech);

        const values: number[] = [];

        // No speech at all → the take is effectively silent. Report the overall level
        // (an honest measurement) which the ranges below classify as "Too quiet".
        if (speechSegments.length === 0) {
            console.log("VolumeCheck: nem található beszéd, a teljes felvétel csendnek számít.");
            values.push(this.overallDbfs(samples));
            return this.buildMeasure(values);
        }

        //Window size (in samples)
        const windowSize = Math.floor(wav.sampleRate * (this.windowMs / 1000));
        const stepSize = Math.floor(wav.sampleRate * (this.stepMs / 1000));

        let measured = 0;
        let skipped = 0;

        //Sliding window with overlap — only over the speech segments
        for (let i = 0; i + windowSize <= samples.length; i += stepSize) {
            const end = i + windowSize; //End of window

            // Use the window's midpoint (in ms) to decide if it sits inside speech.
            // Avoids boundary windows that are mostly silence.
            const midMs = ((i + windowSize / 2) / wav.sampleRate) * 1000;
            if (!isSpeechAtMs(midMs, speechSegments)) {
                skipped++;
                continue;
            }

            const windowSlice = samples.subarray(i, end); //Current window of samples

            // Root Mean Square: square root of the average of the squared sample values
            const rms = Math.sqrt(windowSlice.reduce((acc, val) => acc + val * val, 0) / windowSlice.length);

            // Converting RMS to dBFS
            const dbfs = 20 * Math.log10(Math.max(rms, 1e-10)); // Avoid log of zero
            values.push(dbfs);
            measured++;
        }

        console.log(`VolumeCheck: ${measured} beszéd-ablak mérve, ${skipped} csend-ablak kihagyva.`);

        // Speech detected, but no full window fit inside a segment (very short
        // utterances) → measure the speech samples directly so we still emit a value
        // that reflects the speech level (not the surrounding silence).
        if (values.length === 0) {
            values.push(this.speechDbfs(samples, wav.sampleRate, speechSegments));
        }

        return this.buildMeasure(values);
    }

    // RMS level (dBFS) over only the samples inside the given speech segments.
    private speechDbfs(samples: Float32Array, sampleRate: number, speechSegments: AudioSegment[]): number {
        let sum = 0;
        let count = 0;
        for (const seg of speechSegments) {
            const start = Math.max(0, Math.floor((seg.startMs / 1000) * sampleRate));
            const end = Math.min(samples.length, Math.ceil((seg.endMs / 1000) * sampleRate));
            for (let i = start; i < end; i++) {
                sum += samples[i] * samples[i];
                count++;
            }
        }
        if (count === 0) return this.overallDbfs(samples);
        const rms = Math.sqrt(sum / count);
        return 20 * Math.log10(Math.max(rms, 1e-10));
    }

    // Overall RMS level of the whole take in dBFS (used for the no-speech fallback).
    private overallDbfs(samples: Float32Array): number {
        if (samples.length === 0) return -100;
        let sum = 0;
        for (let i = 0; i < samples.length; i++) {
            sum += samples[i] * samples[i];
        }
        const rms = Math.sqrt(sum / samples.length);
        return 20 * Math.log10(Math.max(rms, 1e-10));
    }

    private buildMeasure(values: number[]): QualityMeasure {
        return {
            name: "VolumeCheck",
            displayName: "aqc.volume_check.name",
            values: values,
            ranges: [
                {
                    min: -200, //arbitrary low value
                    max: this.tooQuietThreshold,
                    displayName: "aqc.volume_check.ranges.too_quiet"
                },
                {
                    min: this.tooQuietThreshold,
                    max: this.tooLoudThreshold,
                    displayName: "aqc.volume_check.ranges.acceptable"
                },
                {
                    min: this.tooLoudThreshold,
                    max: 0,
                    displayName: "aqc.volume_check.ranges.too_loud"
                }
            ]
        };
    }
}

// True if the given timestamp (ms) lies within any speech segment.
function isSpeechAtMs(ms: number, speechSegments: AudioSegment[]): boolean {
    for (const seg of speechSegments) {
        if (ms >= seg.startMs && ms <= seg.endMs) return true;
    }
    return false;
}
