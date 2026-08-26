import {
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager, QueryFailedError } from 'typeorm';
import { CreateCorpusDto } from './dto/create-corpus.dto';
import { UpdateCorpusDto } from './dto/update-corpus.dto';
import { CorpusListItemDto } from './dto/corpus-list-item.dto';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { Corpus } from './entities/corpus.entity';
import { CorpusBlock } from './entities/corpus-block.entity';
import { In, IsNull, Repository } from 'typeorm';
import { CorpusVisibility } from './entities/corpus-visibility';
import { CorpusDomainService } from 'src/corpus-domain/corpus-domain.service';
import { LanguageService } from 'src/language/language.service';
import { CorpusDomain } from 'src/corpus-domain/entities/corpus-domain.entity';
import type { IJwtPayload } from '@hangbank/shared';
import { S3StorageService } from 'src/s3-storage/s3-storage.service';
import { CorpusProcesserService } from './corpus-processer.service';
import { AudioFileService } from 'src/audio-file/audio-file.service';
import { AudioQualityService } from 'src/audio-quality/audio-quality.service';
import { AudioQualityType } from 'src/audio-quality/entities/audio-quality.entity';
import { first } from 'rxjs';
import { normalizeTranscript } from 'src/helpers/normalizeTranscript';
import { UserCorpusAccess } from 'src/user-corpus-access/entities/user-corpus-access.entity';
import { AuthService } from 'src/auth/auth.service';

@Injectable()
export class CorpusService {
  constructor(
    @InjectRepository(Corpus)
    private readonly corpusRepository: Repository<Corpus>,
    @InjectRepository(CorpusBlock)
    private readonly corpusBlockRepository: Repository<CorpusBlock>,
    @Inject() private readonly languageService: LanguageService,
    @Inject() private readonly corpusDomainService: CorpusDomainService,
    @Inject() private readonly s3StorageService: S3StorageService,
    @Inject() private readonly corpusProcesserService: CorpusProcesserService,
    @Inject() private readonly audioFileService: AudioFileService,
    @Inject() private readonly audioQualityService: AudioQualityService,
    @Inject() private readonly authService: AuthService,
    @InjectEntityManager() private readonly entityManager: EntityManager,
  ) {}

  //This is an internal method that only services use!
  async _findOne(id: string): Promise<Corpus> {
    const corpus = await this.corpusRepository.findOne({
      where: { id },
      relations: {
        language: true,
        domain: true,
        userCorpusAccesses: true,
      }
    });
    if (!corpus) {
      throw new NotFoundException(`Corpus with id '${id}' not found`);
    }
    return corpus;
  }

  async findOneForUser(id: string, userId: string): Promise<Corpus> {
    const corpus = await this._findOne(id);
    if (
      corpus.visibility === CorpusVisibility.PRIVATE &&
      corpus.uploaderId !== userId
    ) {
      throw new ForbiddenException(`No access to corpus with id '${id}'`);
    } else if (
      corpus.visibility === CorpusVisibility.PROTECTED &&
      corpus.uploaderId !== userId &&
      corpus.userCorpusAccesses.every((uca) => uca.userId !== userId)
    ) {
      throw new ForbiddenException(`No access to corpus with id '${id}'`);
    }
    return corpus;
  }

  async findAll(requesterId: string): Promise<CorpusListItemDto[]> {
    //Fetch all accesses to the requester user
    // const userCorpusAccesses = await this.

    const corpora = (
      await this.corpusRepository.find({
        relations: { language: true, domain: true, userCorpusAccesses: true },
        order: { createdAt: 'DESC' },
      })
    ).filter((corpus) => {
      //Public corpus -> automatically allowed
      if (corpus.visibility === CorpusVisibility.PUBLIC) {
        return true;
      } else if (
        //Private -> only uploader allowed
        corpus.visibility === CorpusVisibility.PRIVATE &&
        corpus.uploaderId === requesterId
      ) {
        return true;
      } else if (
        //Protected -> only uploader + users with access
        corpus.visibility === CorpusVisibility.PROTECTED &&
        (corpus.uploaderId === requesterId ||
          corpus.userCorpusAccesses.some(
            (access) => access.userId === requesterId,
          ))
      ) {
        return true;
      }
      return false;
    });

    return corpora.map((corpus) => this._toListItemDto(corpus, requesterId));
  }

  private _toListItemDto(
    corpus: Corpus,
    requesterId: string,
  ): CorpusListItemDto {
    return {
      id: corpus.id,
      name: corpus.name,
      language: { name: corpus.language.name },
      visibility: corpus.visibility,
      domain: corpus.domain ? { name: corpus.domain.name } : undefined,
      phoneticalCoverage: corpus.phoneticalCoverage,
      blockCount: corpus.blockCount,
      createdAt: corpus.createdAt,
      isUploader: corpus.uploaderId === requesterId,
    };
  }

  async update(
    id: string,
    requesterId: string,
    dto: UpdateCorpusDto,
  ): Promise<CorpusListItemDto> {
    // Ownership is enforced by CorpusOwnerGuard on the route.
    const corpus = await this._findOne(id);

    if (dto.name !== undefined) {
      corpus.name = dto.name;
    }
    if (dto.domainName !== undefined) {
      try {
        corpus.domain = await this.corpusDomainService.findOne(dto.domainName);
      } catch {
        corpus.domain = await this.corpusDomainService.create({
          name: dto.domainName,
        });
      }
    }

    const leavingProtected =
      dto.visibility !== undefined &&
      corpus.visibility === CorpusVisibility.PROTECTED &&
      dto.visibility !== CorpusVisibility.PROTECTED;

    if (dto.visibility !== undefined) {
      corpus.visibility = dto.visibility;
    }

    await this.entityManager.transaction(async (tx) => {
      await tx.save(corpus);

      //Leaving protected visibility drops every existing access
      if (leavingProtected) {
        await tx.delete(UserCorpusAccess, { corpusId: corpus.id });
        corpus.userCorpusAccesses = [];
      }

      //Grant/revoke accesses whenever the corpus is protected, regardless of
      //whether the visibility itself changed in this request
      if (corpus.visibility === CorpusVisibility.PROTECTED) {
        if (dto.userAccesses && dto.userAccesses.length > 0) {
          const existingUserIds = corpus.userCorpusAccesses.map(
            (access) => access.userId,
          );
          const newUserIds = dto.userAccesses.filter(
            (userId) => !existingUserIds.includes(userId),
          );
          if (newUserIds.length > 0) {
            await tx
              .createQueryBuilder()
              .insert()
              .into(UserCorpusAccess)
              .values(
                newUserIds.map((userId) => ({ userId, corpusId: corpus.id })),
              )
              .orIgnore()
              .execute();
          }
        }

        if (dto.revokeAccessIds && dto.revokeAccessIds.length > 0) {
          await tx.delete(UserCorpusAccess, {
            corpusId: corpus.id,
            userId: In(dto.revokeAccessIds),
          });
        }
      }
    });

    return this._toListItemDto(corpus, requesterId);
  }

  async getAccesses(id: string, requesterId: string) {
    const corpus = await this._findOne(id);
    const users = await Promise.all(
      corpus.userCorpusAccesses.map((access) =>
        this.authService.getProfile(access.userId).catch(() => null),
      ),
    );
    return users
      .filter((u): u is NonNullable<typeof u> => u !== null)
      .map((u) => ({
        id: u.id,
        username: u.username,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
      }));
  }

  async create(
    uploader: IJwtPayload,
    createCorpusDto: CreateCorpusDto,
    file: Express.Multer.File,
  ): Promise<Corpus> {
    const { name, languageCode, visibility, domainName } = createCorpusDto;
    const userAccessIds = parseUserAccesses(createCorpusDto.userAccesses);
    const language = await this.languageService.findOne(languageCode);

    let domain: CorpusDomain;
    try {
      domain = await this.corpusDomainService.findOne(domainName);
    } catch {
      domain = await this.corpusDomainService.create({ name: domainName });
    }

    // Store the original file as-is for reference
    const uploadResult = await this.s3StorageService.uploadObject(
      file,
      this.s3StorageService.originalCorpusBucket,
    );

    // Split into sentence blocks so the corpus can be viewed and copied later
    const sentences = await this.corpusProcesserService.processCorpusFile(
      file,
      createCorpusDto.pageSkips,
    );

    //TODO: use the specified method to calculate this (e.g. for HUN, the university will provide one that can be selected on the UI)
    // Calculate phonetical coverage
    //     calculate phoneticalCoverage!: number;

    return this.entityManager.transaction(async (tx) => {
      const corpus = await tx.save(
        tx.create(Corpus, {
          name,
          visibility,
          language,
          domain,
          uploaderId: uploader.id,
          s3Link: uploadResult.url,
          blockCount: sentences.length,
        }),
      );

      //Create accesses for protected corpora
      if (visibility === CorpusVisibility.PROTECTED && userAccessIds.length > 0) {
        await tx
          .createQueryBuilder()
          .insert()
          .into(UserCorpusAccess)
          .values(
            userAccessIds.map((userId) => ({
              userId,
              corpusId: corpus.id,
            })),
          )
          .orIgnore()
          .execute();
      }

      await tx.insert(
        CorpusBlock,
        sentences.map((text, index) => ({
          corpus,
          blockIndex: index,
          text,
        })),
      );

      return corpus;
    });
  }

  // Master blocks of the corpus itself (not bound to any project)
  async getCorpusBlocks(
    corpusId: string,
    userId: string,
    from: number,
    to: number,
  ): Promise<string[]> {
    // Access is enforced by UserCorpusAccessGuard on the route; just ensure it exists.
    await this._findOne(corpusId);
    const blocks = await this.corpusBlockRepository.find({
      where: { corpus: { id: corpusId }, corpusProject: IsNull() },
      order: { blockIndex: 'ASC' },
      skip: from,
      take: to - from,
    });
    return blocks.map((b) => b.text);
  }

  async remove(id: string): Promise<void> {
    const corpus = await this._findOne(id); // throws 404 if not found

    try {
      await this.corpusRepository.delete(id);
    } catch (err) {
      if (err instanceof QueryFailedError && (err as any).code === '23503') {
        throw new ConflictException('httpErrors.corpus_in_use'); //TODO: translate
      }
      throw err;
    }

    // s3Link points to the original file; only delete it once the DB row is gone
    await this.s3StorageService.deleteObject(
      corpus.s3Link,
      this.s3StorageService.originalCorpusBucket,
    );
  }

  //Save recordings for the specified corpus blocks
  //If the block already has a recording, it should be overwritten
  //Returns the newly created audio file per block so the client can refresh it
  async saveRecordings(
    requesterId: string,
    projectId: string,
    masterRecording: Blob,
    recordings: BufferedRecording[],
  ): Promise<SavedRecording[]> {
    if (recordings.length === 0) return [];

    //Get corpus from the first block, and check that all blocks belong to the same corpus
    const firstBlock = await this.corpusBlockRepository.findOne({
      where: { id: recordings[0].blockId },
      relations: ['corpus'],
    });

    if (!firstBlock) {
      throw new BadRequestException(
        `CorpusBlock not found: ${recordings[0].blockId}`,
      );
    }

    const corpusId = firstBlock.corpus.id;
    for (const recording of recordings) {
      const block = await this.corpusBlockRepository.findOne({
        where: { id: recording.blockId },
        relations: ['corpus'],
      });
      if (!block) {
        throw new BadRequestException(
          `CorpusBlock not found: ${recording.blockId}`,
        );
      }

      if (block.corpus.id !== corpusId) {
        throw new BadRequestException(
          `CorpusBlock ${recording.blockId} does not belong to the same corpus as the first block`,
        );
      }
    }

    //TODO: Check user permission

    // Load all referenced blocks (with any existing recording, so we can replace it)
    const blockIds = recordings.map((r) => r.blockId);
    const blocks = await this.corpusBlockRepository.find({
      where: { id: In(blockIds) },
      relations: ['corpus', 'corpusProject', 'audioFile'],
    });

    if (blocks.length !== blockIds.length) {
      const found = new Set(blocks.map((b) => b.id));
      const missing = blockIds.filter((id) => !found.has(id));
      throw new BadRequestException(
        `CorpusBlock(s) not found: ${missing.join(', ')}`,
      );
    }

    // All blocks must belong to the given project; the project's audioChecks
    // then determine which quality checks to run below.
    const foreign = blocks.filter((b) => b.corpusProject?.id !== projectId);
    if (foreign.length > 0) {
      throw new BadRequestException(
        `CorpusBlock(s) do not belong to project ${projectId}: ${foreign
          .map((b) => b.id)
          .join(', ')}`,
      );
    }
    const audioChecks = blocks[0].corpusProject?.audioChecks ?? [];
    //TODO: add transcription API call here to whisper!

    // Create an AudioFile per recording (S3 upload + DB row), point the block at
    // it, run the transcription check, and replace any previous recording.
    const blockById = new Map(blocks.map((b) => [b.id, b]));
    const saved: SavedRecording[] = [];
    const aqcInputs: { id: string; blob: Blob }[] = [];

    for (const recording of recordings) {
      const block = blockById.get(recording.blockId)!;
      const previousAudioFile = block.audioFile;

      const audioFile = await this.audioFileService.create({
        blob: recording.blob,
        name: `${block.corpusProject!.name}-${block.blockIndex}.wav`,
        durationSeconds: recording.durationSeconds,
        transcription: recording.transcription,
        projectId: block.corpusProject!.id,
      });
      block.audioFile = audioFile;

      // Transcription check: normalize prompt + recognized text, then compare.
      const matches =
        normalizeTranscript(block.text) ===
        normalizeTranscript(recording.transcription);
      await this.audioQualityService.setAudioQuality(
        audioFile.id,
        AudioQualityType.TranscriptionCheck,
        { values: [matches ? 1 : 0] },
        requesterId,
      );

      await this.corpusBlockRepository.save(block);

      if (previousAudioFile) {
        await this.audioFileService.remove(previousAudioFile);
      }

      saved.push({
        blockId: block.id,
        audioFile: {
          id: audioFile.id,
          s3Link: audioFile.s3Link,
          transcription: audioFile.transcription,
        },
      });
      // Tag each recording with its new audio-file id for the quality checker.
      aqcInputs.push({ id: audioFile.id, blob: recording.blob });
    }

    // Run the audio quality checker once for all recordings, then persist each
    // audio file's measures — keyed by the audio id the checker reports back.
    if (audioChecks.length > 0) {
      const qualityMeasures = await this.audioQualityService.callAqcService(
        audioChecks,
        masterRecording,
        aqcInputs,
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

    return saved;
  }

  // Recomputes (upserts) the TranscriptionCheck for an audio file by comparing the
  // given transcription against its block's prompt text. Used when the transcription
  // is edited without re-recording.
  async recomputeTranscriptionCheck(
    requesterId: string,
    audioFileId: string,
    transcription: string,
  ): Promise<void> {
    const block = await this.corpusBlockRepository.findOne({
      where: { audioFile: { id: audioFileId } },
    });
    if (!block) return;

    const matches =
      normalizeTranscript(block.text) === normalizeTranscript(transcription);
    await this.audioQualityService.setAudioQuality(
      audioFileId,
      AudioQualityType.TranscriptionCheck,
      { values: [matches ? 1 : 0] },
      requesterId,
    );
  }
}

export interface BufferedRecording {
  blob: Blob;
  blockId: string;
  blockIndex: number; //not needed in this code part
  durationSeconds: number;
  transcription: string; //From WebSpeech API or Whisper
}

export interface SavedRecording {
  blockId: string;
  audioFile: {
    id: string;
    s3Link: string;
    transcription: string;
  };
}

//Multipart sends userAccesses as a JSON string; JSON bodies send a real array.
function parseUserAccesses(value: unknown): string[] {
  if (Array.isArray(value)) return value as string[];
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [value];
    } catch {
      return [value];
    }
  }
  return [];
}
