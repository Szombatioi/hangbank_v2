import { ProjectRoleType } from '../entities/project-role.enum';

export class CreateCorpusProjectDto{
    projectName!: string;
    description?: string | undefined | null;
    samplingRate!: number;
    recordingEnvironment?: string | undefined | null;
    corpusId!: string;
    speaker!: {
        id: string;
        speechCharacteristics?: string | undefined | null;
    };
    microphoneLabel!: string; // full OS label used for availability matching
    audioChecks!: string[];
    members?: { userId: string; role: ProjectRoleType }[];
}