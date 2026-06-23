import { AudioQualityType } from './entities/audio-quality.entity';
import { QualityRange } from './entities/audio-quality-check.interface';

export interface AudioQualityMetadata {
  displayName: string;
  ranges: QualityRange[];
}

// Static metadata per quality-check type — display name + the value ranges with
// their labels. Kept here (not on each AudioQuality row) because it's the same for
// every audio file. Mirrors the checker strategies' QualityMeasure metadata.
export const AUDIO_QUALITY_METADATA: Record<
  AudioQualityType,
  AudioQualityMetadata
> = {
  [AudioQualityType.SpeakerCheck]: {
    displayName: 'aqc.speaker_check.name',
    ranges: [
      { min: 0, max: null, displayName: 'aqc.speaker_check.ranges.same_speaker' },
      { min: 1, max: null, displayName: 'aqc.speaker_check.ranges.different_speaker', isProblem: true },
    ],
  },
  [AudioQualityType.NoiseCheck]: {
    displayName: 'aqc.noise_check.name',
    ranges: [
      { min: 0, max: 20, displayName: 'aqc.noise_check.snr.bad', isProblem: true },
      { min: 21, max: 30, displayName: 'aqc.noise_check.snr.acceptable' },
      { min: 31, max: 99, displayName: 'aqc.noise_check.snr.excellent' },
    ],
  },
  [AudioQualityType.VolumeCheck]: {
    displayName: 'aqc.volume_check.name',
    ranges: [
      { min: -200, max: -40, displayName: 'aqc.volume_check.ranges.too_quiet', isProblem: true },
      { min: -40, max: -5, displayName: 'aqc.volume_check.ranges.acceptable' },
      { min: -5, max: 0, displayName: 'aqc.volume_check.ranges.too_loud', isProblem: true },
    ],
  },
  [AudioQualityType.TranscriptionCheck]: {
    displayName: 'aqc.transcription_check.name',
    ranges: [
      { min: 0, max: 0, displayName: 'aqc.transcription_check.ranges.mismatch', isProblem: true },
      { min: 1, max: null, displayName: 'aqc.transcription_check.ranges.match' },
    ],
  },
};
