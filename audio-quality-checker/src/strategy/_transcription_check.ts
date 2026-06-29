// import { AudioQualityCheckerStrategy, QualityMeasure, WavDecodeResult } from './audio_quality_checker';

// export class TranscriptionCheck implements AudioQualityCheckerStrategy {
//     readonly requiredWavCount = 1;

//     async checkQuality(wavs: WavDecodeResult[], transcriptions: string[]): Promise<QualityMeasure> {


//         return {
//             name: "TranscriptionCheck",
//             displayName: "aqc.transcription_check.name",
//             values: [],
//             ranges: [
//                 {
//                     min: 0,
//                     max: null,
//                     displayName: "aqc.transcription_check.ranges.transcription_mismatch"
//                 },
//                 {
//                     min: 1,
//                     max: null,
//                     displayName: "aqc.transcription_check.ranges.matching_transcription"
//                 }
//             ]
//         };
//     }

// }