import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { CorpusBasedProject } from './entities/corpus-based-project.entity';
import { Speaker } from './entities/speaker.entity';
import { CorpusBlock } from 'src/corpus/entities/corpus-block.entity';
import { Not, IsNull, Repository, EntityManager } from 'typeorm';
import { AuthService } from 'src/auth/auth.service';
import { CorpusService } from 'src/corpus/corpus.service';
import { ProjectRoleService } from './project-role.service';
import { ProjectRoleType } from './entities/project-role.enum';
import { S3StorageService } from 'src/s3-storage-client/s3-storage-client.service';
import { BadRequestException } from '@nestjs/common';
import { normalizeTranscript } from 'src/helpers/normalizeTranscript';
import { audioQualitiesHaveProblems } from 'src/audio-quality/audio-quality.metadata';
import { AudioFile } from 'src/audio-file/entities/audio-file.entity';
import { ExistingFilesProject } from './entities/existing-files-project.entity';
import { ExportableAudioFileDto } from './dto/exportable-audio-file.dto';
import { Project } from './entities/project.entity';
import {
  AIChatProjectListItemDto,
  CorpusProjectListItemDto,
  ExistingFilesProjectListItemDto,
  ProjectListItemDto,
} from './dto/project-list-item.dto';
import { AiChatProject } from 'src/ai-chat-project/entity/ai-chat-project.entity';

@Injectable()
export class ProjectService {
  constructor(
    @InjectEntityManager() private readonly entityManager: EntityManager,
    @InjectRepository(CorpusBasedProject)
    private readonly corpusBasedProjectRepository: Repository<CorpusBasedProject>,
    @InjectRepository(Speaker)
    private readonly speakerRepository: Repository<Speaker>,
    @InjectRepository(CorpusBlock)
    private readonly corpusBlockRepository: Repository<CorpusBlock>,
    @InjectRepository(AudioFile)
    private readonly audioFileRepository: Repository<AudioFile>,
    @Inject() private readonly authService: AuthService,
    @Inject() private readonly corpusService: CorpusService,
    @Inject() private readonly projectRoleService: ProjectRoleService,
    @Inject() private readonly s3StorageService: S3StorageService,
  ) {}

  //Only the project owner may delete it; dependent rows (roles, speaker, blocks,
  //audio files) are removed via their CASCADE foreign keys
  async remove(requesterId: string, projectId: string): Promise<void> {
    const project = await this.corpusBasedProjectRepository.findOne({
      where: { id: projectId },
      relations: { roles: true, audioFiles: true }, //['roles'],
    });
    if (!project) {
      throw new NotFoundException(`Project with id '${projectId}' not found`);
    }

    const isOwner = project.roles.some(
      (r) => r.userId === requesterId && r.role === ProjectRoleType.OWNER,
    );
    if (!isOwner) {
      throw new ForbiddenException(
        'Only the project owner can delete this project', //TODO: Translatable error message
      );
    }

    //Remove audio files from S3 storage + DB
    await this.s3StorageService.deleteBulk(
      project.audioFiles.map((a) => a.s3Link),
      this.s3StorageService.audioBucket,
    );
    await this.audioFileRepository.delete({ project: { id: projectId } });

    //Remove master recording
    if (project.masterRecording) {
      await this.s3StorageService.deleteObject(
        project.masterRecording.s3Link,
        this.s3StorageService.audioBucket,
      );
      await this.audioFileRepository.delete({ id: project.masterRecording.id });
    }

    await this.corpusBasedProjectRepository.delete(projectId);
  }

  //Loads an audio file and verifies the requester owns the file's project
  private async loadAuthorizedAudioFile(
    requesterId: string,
    audioFileId: string,
  ): Promise<AudioFile> {
    const audioFile = await this.audioFileRepository.findOne({
      where: { id: audioFileId },
      relations: {
        project: { roles: true, masterRecording: true },
      },
    });
    if (!audioFile) {
      throw new NotFoundException(
        `Audio file with id '${audioFileId}' not found`,
      );
    }

    const isOwner = audioFile.project.roles.some(
      (r) => r.userId === requesterId && r.role === ProjectRoleType.OWNER,
    );
    if (!isOwner) {
      throw new ForbiddenException('No access to this audio file');
    }

    return audioFile;
  }

  async getAudioFile(requesterId: string, audioFileId: string) {
    const audioFile = await this.loadAuthorizedAudioFile(
      requesterId,
      audioFileId,
    );
    const projectId = audioFile.project.id;

    const [block, speaker] = await Promise.all([
      this.corpusBlockRepository.findOne({
        where: { audioFile: { id: audioFileId } },
        relations: { corpus: { language: true } },
      }),
      this.speakerRepository.findOne({
        where: { project: { id: projectId } },
        select: { id: true, microphoneLabel: true },
      }),
    ]);

    const master = audioFile.project.masterRecording;

    return {
      id: audioFile.id,
      blockId: block?.id ?? null,
      blockIndex: block?.blockIndex ?? null,
      projectId,
      projectName: audioFile.project.name,
      name: audioFile.name,
      s3Link: audioFile.s3Link,
      transcription: audioFile.transcription,
      durationSeconds: audioFile.durationSeconds,
      createdAt: audioFile.createdAt,
      samplingRate: audioFile.project.samplingRate,
      microphoneLabel: speaker?.microphoneLabel ?? null,
      languageCode: block?.corpus?.language?.code ?? null, // for live transcription
      prompt: block?.text ?? null, // the expected text for this block
      masterRecording: master
        ? {
            id: master.id,
            name: master.name,
            durationSeconds: master.durationSeconds,
          }
        : null,
    };
  }

  // Updates only an audio file's transcription (no new audio), then re-runs the
  // transcription quality check against the block prompt.
  async updateAudioFileTranscription(
    requesterId: string,
    audioFileId: string,
    transcription: string,
  ) {
    const audioFile = await this.loadAuthorizedAudioFile(
      requesterId,
      audioFileId,
    );
    audioFile.transcription = transcription;
    await this.audioFileRepository.save(audioFile);

    await this.corpusService.recomputeTranscriptionCheck(
      requesterId,
      audioFileId,
      transcription,
    );

    return { id: audioFile.id, transcription };
  }

  //Returns a short-lived presigned URL for an audio file (owner-checked)
  async getAudioFileUrl(
    requesterId: string,
    audioFileId: string,
  ): Promise<{ url: string }> {
    const audioFile = await this.loadAuthorizedAudioFile(
      requesterId,
      audioFileId,
    );
    const url = await this.s3StorageService.getPresignedUrl(
      audioFile.s3Link,
      this.s3StorageService.audioBucket,
      20 * 60, // 20 minutes
    );
    return { url };
  }

  // Returns every recorded audio file of a project
  // with the fields the export needs
  async getExportableAudioFiles(
    requesterId: string,
    projectId: string,
  ): Promise<ExportableAudioFileDto[]> {
    const [corpusProject, existingFilesProject] = await Promise.all([
      this.entityManager.findOne(CorpusBasedProject, {
        where: { id: projectId },
        relations: { roles: true },
      }),
      this.entityManager.findOne(ExistingFilesProject, {
        where: { id: projectId },
        relations: { roles: true },
      }),
    ]);
    const project = corpusProject ?? existingFilesProject;
    if (!project) {
      throw new NotFoundException(`Project with id '${projectId}' not found`);
    }
    const isOwner = project.roles.some(
      (r) => r.userId === requesterId && r.role === ProjectRoleType.OWNER,
    );
    if (!isOwner) {
      throw new ForbiddenException(
        'Only the project owner can export this project',
      );
    }

    return corpusProject
      ? this.exportableCorpusAudioFiles(projectId)
      : this.exportableExistingAudioFiles(projectId);
  }

  private async exportableCorpusAudioFiles(
    projectId: string,
  ): Promise<ExportableAudioFileDto[]> {
    const blocks = await this.corpusBlockRepository.find({
      where: { corpusProject: { id: projectId }, audioFile: Not(IsNull()) },
      relations: { audioFile: { audioQualities: true } },
      order: { blockIndex: 'ASC' },
    });

    return blocks
      .filter((b) => b.audioFile)
      .map((b) => {
        // Flag a problem when an AQC check failed OR the transcription doesn't
        // match the block's prompt (e.g. empty/edited away from the expected text).
        const transcriptionMatches =
          normalizeTranscript(b.text) ===
          normalizeTranscript(b.audioFile!.transcription ?? '');
        return {
          audioFileId: b.audioFile!.id,
          name: b.audioFile!.name,
          durationSeconds: b.audioFile!.durationSeconds,
          transcription: b.audioFile!.transcription,
          blockIndex: b.blockIndex,
          hasQualityProblems:
            audioQualitiesHaveProblems(b.audioFile!.audioQualities ?? []) ||
            !transcriptionMatches,
        };
      });
  }

  private async exportableExistingAudioFiles(
    projectId: string,
  ): Promise<ExportableAudioFileDto[]> {
    const audioFiles = await this.audioFileRepository.find({
      where: { project: { id: projectId } },
      relations: { audioQualities: true },
      order: { createdAt: 'ASC' },
    });

    // There is no expected prompt to compare against, so a missing transcription
    // is what counts as a problem besides failed quality checks.
    return audioFiles.map((f, index) => ({
      audioFileId: f.id,
      name: f.name,
      durationSeconds: f.durationSeconds,
      transcription: f.transcription,
      blockIndex: index,
      hasQualityProblems:
        audioQualitiesHaveProblems(f.audioQualities ?? []) ||
        !f.transcription.trim(),
    }));
  }

  async findAll(requesterId: string): Promise<ProjectListItemDto[]> {
    // Only projects the requester owns (ownership-only filtering for now)
    const ownedByRequester = {
      roles: { userId: requesterId, role: ProjectRoleType.OWNER },
    };

    const [corpusProjects, aiChatProjects, existingFilesProjects] =
      await Promise.all([
        this.entityManager.find(CorpusBasedProject, {
          where: ownedByRequester,
          relations: { corpus: { language: true } },
        }),
        this.entityManager.find(AiChatProject, {
          where: ownedByRequester,
          relations: { transcriptionLanguage: true },
        }),
        this.entityManager.find(ExistingFilesProject, {
          where: ownedByRequester,
          relations: { transcriptionLanguage: true },
        }),
      ]);

    const items = await Promise.all([
      ...corpusProjects.map((p) => this.toCorpusListItem(p)),
      ...aiChatProjects.map((p) => this.toAIChatListItem(p)),
      ...existingFilesProjects.map((p) => this.toExistingFilesListItem(p)),
    ]);
    return items.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  private async toCorpusListItem(
    project: CorpusBasedProject,
  ): Promise<CorpusProjectListItemDto> {
    const recordedCount = await this.corpusBlockRepository.count({
      where: {
        corpusProject: { id: project.id },
        audioFile: Not(IsNull()),
      },
    });
    const total = project.corpus.blockCount;
    return {
      ...this.listItemBase(project),
      type: 'corpus',
      language: project.corpus.language?.name ?? null,
      progress: total > 0 ? +((recordedCount / total) * 100).toFixed(2) : 0, //Math.round rounds to nearest integer, making 0.01 to 0...
      corpusName: project.corpus.name,
    };
  }

  private async toAIChatListItem(
    project: AiChatProject,
  ): Promise<AIChatProjectListItemDto> {
    return {
      type: 'ai chat',
      topic: project.topic ?? '-',
      ...this.listItemBase(project),
      language: project.transcriptionLanguage?.name ?? null,
    };
  }

  private async toExistingFilesListItem(
    project: ExistingFilesProject,
  ): Promise<ExistingFilesProjectListItemDto> {
    const [audioFileCount, transcribedCount] = await Promise.all([
      this.audioFileRepository.count({
        where: { project: { id: project.id } },
      }),
      this.audioFileRepository.count({
        where: { project: { id: project.id }, transcription: Not('') },
      }),
    ]);
    return {
      ...this.listItemBase(project),
      type: 'existing files',
      language: project.transcriptionLanguage?.name ?? null,
      progress:
        audioFileCount > 0
          ? Math.round((transcribedCount / audioFileCount) * 100)
          : 0,
      audioFileCount,
    };
  }

  private listItemBase(project: Project) {
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      samplingRate: project.samplingRate,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      speakerCount: 1,
    };
  }

  async findOne(id: string) {
    const project = await this.corpusBasedProjectRepository.findOne({
      where: { id },
      relations: {
        corpus: {language: true},
        speaker: true,
        roles: true,
        masterRecording: true
      },
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

    //Resolve each role's user (name/email live in the auth service)
    const roles = await Promise.all(
      project.roles.map(async (r) => {
        const profile = await this.authService
          .getProfile(r.userId)
          .catch(() => null);
        return {
          userId: r.userId,
          role: r.role,
          firstName: profile?.firstName,
          lastName: profile?.lastName,
          username: profile?.username,
          email: profile?.email ?? '',
        };
      }),
    );

    return {
      id: project.id,
      name: project.name,
      description: project.description,
      samplingRate: project.samplingRate,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      type: 'corpus',
      corpusProgress: progress, //how much blocks are recorded vs total blocks in the corpus, e.g. 0–100
      corpusName: project.corpus.name,
      language: project.corpus.language.name,
      speakerCount: 1,
      masterRecordingId: project.masterRecording?.id ?? null,
      audioChecks: project.audioChecks ?? [],
      roles,
    };
  }

  // Updates a project's editable metadata (name and/or description). Owner-only.
  // Returns the refreshed detail DTO so the caller can replace its state.
  async updateProject(
    requesterId: string,
    projectId: string,
    data: {
      name?: string;
      description?: string;
      audioChecks?: string[];
      addMembers?: { userId: string; role: ProjectRoleType }[];
      removeMemberIds?: string[];
    },
  ) {
    const project = await this.corpusBasedProjectRepository.findOne({
      where: { id: projectId },
      relations: { roles: true },
    });
    if (!project) {
      throw new NotFoundException(`Project with id '${projectId}' not found`);
    }

    const isOwner = project.roles.some(
      (r) => r.userId === requesterId && r.role === ProjectRoleType.OWNER,
    );
    if (!isOwner) {
      throw new ForbiddenException(
        'Only the project owner can edit this project',
      );
    }

    if (data.name !== undefined) {
      const name = data.name.trim();
      if (!name) {
        throw new BadRequestException('Project name cannot be empty');
      }
      project.name = name;
    }
    if (data.description !== undefined) {
      project.description = data.description.trim();
    }
    if (data.audioChecks !== undefined) {
      project.audioChecks = data.audioChecks;
    }

    await this.corpusBasedProjectRepository.save(project);

    //Remove members (never the owner)
    for (const userId of data.removeMemberIds ?? []) {
      const target = project.roles.find((r) => r.userId === userId);
      if (!target || target.role === ProjectRoleType.OWNER) continue;
      await this.projectRoleService.revokeRoleForProject(userId, projectId);
    }

    //Add members (skip existing roles, ignore invalid role values)
    const existingIds = new Set(project.roles.map((r) => r.userId));
    for (const member of data.addMembers ?? []) {
      if (existingIds.has(member.userId)) continue;
      if (!Object.values(ProjectRoleType).includes(member.role)) continue;
      existingIds.add(member.userId);
      await this.projectRoleService.assignToRole(
        member.userId,
        projectId,
        member.role,
      );
    }

    return this.findOne(projectId);
  }
}
