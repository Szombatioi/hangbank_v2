export interface RecordingBlockDto {
    id: string;
    blockIndex: number;
    isRecorded: boolean;
    text?: string;
    audioFile?: {
        id: string;
        s3Link: string;
        transcription: string;
    };
}

export interface BufferedRecording {
    blob?: Blob; // null until recording is finished
    blockId: string;
    blockIndex: number;
    durationSeconds: number;
    transcription: string;
}
