import { SetMetadata } from '@nestjs/common';
import { ProjectRoleType } from 'src/project/entities/project-role.enum';

export const REQUIRED_PROJECT_ROLE = 'requiredProjectRole';

export const RequireProjectRole = (role: ProjectRoleType) =>
  SetMetadata(REQUIRED_PROJECT_ROLE, role);
