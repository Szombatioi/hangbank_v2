import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CorpusBasedProject } from './entities/corpus-based-project.entity';
import { Speaker } from './entities/speaker.entity';
import { Gender } from './entities/gender.enum';
import { Repository } from 'typeorm';
import { CreateCorpusProjectDto } from './dto/create-corpus-project.dto';
import { AuthService } from 'src/auth/auth.service';
import { CorpusService } from 'src/corpus/corpus.service';
import { ProjectRoleService } from './project-role.service';
import { ProjectRoleType } from './entities/project-role.enum';
import type { IJwtPayload } from '@hangbank/shared';

function computeAge(birthDate: string | Date): number {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(CorpusBasedProject) private readonly corpusBasedProjectRepository: Repository<CorpusBasedProject>,
    @InjectRepository(Speaker) private readonly speakerRepository: Repository<Speaker>,
    @Inject() private readonly authService: AuthService,
    @Inject() private readonly corpusService: CorpusService,
    @Inject() private readonly projectRoleService: ProjectRoleService,
  ) {}

  //TODO: handle project roles from DTO parameters (who owns it, who can record (if multi-person recording), who can work with it by e.g. exporting it)
  async create(requester: IJwtPayload, data: CreateCorpusProjectDto) {
    try {
      const user = await this.authService.getProfile(requester.id);
      const corpus = await this.corpusService.findOne(data.corpusId);

      const project = await this.corpusBasedProjectRepository.save(
        this.corpusBasedProjectRepository.create({
          name: data.projectName,
          description: data.description ?? '',
          samplingRate: data.samplingRate,
          corpus,
          roles: [],
        })
      );

      //Add speaker (the creator & requester)
      await this.speakerRepository.save(
        this.speakerRepository.create({
          userId: requester.id,
          actualAge: user.birthDate ? computeAge(user.birthDate) : 0,
          characteristics: data.speaker.speechCharacteristics
            ? [data.speaker.speechCharacteristics]
            : [],
          gender: (user.gender as Gender) ?? Gender.PREFER_NOT_TO_SAY,
          microphoneDeviceId: data.microphoneDeviceId,
          project,
        })
      );

      //TODO: add role creation here for the provided people
      //Create Owner role for requester user
      await this.projectRoleService.create(requester.id, project.id, ProjectRoleType.OWNER);
      
      return project;
    } catch (ex) {
      throw ex;
    }
  }
}
