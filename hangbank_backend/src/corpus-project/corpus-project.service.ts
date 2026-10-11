import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { Readable } from 'stream';
import { blob } from 'stream/consumers';
import type { IJwtPayload } from '@hangbank/shared';
import { CorpusBasedProject } from 'src/project/entities/corpus-based-project.entity';
import { Speaker } from 'src/project/entities/speaker.entity';
import { Gender } from 'src/project/entities/gender.enum';
import { ProjectRoleType } from 'src/project/entities/project-role.enum';
import { ProjectRoleService } from 'src/project/project-role.service';
import { CorpusBlock } from 'src/corpus/entities/corpus-block.entity';
import { CorpusService } from 'src/corpus/corpus.service';
import type { BufferedRecording } from 'src/corpus/corpus.service';
import { AuthService } from 'src/auth/auth.service';
import { S3StorageService } from 'src/s3-storage-client/s3-storage-client.service';
import { AudioFileService } from 'src/audio-file/audio-file.service';
import { AudioFile } from 'src/audio-file/entities/audio-file.entity';
import { audioQualitiesHaveProblems } from 'src/audio-quality/audio-quality.metadata';
import { computeAge } from 'src/helpers/compute-age';
import { CreateCorpusProjectDto } from './dto/create-corpus-project.dto';
import { CorpusProjectDetailDto } from './dto/corpus-project-detail.dto';

@Injectable()
export class CorpusProjectService {
  constructor(
    @InjectRepository(CorpusBasedProject)
    private readonly corpusBasedProjectRepository: Repository<CorpusBasedProject>,
    @InjectRepository(Speaker)
    private readonly speakerRepository: Repository<Speaker>,
    @InjectRepository(CorpusBlock)
    private readonly corpusBlockRepository: Repository<CorpusBlock>,
    @Inject() private readonly authService: AuthService,
    @Inject() private readonly corpusService: CorpusService,
    @Inject() private readonly projectRoleService: ProjectRoleService,
    @Inject() private readonly s3StorageService: S3StorageService,
    @Inject() private readonly audioFileService: AudioFileService,
  ) {}

  //TODO: handle project roles from DTO parameters (who owns it, who can record (if multi-person recording), who can work with it by e.g. exporting it)
  async create(requester: IJwtPayload, data: CreateCorpusProjectDto) {
    const user = await this.authService.getProfile(requester.id);
    const corpus = await this.corpusService._findOne(data.corpusId);

    const project = await this.corpusBasedProjectRepository.save(
      this.corpusBasedProjectRepository.create({
        name: data.projectName,
        description: data.description ?? '',
        samplingRate: data.samplingRate,
        corpus,
        roles: [],
        audioChecks: data.audioChecks ?? [],
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

    //Create Owner role for requester user
    await this.projectRoleService.assignToRole(
      requester.id,
      project.id,
      ProjectRoleType.OWNER,
    );

    //Assign the roles chosen for the invited members (never override the creator)
    const seen = new Set<string>([requester.id]);
    for (const member of data.members ?? []) {
      if (seen.has(member.userId)) continue;
      if (!Object.values(ProjectRoleType).includes(member.role)) continue;
      seen.add(member.userId);
      await this.projectRoleService.assignToRole(
        member.userId,
        project.id,
        member.role,
      );
    }

    return project;
  }

  async getBlocks(projectId: string, from: number = 0, to: number = 50) {
    const [blocks, total] = await this.corpusBlockRepository.findAndCount({
      where: { corpusProject: { id: projectId } },
      relations: {
        audioFile: {
          audioQualities: true,
        },
      },
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

  async findCorpusDetail(id: string): Promise<CorpusProjectDetailDto> {
    const project = await this.corpusBasedProjectRepository.findOne({
      where: { id },
      relations: {
        corpus: {
          language: true,
        },
        speaker: true,
        blocks: {
          audioFile: true,
        },
        masterRecording: true,
      },
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
      relations: {
        corpus: {
          language: true
        }
      },
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
      relations: {
        corpus: {
          language: true
        }
      },
    });
    if (!project) {
      throw new NotFoundException(`Project with id '${projectId}' not found`);
    }

    const code = project.corpus.language.code;
    const transcription =
      MASTER_RECORDING_PROMPTS[code] ?? MASTER_RECORDING_PROMPTS['en-US'];

    const audioBlob = new Blob([new Uint8Array(file.buffer)], {
      type: file.mimetype || 'audio/wav',
    });

    const audioFile = await this.audioFileService.create({
      blob: audioBlob as unknown as globalThis.Blob,
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
      relations: { masterRecording: true }
    });
    if (!project) {
      throw new NotFoundException(`Project with id '${projectId}' not found`);
    }

    const blockIds = recordings.map((r) => r.blockId);
    const blocks = await this.corpusBlockRepository.find({
      where: { id: In(blockIds) },
      relations: { corpusProject: true },
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
    if (!project.masterRecording) {
      throw new BadRequestException(
        `Project ${projectId} does not have a master recording`,
      );
    }

    const masterStream = await this.s3StorageService.downloadObject(
      project.masterRecording.s3Link,
      this.s3StorageService.audioBucket,
    );
    const masterBuffer = await blob(masterStream);

    const results = await this.corpusService.saveRecordings(
      requesterId,
      projectId,
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
