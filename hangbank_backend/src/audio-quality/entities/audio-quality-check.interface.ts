// Mirrors the audio-quality-checker's QualityMeasure shape.

export interface QualityRange {
  min: number;
  max: number | null; // null when the range is open-ended (e.g. SpeakerCheck)
  displayName: string;
  isProblem?: boolean; // true when a value in this range indicates a quality problem
}

export interface QualityMeasure {
  name?: string; // e.g. "SpeakerCheck" — maps to AudioQualityType
  displayName?: string;
  values: number[];
  ranges?: QualityRange[];
}

// One audio file's quality results, as returned by the checker service.
export interface AudioFileQuality {
  audioFileId: string;
  measures: QualityMeasure[];
}
