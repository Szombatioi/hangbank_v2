import { ProjectRoleType } from 'src/project/entities/project-role.enum';

export class SaveExistingAudioProjectDto {
  projectName!: string;
  description?: string | null;
  samplingRate?: number | null; // only when the sampling rate must be unified
  recordingEnvironment?: string | null;
  audioChecks?: string[];
  useAutomaticTranscription?: boolean;
  transcriptionLanguageCode!: string;
  speaker!: {
    userId: string;
    speechCharacteristics?: string | null;
  };
  members?: { userId: string; role: ProjectRoleType }[];
}
