export interface ProjectAudioFile {
  id: string;
  filename: string;
  type: string; // e.g. mp3
  originalSamplingRate: number | null;
  isMasterPrompt: boolean;
  transcription: string;
  emotion: string;
}

export interface BufferedAudioFile {
  tempId: string;
  file: File;
  transcription: string;
  emotion: string;
}

export interface UploadProjectDetails {
  speakerName: string;
  speechDialect: string;
  unifySamplingRate: boolean;
  targetSamplingRate: number | null; // Hz
  transcriptionLanguage: string | null;
  useAutomaticTranscription: boolean;
}

export interface UploadProjectView {
  id: string;
  name: string;
  description: string;
  details: UploadProjectDetails;
  files: ProjectAudioFile[];
}
