import { SaveNewProjectBaseDTO } from 'src/project/dto/save-new-project-base.dto';
import { ProjectRoleType } from 'src/project/entities/project-role.enum';

export class SaveAIChatProjectDTO extends SaveNewProjectBaseDTO {
    samplingRate!: number;
    microphoneLabel!: string;
}
