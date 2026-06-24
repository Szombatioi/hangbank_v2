import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
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
import { Readable } from 'stream';
// import { Blob } from 'buffer';
import { S3StorageService } from 'src/s3-storage/s3-storage.service';
import { AudioFileService } from 'src/audio-file/audio-file.service';
import { CorpusProjectDetailDto } from './dto/corpus-project-detail.dto';
import { BadRequestException } from '@nestjs/common';
import { In } from 'typeorm';
import type { BufferedRecording } from 'src/corpus/corpus.service';
import { blob } from 'stream/consumers';
import { audioQualitiesHaveProblems } from 'src/audio-quality/audio-quality.metadata';

@Injectable()
export class ProjectService {
  constructor(
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
    @Inject() private readonly audioFileService: AudioFileService,
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
        }),
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
          microphoneLabel: data.microphoneLabel,
          project,
        }),
      );

      //Copy the corpus' master blocks into the project's own blocks
      const corpusBlocks = await this.corpusBlockRepository.find({
        where: { corpus: { id: corpus.id }, corpusProject: IsNull() },
        order: { blockIndex: 'ASC' },
      });
      await this.corpusBlockRepository.insert(
        corpusBlocks.map((b) => ({
          corpus,
          corpusProject: project,
          blockIndex: b.blockIndex,
          text: b.text,
        })),
      );

      //TODO: add role creation here for the provided people
      //Create Owner role for requester user
      await this.projectRoleService.assignToRole(
        requester.id,
        project.id,
        ProjectRoleType.OWNER,
      );

      return project;
    } catch (ex) {
      throw ex;
    }
  }

  //Only the project owner may delete it; dependent rows (roles, speaker, blocks,
  //audio files) are removed via their CASCADE foreign keys
  async remove(requesterId: string, projectId: string): Promise<void> {
    const project = await this.corpusBasedProjectRepository.findOne({
      where: { id: projectId },
      relations: {roles: true, audioFiles: true} //['roles'],
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
      relations: ['project', 'project.roles', 'project.masterRecording'],
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

  //Returns the audio file's metadata (owner-checked), plus the block it belongs
  //to and the project's recording settings — enough to re-record it in place
  async getAudioFile(requesterId: string, audioFileId: string) {
    const audioFile = await this.loadAuthorizedAudioFile(
      requesterId,
      audioFileId,
    );
    const projectId = audioFile.project.id;

    const [block, speaker] = await Promise.all([
      this.corpusBlockRepository.findOne({
        where: { audioFile: { id: audioFileId } },
        relations: ['corpus', 'corpus.language'],
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

  async getBlocks(projectId: string, from: number = 0, to: number = 50) {
    const [blocks, total] = await this.corpusBlockRepository.findAndCount({
      where: { corpusProject: { id: projectId } },
      relations: ['audioFile', 'audioFile.audioQualities'],
      order: { blockIndex: 'ASC' },
      skip: from,
      take: to - from,
    });

    return {
      data: blocks.map((b) => {
        const qualities = b.audioFile?.audioQualities ?? [];
        return {
          id: b.id,
          blockIndex: b.blockIndex,
          isRecorded: !!b.audioFile,
          text: b.text,
          // Whether quality checks have run, and whether any flagged a problem —
          // lets the UI show a pass/fail badge per block.
          hasQualityChecks: qualities.length > 0,
          hasQualityProblems: audioQualitiesHaveProblems(qualities),
          audioFile: b.audioFile
            ? {
                id: b.audioFile.id,
                s3Link: b.audioFile.s3Link,
                transcription: b.audioFile.transcription,
              }
            : undefined,
        };
      }),
      total,
    };
  }

  async findAll(requesterId: string) {
    const projects = await this.corpusBasedProjectRepository.find({
      where: { roles: { userId: requesterId } },
      relations: ['corpus', 'corpus.language', 'speaker', 'roles'],
    });

    return Promise.all(
      projects.map(async (project) => {
        const recordedCount = await this.corpusBlockRepository.count({
          where: {
            corpusProject: { id: project.id },
            audioFile: Not(IsNull()),
          },
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
          corpusProgress:
            total > 0 ? Math.round((recordedCount / total) * 100) : 0,
          corpusName: project.corpus.name,
          language: project.corpus.language?.name,
          speakerCount: 1,
        };
      }),
    );
  }

  async findOne(id: string) {
    const project = await this.corpusBasedProjectRepository.findOne({
      where: { id },
      relations: ['corpus', 'corpus.language', 'speaker', 'roles', 'masterRecording'],
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
      type: 'corpus',
      corpusProgress: progress, //how much blocks are recorded vs total blocks in the corpus, e.g. 0–100
      corpusName: project.corpus.name,
      language: project.corpus.language.name,
      speakerCount: 1,
      masterRecordingId: project.masterRecording?.id ?? null,
    };
  }

  // Updates a project's editable metadata (name and/or description). Owner-only.
  // Returns the refreshed detail DTO so the caller can replace its state.
  async updateProject(
    requesterId: string,
    projectId: string,
    data: { name?: string; description?: string },
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
      throw new ForbiddenException('Only the project owner can edit this project');
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

    await this.corpusBasedProjectRepository.save(project);

    return this.findOne(projectId);
  }

  async findCorpusDetail(id: string): Promise<CorpusProjectDetailDto> {
    const project = await this.corpusBasedProjectRepository.findOne({
      where: { id },
      relations: ['corpus', 'corpus.language', 'speaker', 'blocks', 'blocks.audioFile', 'masterRecording'],
    });

    if (!project) {
      throw new NotFoundException(`Project with id '${id}' not found`);
    }

    const blocks = await Promise.all(
      project.blocks
        .sort((a, b) => a.blockIndex - b.blockIndex)
        .map(async (block) => {
          if (!block.audioFile) {
            return {
              id: block.id,
              blockIndex: block.blockIndex,
              isRecorded: false,
            };
          }
          const stream = await this.s3StorageService.downloadObject(
            block.audioFile.s3Link,
            this.s3StorageService.audioBucket,
          );
          const audioData = (await streamToBuffer(stream)).toString('base64');
          return {
            id: block.id,
            blockIndex: block.blockIndex,
            isRecorded: true,
            audioData,
          };
        }),
    );

    let masterRecording: CorpusProjectDetailDto['masterRecording'] = null;
    if (project.masterRecording) {
      const stream = await this.s3StorageService.downloadObject(
        project.masterRecording.s3Link,
        this.s3StorageService.audioBucket,
      );
      const audioData = (await streamToBuffer(stream)).toString('base64');
      masterRecording = {
        id: project.masterRecording.id,
        name: project.masterRecording.name,
        createdAt: project.masterRecording.createdAt,
        audioData,
      };
    }

    return {
      id: project.id,
      name: project.name,
      description: project.description,
      samplingRate: project.samplingRate,
      languageCode: project.corpus.language?.code,
      speaker: {
        id: project.speaker.id,
        microphoneLabel: project.speaker.microphoneLabel,
      },
      blocks,
      masterRecording,
    };
  }


  async getMasterRecordingPrompt(
    id: string,
  ): Promise<{ languageCode: string; text: string }> {
    const project = await this.corpusBasedProjectRepository.findOne({
      where: { id },
      relations: ['corpus', 'corpus.language'],
    });
    if (!project) {
      throw new NotFoundException(`Project with id '${id}' not found`);
    }
    const code = project.corpus.language.code;
    const text =
      MASTER_RECORDING_PROMPTS[code] ?? MASTER_RECORDING_PROMPTS['en-US'];
    return { languageCode: code, text };
  }

  /**
   * Persists a master recording for the project: uploads the WAV to S3 via the
   * AudioFileService and points `project.masterRecording` at the resulting row.
   * Overwriting an existing master leaves the previous AudioFile in place
   * (TODO: garbage-collect the prior file + S3 object).
   */
  async saveMasterRecording(
    projectId: string,
    file: Express.Multer.File,
    durationSeconds: number,
  ): Promise<AudioFile> {
    const project = await this.corpusBasedProjectRepository.findOne({
      where: { id: projectId },
      relations: ['corpus', 'corpus.language'],
    });
    if (!project) {
      throw new NotFoundException(`Project with id '${projectId}' not found`);
    }

    const code = project.corpus.language.code;
    const transcription =
      MASTER_RECORDING_PROMPTS[code] ?? MASTER_RECORDING_PROMPTS['en-US'];

    const blob = new Blob([new Uint8Array(file.buffer)], {
      type: file.mimetype || 'audio/wav',
    });

    const audioFile = await this.audioFileService.create({
      blob: blob as unknown as globalThis.Blob,
      name: `master-${projectId}-${Date.now()}.wav`,
      durationSeconds,
      transcription,
      projectId,
    });

    project.masterRecording = audioFile;
    await this.corpusBasedProjectRepository.save(project);

    return audioFile;
  }

  /**
   * Saves a batch of block recordings for the given project. Validates that
   * every blockId in the payload actually belongs to this project before
   * handing off to the corpus service — otherwise a caller could overwrite
   * another project's blocks just by supplying their ids.
   */
  async saveBlockRecordings(
    requesterId: string,
    projectId: string,
    recordings: BufferedRecording[],
  ) {
    if (recordings.length === 0) return { saved: 0, results: [] };

    const project = await this.corpusBasedProjectRepository.findOne({
      where: { id: projectId },
      relations: ['masterRecording'],
    });
    if(!project) {
      throw new NotFoundException(`Project with id '${projectId}' not found`);
    }

    const blockIds = recordings.map((r) => r.blockId);
    const blocks = await this.corpusBlockRepository.find({
      where: { id: In(blockIds) },
      relations: ['corpusProject'],
      select: { id: true, corpusProject: { id: true } },
    });

    const blocksByProject = new Map(
      blocks.map((b) => [b.id, b.corpusProject?.id]),
    );
    const foreign = blockIds.filter(
      (id) => blocksByProject.get(id) !== projectId,
    );
    if (foreign.length > 0) {
      throw new BadRequestException(
        `Block(s) do not belong to project ${projectId}: ${foreign.join(', ')}`,
      );
    }

    //pass master recording too
    if(!project.masterRecording) {
      throw new BadRequestException(
        `Project ${projectId} does not have a master recording`,
      );
    }
    
    const masterStream = await this.s3StorageService.downloadObject(project.masterRecording.s3Link, this.s3StorageService.audioBucket);
    const masterBuffer = await blob(masterStream);

    const results = await this.corpusService.saveRecordings(
      requesterId,
      masterBuffer as unknown as Blob,
      recordings,
    );
    return { saved: results.length, results };
  }
}

//TODO: move these prompts to a DB table if we want editorial control over them later
const MASTER_RECORDING_PROMPTS: Record<string, string> = {
  'en-US':
    'The quick brown fox jumps over the lazy dog. She sells seashells by the seashore, where the wild waves whisper of forgotten summers.',
  'hu-HU':
    'Árvíztűrő tükörfúrógép. Az öreg halász csendben ült a parton, és figyelte, ahogy a nap lassan eltűnik a horizonton.',
  'de-DE':
    'Falsches Üben von Xylophonmusik quält jeden größeren Zwerg. Im wunderschönen Garten blühen die Rosen schon im frühen Mai.',
};

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}
