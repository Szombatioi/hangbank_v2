import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager, FindOptionsRelations, In } from 'typeorm';
import { blob } from 'stream/consumers';
import * as path from 'path';
import type { IJwtPayload } from '@hangbank/shared';
import { ExistingFilesProject } from 'src/project/entities/existing-files-project.entity';
import { Speaker } from 'src/project/entities/speaker.entity';
import { ProjectRole } from 'src/project/entities/project-role.entity';
import { ProjectRoleType } from 'src/project/entities/project-role.enum';
import { Gender } from 'src/project/entities/gender.enum';
import { AudioFile } from 'src/audio-file/entities/audio-file.entity';
import { AudioFileService } from 'src/audio-file/audio-file.service';
import { AudioQualityService } from 'src/audio-quality/audio-quality.service';
import { AuthService } from 'src/auth/auth.service';
import { LanguageService } from 'src/language/language.service';
import { S3StorageService } from 'src/s3-storage-client/s3-storage-client.service';
import { computeAge } from 'src/helpers/compute-age';
import { ConvertedAudio, convertToWav } from 'src/helpers/convert-to-wav';
import { SaveExistingAudioProjectDto } from './dto/save-existing-audio-project.dto';
import { SaveNewAudioDto } from './dto/save-new-audio.dto';
import { UpdateExistingAudioDto } from './dto/update-existing-audio.dto';
import { DeleteExistingAudioDto } from './dto/delete-existing-audio.dto';
import {
  ExistingAudioFileView,
  ExistingAudioProjectView,
} from './dto/existing-audio-project-view.dto';
import { AudioQualityType } from 'src/audio-quality/entities/audio-quality.entity';

const EDITING_ROLES = [ProjectRoleType.OWNER, ProjectRoleType.EDITOR];
const ALL_ROLES = Object.values(ProjectRoleType);

@Injectable()
export class ExistingAudioProjectService {
  private readonly logger = new Logger(ExistingAudioProjectService.name);

  constructor(
    @InjectEntityManager() private readonly entityManager: EntityManager,
    @Inject() private readonly audioFileService: AudioFileService,
    @Inject() private readonly audioQualityService: AudioQualityService,
    @Inject() private readonly authService: AuthService,
    @Inject() private readonly languageService: LanguageService,
    @Inject() private readonly s3StorageService: S3StorageService,
    @InjectQueue('jobs') private readonly jobQueue: Queue,
  ) {}

  async loadProject(
    requesterId: string,
    projectId: string,
  ): Promise<ExistingAudioProjectView> {
    const project = await this.findProjectWithRole(
      projectId,
      requesterId,
      ALL_ROLES,
      { speaker: true },
    );

    const [speakerProfile, audioFiles] = await Promise.all([
      project.speaker
        ? this.authService.getProfile(project.speaker.userId).catch(() => null)
        : null,
      this.entityManager.find(AudioFile, {
        where: { project: { id: project.id } },
        order: { createdAt: 'ASC' },
      }),
    ]);

    const speakerName = speakerProfile
      ? [speakerProfile.firstName, speakerProfile.lastName]
          .filter(Boolean)
          .join(' ') || speakerProfile.username
      : '';

    return {
      id: project.id,
      name: project.name,
      description: project.description,
      details: {
        speakerName: speakerName ?? '',
        speechDialect: project.speaker?.characteristics.join(', ') ?? '',
        unifySamplingRate: project.samplingRate != null,
        targetSamplingRate: project.samplingRate ?? null,
        transcriptionLanguage: project.transcriptionLanguage?.name ?? null,
        useAutomaticTranscription: project.useAutomaticTranscription,
      },
      files: audioFiles.map((f) => this.toView(f, project.masterRecording?.id)),
    };
  }

  async create(
    requester: IJwtPayload,
    dto: SaveExistingAudioProjectDto,
  ): Promise<ExistingFilesProject> {
    const transcriptionLanguage = await this.languageService.findOne(
      dto.transcriptionLanguageCode,
    );
    const speakerProfile = await this.authService.getProfile(
      dto.speaker.userId,
    );
    const speechCharacteristics = dto.speaker.speechCharacteristics?.trim();

    return this.entityManager.transaction(async (tx) => {
      const project = await tx.save(
        tx.create(ExistingFilesProject, {
          name: dto.projectName,
          description: dto.description?.trim() ?? '',
          samplingRate: dto.samplingRate ?? undefined,
          audioChecks: dto.audioChecks ?? [],
          useAutomaticTranscription: dto.useAutomaticTranscription ?? false,
          transcriptionLanguage,
        }),
      );

      await tx.save(
        tx.create(Speaker, {
          userId: speakerProfile.id,
          actualAge: speakerProfile.birthDate
            ? computeAge(speakerProfile.birthDate)
            : 0,
          characteristics: speechCharacteristics ? [speechCharacteristics] : [],
          gender: (speakerProfile.gender as Gender) ?? Gender.PREFER_NOT_TO_SAY,
          project,
        }),
      );

      const roles = new Map<string, ProjectRoleType>([
        [requester.id, ProjectRoleType.OWNER],
      ]);
      if (!roles.has(speakerProfile.id)) {
        roles.set(speakerProfile.id, ProjectRoleType.EDITOR);
      }
      for (const member of dto.members ?? []) {
        if (roles.has(member.userId)) continue;
        if (!Object.values(ProjectRoleType).includes(member.role)) continue;
        roles.set(member.userId, member.role);
      }
      await tx.insert(
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

  async saveNew(
    requesterId: string,
    dto: SaveNewAudioDto,
  ): Promise<ExistingAudioFileView[]> {
    if (dto.files.length === 0)
      throw new BadRequestException('No files to save');
    const masterIndex = dto.files.findIndex((f) => f.isMasterPrompt === true);
    if (dto.files.filter((f) => f.isMasterPrompt === true).length > 1) {
      throw new BadRequestException('Only one file can be the master file');
    }
    const project = await this.findEditableProject(dto.projectId, requesterId);

    const converted: ConvertedAudio[] = [];
    for (const { audioFile } of dto.files) {
      try {
        converted.push(
          await convertToWav(
            audioFile.buffer,
            audioFile.originalname,
            project.samplingRate,
          ),
        );
      } catch (err) {
        this.logger.error(
          `Failed to convert ${audioFile.originalname}`,
          err as Error,
        );
        throw new BadRequestException(
          `Could not process audio file '${audioFile.originalname}'`,
        );
      }
    }

    const saved: AudioFile[] = [];
    for (const [i, entry] of dto.files.entries()) {
      const audio = converted[i];
      const transcription = entry.transcription?.trim() ?? '';

      const audioFile = await this.audioFileService.create({
        blob: new Blob([new Uint8Array(audio.buffer)], { type: 'audio/wav' }),
        name: `${path.parse(entry.audioFile.originalname).name}.wav`,
        durationSeconds: audio.durationSeconds,
        transcription,
        projectId: project.id,
        emotion: entry.emotion?.trim() || null,
        originalSamplingRate: audio.originalSamplingRate,
        originalFormat: audio.originalFormat,
      });
      saved.push(audioFile);

      if (project.useAutomaticTranscription && !transcription) {
        await this.enqueueTranscription(audioFile, project);
      }
    }

    if (masterIndex !== -1) {
      project.masterRecording = saved[masterIndex];
      await this.entityManager.save(project);
    }

    if (project.audioChecks.length > 0) {
      await this.runQualityChecks(project, saved, converted, requesterId);
    }

    return saved.map((f) => this.toView(f, project.masterRecording?.id));
  }

  async updateMany(
    requesterId: string,
    dto: UpdateExistingAudioDto,
  ): Promise<ExistingAudioFileView[]> {
    const project = await this.findEditableProject(dto.projectId, requesterId);
    const audioFiles = await this.findProjectAudioFiles(
      project.id,
      dto.files.map((f) => f.id),
    );

    const newMasters = dto.files.filter((f) => f.isMasterPrompt === true);
    if (newMasters.length > 1) {
      throw new BadRequestException('Only one file can be the master file');
    }

    const byId = new Map(audioFiles.map((a) => [a.id, a]));
    for (const change of dto.files) {
      const audioFile = byId.get(change.id)!;
      if (change.transcription !== undefined) {
        audioFile.transcription = change.transcription;
      }
      if (change.emotion !== undefined) audioFile.emotion = change.emotion;
    }

    await this.entityManager.transaction(async (tx) => {
      await tx.save(audioFiles);
      if (newMasters.length === 1) {
        project.masterRecording = byId.get(newMasters[0].id)!;
        await tx.save(project);
      }
    });

    return audioFiles.map((f) => this.toView(f, project.masterRecording?.id));
  }

  async deleteMany(
    requesterId: string,
    dto: DeleteExistingAudioDto,
  ): Promise<void> {
    const project = await this.findEditableProject(dto.projectId, requesterId);
    if (
      project.masterRecording &&
      dto.ids.includes(project.masterRecording.id)
    ) {
      throw new BadRequestException('The master file cannot be deleted');
    }

    const audioFiles = await this.findProjectAudioFiles(project.id, dto.ids);
    for (const audioFile of audioFiles) {
      await this.audioFileService.remove(audioFile);
    }
  }

  private findEditableProject(
    projectId: string,
    requesterId: string,
  ): Promise<ExistingFilesProject> {
    return this.findProjectWithRole(projectId, requesterId, EDITING_ROLES);
  }

  private async findProjectWithRole(
    projectId: string,
    requesterId: string,
    allowedRoles: ProjectRoleType[],
    extraRelations: FindOptionsRelations<ExistingFilesProject> = {},
  ): Promise<ExistingFilesProject> {
    const project = await this.entityManager.findOne(ExistingFilesProject, {
      where: { id: projectId },
      relations: {
        roles: true,
        masterRecording: true,
        transcriptionLanguage: true,
        ...extraRelations,
      },
    });
    if (!project) {
      throw new NotFoundException(`Project with id '${projectId}' not found`);
    }

    const hasRole = project.roles.some(
      (r) => r.userId === requesterId && allowedRoles.includes(r.role),
    );
    if (!hasRole) {
      throw new ForbiddenException('No permission to access this project');
    }
    return project;
  }

  private async findProjectAudioFiles(
    projectId: string,
    ids: string[],
  ): Promise<AudioFile[]> {
    const uniqueIds = [...new Set(ids)];
    const audioFiles = await this.entityManager.find(AudioFile, {
      where: { id: In(uniqueIds), project: { id: projectId } },
    });
    if (audioFiles.length !== uniqueIds.length) {
      throw new BadRequestException(
        `Some audio files do not belong to project ${projectId}`,
      );
    }
    return audioFiles;
  }

  private async enqueueTranscription(
    audioFile: AudioFile,
    project: ExistingFilesProject,
  ): Promise<void> {
    const language = project.transcriptionLanguage?.code.split('-')[0];
    try {
      await this.jobQueue.add(
        'transcribe',
        { audio_id: audioFile.id, audio_name: audioFile.s3Link, language },
        { attempts: 3, backoff: { type: 'exponential', delay: 1000 } },
      );
    } catch (err) {
      // The file is already stored
      this.logger.error(
        `Failed to queue transcription for audio file ${audioFile.id}`,
        err as Error,
      );
    }
  }

  private async runQualityChecks(
    project: ExistingFilesProject,
    saved: AudioFile[],
    converted: ConvertedAudio[],
    requesterId: string,
  ): Promise<void> {
    if (!project.masterRecording) {
      this.logger.warn(
        `Project ${project.id} has no master file yet, skipping audio quality checks`,
      );
      return;
    }

    const masterStream = await this.s3StorageService.downloadObject(
      project.masterRecording.s3Link,
      this.s3StorageService.audioBucket,
    );
    const master = await blob(masterStream);

    const qualityMeasures = await this.audioQualityService.callAqcService(
      project.audioChecks,
      master as unknown as Blob,
      saved.map((audioFile, i) => ({
        id: audioFile.id,
        blob: new Blob([new Uint8Array(converted[i].buffer)], {
          type: 'audio/wav',
        }),
      })),
    );

    for (const qm of qualityMeasures) {
      for (const measure of qm.measures) {
        const type = measure.name as AudioQualityType;
        if (!Object.values(AudioQualityType).includes(type)) continue;
        await this.audioQualityService.setAudioQuality(
          qm.audioFileId,
          type,
          measure,
          requesterId,
        );
      }
    }
  }

  private toView(
    audioFile: AudioFile,
    masterId?: string | null,
  ): ExistingAudioFileView {
    return {
      id: audioFile.id,
      filename: audioFile.name,
      type: audioFile.originalFormat ?? 'wav',
      originalSamplingRate: audioFile.originalSamplingRate ?? null,
      isMasterPrompt: audioFile.id === masterId,
      transcription: audioFile.transcription,
      emotion: audioFile.emotion ?? '',
    };
  }
}
