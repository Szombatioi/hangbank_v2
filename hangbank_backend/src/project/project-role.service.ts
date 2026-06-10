import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectRole } from './entities/project-role.entity';
import { ProjectRoleType } from './entities/project-role.enum';

@Injectable()
export class ProjectRoleService {
  constructor(
    @InjectRepository(ProjectRole) private readonly projectRoleRepository: Repository<ProjectRole>,
  ) {}

  async assignToRole(userId: string, projectId: string, role: ProjectRoleType): Promise<ProjectRole> {
    return this.projectRoleRepository.save(
      this.projectRoleRepository.create({ userId, projectId, role }),
    );
  }

  async getRolesForProject(projectId: string): Promise<ProjectRole[]> {
    return this.projectRoleRepository.find({ where: { projectId } });
  }

  async revokeRoleForProject(userId: string, projectId: string): Promise<void> {
    const role = await this.projectRoleRepository.findOne({ where: { userId, projectId } });
    if (!role) {
      throw new NotFoundException(`No role found for user '${userId}' on project '${projectId}'`);
    }
    await this.projectRoleRepository.remove(role);
  }
}
