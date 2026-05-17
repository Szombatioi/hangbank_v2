import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateCorpusDto } from './dto/create-corpus.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Corpus } from './entities/corpus.entity';
import { CorpusBlock } from './entities/corpus-block.entity';
import { In, Repository } from 'typeorm';
import { CorpusVisibility } from './entities/corpus-visibility';
import { CorpusDomainService } from 'src/corpus-domain/corpus-domain.service';
import { LanguageService } from 'src/language/language.service';
import { CorpusDomain } from 'src/corpus-domain/entities/corpus-domain.entity';
import type { IJwtPayload } from '@hangbank/shared';
import { S3StorageService } from 'src/s3-storage/s3-storage.service';
import { CorpusProcesserService } from './corpus-processer.service';
import * as readline from 'readline';
import Stream from 'stream';
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

    //TODO: necessary?
    // Upload original file to the object storage
    await this.s3StorageService.uploadObject(
      file,
      this.s3StorageService.originalCorpusBucket,
    ); //No catch, if upload fails, the whole process should fail and throw an error

    // Split and processed the file (e.g. create blocks of sentences, remove hyphenation, etc.)
    const txtBuffer = await this.corpusProcesserService.processCorpusFile(
      file,
      createCorpusDto.pageSkips,
    ); //No catch, if processing fails, the whole process should fail and throw an error
    const txtFile = {
      ...file,
      buffer: txtBuffer,
      originalname: file.originalname.replace(/\.[^/.]+$/, '.txt'),
      mimetype: 'text/plain',
      size: txtBuffer.length,
    } as Express.Multer.File;
    console.log('Txt file created');

    // Upload the splitted and processed file to the object storage
    console.log('Upload txt');
    const uploadResult = await this.s3StorageService.uploadObject(
      txtFile,
      this.s3StorageService.corpusBucket,
    );

    //TODO: use the specified method to calculate this (e.g. for HUN, the university will provide one that can be selected on the UI)
    // Calculate phonetical coverage
    //     calculate phoneticalCoverage!: number;

    const blockCount = txtBuffer
      .toString('utf-8')
      .split('\n')
      .filter((l) => l.trim().length > 0).length;

    console.log('Create corpus entity');
    const corpus = this.corpusRepository.create({
      name,
      visibility,
      language,
      domain,
      uploaderId: uploader.id,
      s3Link: uploadResult.url,
      blockCount,
    });

    console.log('Save');
    return this.corpusRepository.save(corpus);
  }

  async getCorpusBlocks(
    corpusId: string,
    from: number,
    to: number,
  ): Promise<string[]> {
    const corpus = await this.findOne(corpusId);
    //TODO: check access rights based on corpus.visibility and user role (admin, uploader, etc.)
    //Download object
    const fileStream = await this.s3StorageService.downloadObject(
      corpus.s3Link,
      this.s3StorageService.corpusBucket,
    );
    //Convert stream to string
    const lines = await this.streamToLines(fileStream);
    return lines.slice(from, to); //TO = exclusive, FROM = inclusive
  }

  async streamToLines(stream: Stream.Readable): Promise<string[]> {
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
    const lines: string[] = [];
    for await (const line of rl) {
      const trimmed = line.trim();
      if (trimmed.length > 0) lines.push(trimmed);
    }
    return lines;
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
        name: `${block.corpusProject.name}-${block.blockIndex}.wav`,
        durationSeconds: recording.durationSeconds,
        transcription: recording.transcription,
        projectId: block.corpusProject.id,
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
