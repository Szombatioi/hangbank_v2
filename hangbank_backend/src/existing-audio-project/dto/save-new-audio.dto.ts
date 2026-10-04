export class NewAudioDetailsDto {
  transcription?: string | null;
  emotion?: string | null;
  isMasterPrompt?: boolean;
}

export class SaveNewAudioDto {
  projectId!: string;
  files!: (NewAudioDetailsDto & { audioFile: Express.Multer.File })[];
}
