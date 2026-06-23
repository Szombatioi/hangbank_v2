export interface RecordingBlockDto {
    id: string;
    blockIndex: number;
    isRecorded: boolean;
    text?: string; // populated when backend provides corpus text per block
    audioFile?: {
        id: string;
        s3Link: string;
        transcription: string;
    };
}

export interface BufferedRecording {
    blob: Blob;
    blockId: string;
    blockIndex: number;
    durationSeconds: number;
    transcription: string;
}
