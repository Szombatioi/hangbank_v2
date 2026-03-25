export interface QualityMeasure {
    name: string; //This is a translatable name for the quality issue e.g. "quality_quietness", "quality_loudness", "quality_noise" (you can use i18 translate with this key)
    // value: number;
    // threshold: number;
    result: boolean; //true if the quality issue is present, false otherwise
    message: string; //A translatable message
    messageEnding?: string; //Extra information (e.g. 0.50-0.90) that can be added to the end of the message
}

//The main interface for the audio quality check
export interface AudioQualityCheckerStrategy {
  checkQuality(wav: WavDecodeResult): Promise<QualityMeasure>;
}

export interface AudioQualityChecker {
    // strategies: AudioQualityCheckerStrategy[];
    checkAudioQuality(audioFile: Express.Multer.File): Promise<QualityMeasure[]>;
}

export interface WavDecodeResult {
  sampleRate: number;      // pl. 44100
  channelData: Float32Array[]; // Csatornák tömbje (0: bal/mono, 1: jobb)
}