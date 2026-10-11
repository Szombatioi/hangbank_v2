import { SaveNewProjectBaseDTO } from 'src/project/dto/save-new-project-base.dto';
import { ProjectRoleType } from 'src/project/entities/project-role.enum';

export class SaveExistingAudioProjectDto extends SaveNewProjectBaseDTO {
  samplingRate?: number | null; // only when the sampling rate must be unified
}
