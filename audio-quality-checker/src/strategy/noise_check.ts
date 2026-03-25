import { AudioQualityCheckerStrategy, QualityMeasure, WavDecodeResult } from './audio_quality_checker';
import { runVad } from './common/vad';

export class NoiseCheck implements AudioQualityCheckerStrategy {


    async checkQuality(wav: WavDecodeResult): Promise<QualityMeasure> {
        const segments = await runVad(wav);
        const speechSegs = segments.filter(s => s.isSpeech && s.rmsDb !== undefined);
        const silenceSegs = segments.filter(s => !s.isSpeech && s.rmsDb !== undefined);

        for (const seg of segments) {
            console.log(`${seg.isSpeech ? "BESZÉD" : "Csend"}\n\tRMS: ${seg.rms?.toFixed(4)} \n\tRMS dB: ${seg.rmsDb?.toFixed(4)}`)
        }

        if (speechSegs.length === 0 || silenceSegs.length === 0) {
            //TODO
        }

        //Weighted average of dB -> longer segments have more weight
        const weightedAvgDb = (segs: AudioSegment[]): number => {
            const totalMs = segs.reduce((sum, s) => sum + (s.endMs - s.startMs), 0);
            return segs.reduce((sum, s) => {
                const weight = (s.endMs - s.startMs) / totalMs;
                return sum + (s.rmsDb ?? 0) * weight;
            }, 0);
        };

        const speechDb = weightedAvgDb(speechSegs);
        const silenceDb = weightedAvgDb(silenceSegs);
        const snr = speechDb - silenceDb; //Signal-to-noise ratio in dB

        // SNR → 0-100 score
        // < 10 dB: bad, > 40 dB: excellent
        const score = Math.round(
            Math.min(100, Math.max(0, (snr - 10) / 30 * 100))
        );

        console.log("Zajszint: ", snr.toFixed(2), "dB, Pontszám: ", score.toFixed(2));
        return { //TODO
            name: "noise_check",
            result: false, //TODO
            message: "Zajszint ellenőrzés (TODO)"
        };
    }

}

//A segment of audio from the whole recording
export interface AudioSegment {
    isSpeech: boolean;
    startMs: number;
    endMs: number;
    rms?: number;
    rmsDb?: number;
}