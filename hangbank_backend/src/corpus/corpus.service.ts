import {
  ConflictException,
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
import { AudioQualityService } from 'src/audio-quality/audio-quality.service';
import { AudioQualityType } from 'src/audio-quality/entities/audio-quality.entity';

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
  ) { }

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

  async remove(id: string): Promise<void> {
    const corpus = await this.findOne(id); // throws 404 if not found

    try {
      await this.corpusRepository.delete(id);
    } catch (err) {
      // Postgres FK violation (23503): corpus is still referenced by one or more projects
      if (err instanceof QueryFailedError && (err as any).code === '23503') {
        throw new ConflictException('corpus_in_use');
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
    masterRecording: Blob,
    recordings: BufferedRecording[],
  ): Promise<SavedRecording[]> {
    if (recordings.length === 0) return [];

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
    const qualityMeasures = await this.audioQualityService.callAqcService(
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

function normalizeTranscript(text: string): string {
  const t = text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
    .trim();
  console.log(t);
  return t;
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
