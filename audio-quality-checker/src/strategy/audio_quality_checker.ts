export interface QualityMeasure {
    name: string; //This is a translatable name for the quality issue e.g. "quality_quietness", "quality_loudness", "quality_noise" (you can use i18 translate with this key)
    value: number;
    threshold: number;
    result: boolean; //true if the quality issue is present, false otherwise
}

//The main interface for the audio quality check
export interface AudioQualityCheckerStrategy {
  checkQuality(samples: number[][]): QualityMeasure;
}

export interface AudioQualityChecker {
    // strategies: AudioQualityCheckerStrategy[];
    checkAudioQuality(audioFile: Express.Multer.File): Promise<QualityMeasure[]>;
}