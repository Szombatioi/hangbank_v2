import { Inject, Injectable } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { Language } from 'src/language/entities/language.entity';
import { Project } from 'src/project/entities/project.entity';
import { Speaker } from 'src/project/entities/speaker.entity';
import {
  OneToOne,
  Column,
  ManyToOne,
  Repository,
  EntityManager,
} from 'typeorm';
import { AiChatProject } from './entity/ai-chat-project.entity';
import { IJwtPayload } from '@hangbank/shared';
import { SaveAIChatProjectDTO } from './dto/save-ai-chat-project.dto';
import { AuthService } from 'src/auth/auth.service';
import { LanguageService } from 'src/language/language.service';
import { computeAge } from 'src/helpers/compute-age';
import { Gender } from 'src/project/entities/gender.enum';
import { ProjectRole } from 'src/project/entities/project-role.entity';
import { ProjectRoleType } from 'src/project/entities/project-role.enum';

@Injectable()
export class AiChatProjectService {
  constructor(
    // @InjectRepository(AiChatProject) private readonly aiChatProjectRepository: Repository<AiChatProject>,
    @Inject() private readonly authService: AuthService,
    @Inject() private readonly languageService: LanguageService,
    @InjectEntityManager() private readonly entityManager: EntityManager,
  ) {}

  async create(requester: IJwtPayload, dto: SaveAIChatProjectDTO) {
    const transcriptionLanguage = await this.languageService.findOne(
      dto.transcriptionLanguageCode,
    );
    const speakerProfile = await this.authService.getProfile(
      requester.id, //dto.speaker.userId
    );
    const speechCharacteristics = dto.speaker.speechCharacteristics?.trim();

    return this.entityManager.transaction(async (transaction) => {
      const project = await transaction.save(
        transaction.create(AiChatProject, {
          name: dto.projectName,
          description: dto.description?.trim() ?? '',
          samplingRate: dto.samplingRate ?? undefined,
          audioChecks: dto.audioChecks ?? [],
          transcriptionLanguage: transcriptionLanguage,
          useAutomaticTranscription: dto.useAutomaticTranscription ?? false,
        }),
      );

      await transaction.save(
        transaction.create(Speaker, {
          userId: requester.id,
          actualAge: speakerProfile.birthDate
            ? computeAge(speakerProfile.birthDate)
            : 0,
          characteristics: speechCharacteristics ? [speechCharacteristics] : [],
          gender: (speakerProfile.gender as Gender) ?? Gender.PREFER_NOT_TO_SAY,
          microphoneLabel: dto.microphoneLabel,
          project,
        }),
      );

      //Roles
      const roles = new Map<string, ProjectRoleType>([
        [requester.id, ProjectRoleType.OWNER],
      ]);

      //Add the speaker as editor, if they are NOT the creators
      if (!roles.has(speakerProfile.id)) {
        roles.set(speakerProfile.id, ProjectRoleType.EDITOR);
      }

      //Add additional members
      for (const member of dto.members ?? []) {
        if (roles.has(member.userId)) continue;
        if (!Object.values(ProjectRoleType).includes(member.role)) continue;
        roles.set(member.userId, member.role);
      }

      await transaction.insert(
        ProjectRole,
        [...roles].map(([userId, role]) => ({
          userId,
          projectId: project.id,
          role,
        })),
      );

      return project;
    });
  }
}
