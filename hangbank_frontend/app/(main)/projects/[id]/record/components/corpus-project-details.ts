export class SpeakerDetailDto {
    id!: string;
    microphoneLabel?: string;
  }

  export class BlockDetailDto {
    id!: string;
    blockIndex!: number;
    isRecorded!: boolean;
    audioData?: string; // base64-encoded WAV
  }

  export class MasterRecordingDto {
    id!: string;
    name!: string;
    createdAt!: string;
    audioData!: string; // base64-encoded WAV
  }

  export class CorpusProjectDetailDto {
    id!: string;
    name!: string;
    description!: string;
    samplingRate?: number;
    languageCode?: string; // BCP-47, e.g. "en-US" — used for live transcription
    speaker!: SpeakerDetailDto;
    blocks!: BlockDetailDto[];
    masterRecording?: MasterRecordingDto | null;
  }
  