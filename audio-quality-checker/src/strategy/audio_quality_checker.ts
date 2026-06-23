export interface QualityMeasure {
    name: string;
    displayName: string;
    values: number[];
    ranges: {
        min: number;
        max: number | null; //null, since e.g. SpeakerCheck has no upper limit for "Same" and "Different" speaker
        displayName: string;
    }[]; 
}

//The main interface for the audio quality check
export interface AudioQualityCheckerStrategy {
  readonly requiredWavCount: number;
  checkQuality(master: WavDecodeResult, wav: WavDecodeResult): Promise<QualityMeasure>;
}

// The quality results for a single audio file, tagged with its id so the caller
// knows which audio the measures belong to.
export interface AudioFileQuality {
  audioFileId: string;
  measures: QualityMeasure[];
}

export interface AudioQualityChecker {
    // strategies: AudioQualityCheckerStrategy[];
    checkAudioQuality(
      masterFile: Express.Multer.File,
      additionalWavs: Express.Multer.File[],
      ids: string[],
    ): Promise<AudioFileQuality[]>;
}

export interface WavDecodeResult {
  sampleRate: number;      // pl. 44100
  channelData: Float32Array[]; // Csatornák tömbje (0: bal/mono, 1: jobb)
}