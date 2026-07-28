export interface CreateAudioFileDto{
    blob: Blob;
    name: string;
    durationSeconds: number; //The duration of the file
    transcription: string; //The actual transcription of the recording
    projectId: string;
}