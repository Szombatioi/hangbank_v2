import { ConflictException,
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { CreateCorpusDto } from './dto/create-corpus.dto';
import { InjectRepository } from '@nestjs/typeorm';
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
  ) {}

  async findOne(id: string): Promise<Corpus> {
    const corpus = await this.corpusRepository.findOne({
      where: { id },
      relations: ['language', 'domain'],
    });
    if (!corpus) {
      throw new NotFoundException(`Corpus with id '${id}' not found`);
    }
    return corpus;
  }

  //TODO: handle PROTECTED access via UserCorpusAccess once implemented
  async findOneForUser(id: string, userId: string): Promise<Corpus> {
    const corpus = await this.findOne(id);
    if (
      corpus.visibility === CorpusVisibility.PRIVATE &&
      corpus.uploaderId !== userId
    ) {
      throw new ForbiddenException(`No access to corpus with id '${id}'`);
    }
    return corpus;
  }

  async findAll(uploaderId: string): Promise<Corpus[]> {
    return this.corpusRepository.find({
      where: { uploaderId },
      relations: ['language', 'domain'],
      order: { createdAt: 'DESC' },
    });
  }

  async create(
    uploader: IJwtPayload,
    createCorpusDto: CreateCorpusDto,
    file: Express.Multer.File,
  ): Promise<Corpus> {
    const { name, languageCode, visibility, domainName } = createCorpusDto;
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

    const corpus = await this.corpusRepository.save(
      this.corpusRepository.create({
        name,
        visibility,
        language,
        domain,
        uploaderId: uploader.id,
        s3Link: uploadResult.url,
        blockCount: sentences.length,
      }),
    );

    await this.corpusBlockRepository.insert(
      sentences.map((text, index) => ({
        corpus,
        blockIndex: index,
        text,
      })),
    );

    return corpus;
  }

  // Master blocks of the corpus itself (not bound to any project)
  async getCorpusBlocks(
    corpusId: string,
    userId: string,
    from: number,
    to: number,
  ): Promise<string[]> {
    await this.findOneForUser(corpusId, userId);
    const blocks = await this.corpusBlockRepository.find({
      where: { corpus: { id: corpusId }, corpusProject: IsNull() },
      order: { blockIndex: 'ASC' },
      skip: from,
      take: to - from,
    });
    return blocks.map((b) => b.text);
  }

  //Save recordings for the specified corpus blocks
  //If the block already has a recording, it should be overwritten
  async saveRecordings(recordings: BufferedRecording[]): Promise<void> {
    if (recordings.length === 0) return;

    // Load all referenced blocks
    const blockIds = recordings.map((r) => r.blockId);
    const blocks = await this.corpusBlockRepository.find({
      where: { id: In(blockIds) },
      relations: ['corpus', 'corpusProject'],
    });

    if (blocks.length !== blockIds.length) {
      const found = new Set(blocks.map((b) => b.id));
      const missing = blockIds.filter((id) => !found.has(id));
      throw new BadRequestException(
        `CorpusBlock(s) not found: ${missing.join(', ')}`,
      );
    }

    // 3. Create an AudioFile per recording (S3 upload + DB row), then point the
    //    block at it. Overwrites prior recordings via the OneToOne FK.
    const blockById = new Map(blocks.map((b) => [b.id, b]));
    for (const recording of recordings) {
      const block = blockById.get(recording.blockId)!;
      const audioFile = await this.audioFileService.create({
        blob: recording.blob,
        name: `${block.corpusProject!.name}-${block.blockIndex}.wav`,
        durationSeconds: recording.durationSeconds,
        transcription: recording.transcription,
        projectId: block.corpusProject!.id,
      });

      block.audioFile = audioFile;
      await this.corpusBlockRepository.save(block);

      // TODO: run quality checks here (noise, clipping, level, transcript-match …)
      //       and upsert AudioQuality rows for the new audioFile.
    }
  }
}

export interface BufferedRecording {
  blob: Blob;
  blockId: string;
  blockIndex: number; //not needed in this code part
  durationSeconds: number;
  transcription: string; //From WebSpeech API or Whisper
}
