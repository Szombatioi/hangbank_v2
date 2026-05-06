import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CorpusBasedProject } from './entities/corpus-based-project.entity';
import { Speaker } from './entities/speaker.entity';
import { Gender } from './entities/gender.enum';
import { CorpusBlock } from 'src/corpus/entities/corpus-block.entity';
import { Not, IsNull, Repository } from 'typeorm';
import { CreateCorpusProjectDto } from './dto/create-corpus-project.dto';
import { AuthService } from 'src/auth/auth.service';
import { CorpusService } from 'src/corpus/corpus.service';
import { ProjectRoleService } from './project-role.service';
import { ProjectRoleType } from './entities/project-role.enum';
import type { IJwtPayload } from '@hangbank/shared';
import { computeAge } from 'src/helpers/compute-age';
import { AudioFile } from './entities/audio-file.entity';



@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(CorpusBasedProject) private readonly corpusBasedProjectRepository: Repository<CorpusBasedProject>,
    @InjectRepository(Speaker) private readonly speakerRepository: Repository<Speaker>,
    @InjectRepository(CorpusBlock) private readonly corpusBlockRepository: Repository<CorpusBlock>,
    @InjectRepository(AudioFile) private readonly audioFileRepository: Repository<AudioFile>,
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

      //Create one block per corpus line
      await this.corpusBlockRepository.insert(
        Array.from({ length: corpus.blockCount }, (_, index) => ({
          corpus,
          corpusProject: project,
          blockIndex: index,
        })),
      );

      //TODO: add role creation here for the provided people
      //Create Owner role for requester user
      await this.projectRoleService.create(requester.id, project.id, ProjectRoleType.OWNER);
      
      return project;
    } catch (ex) {
      throw ex;
    }
  }

  async getBlocks(projectId: string, from: number = 0, to: number = 50) {
    const [blocks, total] = await this.corpusBlockRepository.findAndCount({
      where: { corpusProject: { id: projectId } },
      relations: ['audioFile'],
      order: { blockIndex: 'ASC' },
      skip: from,
      take: to - from,
    });
    return {
      data: blocks.map(b => ({
        id: b.id,
        blockIndex: b.blockIndex,
        isRecorded: !!b.audioFile,
      })),
      total,
    };
  }

  async findAll(requesterId: string) {
    const projects = await this.corpusBasedProjectRepository.find({
      where: { roles: { userId: requesterId } },
      relations: ['corpus', 'corpus.language', 'speakers', 'roles'],
    });

    return Promise.all(projects.map(async (project) => {
      const recordedCount = await this.corpusBlockRepository.count({
        where: { corpusProject: { id: project.id }, audioFile: Not(IsNull()) },
      });
      const total = project.corpus.blockCount;
      return {
        id: project.id,
        name: project.name,
        description: project.description,
        samplingRate: project.samplingRate,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        type: 'corpus',
        corpusProgress: total > 0 ? Math.round((recordedCount / total) * 100) : 0,
        corpusName: project.corpus.name,
        language: project.corpus.language?.name,
        speakerCount: project.speakers.length,
      };
    }));
  }

  async findOne(id: string) {
    const project = await this.corpusBasedProjectRepository.findOne({
      where: { id },
      relations: ['corpus', 'corpus.language', 'speakers', 'roles'],
    });
    //TODO: add access right checks here based on project roles and requester user id (e.g. only allow if requester is in project.roles with a valid role, or if the project is public, etc.)

    if (!project) {
      throw new NotFoundException(`Project with id '${id}' not found`);
    }

    const recordedCount = await this.corpusBlockRepository.count({
      where: { corpusProject: { id }, audioFile: Not(IsNull()) },
    });
    const total = project.corpus.blockCount;
    const progress = total > 0 ? Math.round((recordedCount / total) * 100) : 0;

    return {
      id: project.id,
      name: project.name,
      description: project.description,
      samplingRate: project.samplingRate,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      type: "corpus",
      corpusProgress: progress, //how much blocks are recorded vs total blocks in the corpus, e.g. 0–100
      corpusName: project.corpus.name,
      language: project.corpus.language.name,
      speakerCount: project.speakers.length,
    };
  }
}
