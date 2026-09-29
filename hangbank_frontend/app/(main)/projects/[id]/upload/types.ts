export interface ProjectAudioFile {
  id: string;
  filename: string;
  type: string; // e.g. mp3
  originalSamplingRate: number; // Hz
  isMasterPrompt: boolean;
  transcription: string;
  emotion: string;
}

export interface BufferedAudioFile {
  tempId: string;
  file: File;
}

export interface UploadProjectDetails {
  speakerName: string;
  speechDialect: string;
  unifySamplingRate: boolean;
  targetSamplingRate: number | null; // Hz
}
