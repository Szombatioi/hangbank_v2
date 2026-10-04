export class UpdateExistingAudioDto {
  projectId!: string;
  files!: {
    id: string;
    transcription?: string;
    emotion?: string | null;
    isMasterPrompt?: boolean;
  }[];
}
