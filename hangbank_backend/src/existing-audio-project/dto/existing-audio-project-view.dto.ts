export interface ExistingAudioFileView {
  id: string;
  filename: string;
  type: string;
  originalSamplingRate: number | null;
  isMasterPrompt: boolean;
  transcription: string;
  emotion: string;
  audioQualities: { id: string; type: string; values: number[] }[];
}

export interface ExistingAudioProjectView {
  id: string;
  name: string;
  description: string;
  details: {
    speakerName: string;
    speechDialect: string;
    unifySamplingRate: boolean;
    targetSamplingRate: number | null; // Hz
    transcriptionLanguage: string | null; // translatable language name
    useAutomaticTranscription: boolean;
  };
  files: ExistingAudioFileView[];
}
