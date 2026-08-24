import { Injectable, CanActivate, ExecutionContext, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectEntityManager } from '@nestjs/typeorm';
import { ProjectRole } from 'src/project/entities/project-role.entity';
import { PROJECT_ROLE_PRIORITY, ProjectRoleType } from 'src/project/entities/project-role.enum';
import { EntityManager } from 'typeorm';
import { REQUIRED_PROJECT_ROLE } from './require-project-role.decorator';

@Injectable()
export class ProjectRoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectEntityManager() private readonly entityManager: EntityManager,
  ) {}

  //The method checks if the specified user has at least the required access level
  // E.g. requiring VIEW -> owner allowed
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user; //From AuthGuard

    if (!user) {
      throw new ForbiddenException('httpErrors.unauthenticated'); //TODO: translate
    }

    const required = this.reflector.getAllAndOverride<ProjectRoleType>(
      REQUIRED_PROJECT_ROLE,
      [context.getHandler(), context.getClass()],
    );

    //Misconfiguration
    if (!required) {
      throw new Error(
        'ProjectRoleGuard used without @RequireProjectRole(...) on the route',
      );
    }

    const projectId = request.params.projectId || request.params.id;
    if (!projectId) {
      throw new BadRequestException('httpErrors.missingProjectId'); //TODO: translate
    }

    const projectRole = await this.entityManager.findOne(ProjectRole, {
      where: {
        projectId: projectId,
        userId: user.id,
      },
    });

    if (!projectRole) {
      throw new ForbiddenException('httpErrors.noProjectAccess'); //TODO: translate
    }

    return PROJECT_ROLE_PRIORITY[projectRole.role] >= PROJECT_ROLE_PRIORITY[required];
  }
}
