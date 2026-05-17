export class SpeakerDetailDto {
    id!: string;
    microphoneDeviceId?: string;
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
    createdAt!: Date;
    audioData!: string; // base64-encoded WAV
  }

  export class CorpusProjectDetailDto {
    id!: string;
    name!: string;
    description!: string;
    samplingRate?: number;
    speaker!: SpeakerDetailDto;
    blocks!: BlockDetailDto[];
    masterRecording?: MasterRecordingDto | null;
  }
