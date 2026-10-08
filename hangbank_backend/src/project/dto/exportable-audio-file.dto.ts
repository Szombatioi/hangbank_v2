export interface ExportableAudioFileDto {
  audioFileId: string;
  name: string;
  durationSeconds: number;
  transcription: string;
  blockIndex: number; // corpus block index, or the upload order for existing-files projects
  hasQualityProblems: boolean;
}
