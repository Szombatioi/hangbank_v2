import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { CreateCorpusDto } from './dto/create-corpus.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Corpus } from './entities/corpus.entity';
import { Repository } from 'typeorm';
import { CorpusVisibility } from './entities/corpus-visibility';
import { CorpusDomainService } from 'src/corpus-domain/corpus-domain.service';
import { LanguageService } from 'src/language/language.service';
import { CorpusDomain } from 'src/corpus-domain/entities/corpus-domain.entity';
import type { IJwtPayload } from '@hangbank/shared';
import { S3StorageService } from 'src/s3-storage/s3-storage.service';
import { CorpusProcesserService } from './corpus-processer.service';
import * as readline from 'readline';
import Stream from 'stream';

@Injectable()
export class CorpusService {
  constructor(
    @InjectRepository(Corpus) private readonly corpusRepository: Repository<Corpus>,
    @Inject() private readonly languageService: LanguageService,
    @Inject() private readonly corpusDomainService: CorpusDomainService,
    @Inject() private readonly s3StorageService: S3StorageService,
    @Inject() private readonly corpusProcesserService: CorpusProcesserService,
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

  async findAll(uploaderId: string): Promise<Corpus[]> {
    return this.corpusRepository.find({
      where: { uploaderId },
      relations: ['language', 'domain'],
      order: { createdAt: 'DESC' },
    });
  }

  async create(uploader: IJwtPayload, createCorpusDto: CreateCorpusDto, file: Express.Multer.File): Promise<Corpus> {
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
    await this.s3StorageService.uploadObject(file, this.s3StorageService.originalCorpusBucket); //No catch, if upload fails, the whole process should fail and throw an error

    // Split and processed the file (e.g. create blocks of sentences, remove hyphenation, etc.)
    const txtBuffer = await this.corpusProcesserService.processCorpusFile(file, createCorpusDto.pageSkips); //No catch, if processing fails, the whole process should fail and throw an error
    const txtFile = {
      ...file,
      buffer: txtBuffer,
      originalname: file.originalname.replace(/\.[^/.]+$/, '.txt'),
      mimetype: 'text/plain',
      size: txtBuffer.length,
    } as Express.Multer.File;
    console.log("Txt file created")

    // Upload the splitted and processed file to the object storage
    console.log("Upload txt")
    const uploadResult = await this.s3StorageService.uploadObject(
      txtFile,
      this.s3StorageService.corpusBucket,
    );

    //TODO: use the specified method to calculate this (e.g. for HUN, the university will provide one that can be selected on the UI)
    // Calculate phonetical coverage
    //     calculate phoneticalCoverage!: number;

    const blockCount = txtBuffer.toString('utf-8').split('\n').filter(l => l.trim().length > 0).length;

    console.log("Create corpus entity")
    const corpus = this.corpusRepository.create({
      name,
      visibility,
      language,
      domain,
      uploaderId: uploader.id,
      s3Link: uploadResult.url,
      blockCount,
    });

    console.log("Save")
    return this.corpusRepository.save(corpus);
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

    // Only delete from S3 once the DB row is gone — keeps storage consistent on DB failure
    await this.s3StorageService.deleteObject(corpus.s3Link, this.s3StorageService.corpusBucket);
  }

  async getCorpusBlocks(corpusId: string, from: number, to: number): Promise<string[]> {
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
}
