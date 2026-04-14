import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateCorpusDto } from './dto/create-corpus.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Corpus } from './entities/corpus.entity';
import { Repository } from 'typeorm';
import { CorpusDomainService } from 'src/corpus-domain/corpus-domain.service';
import { LanguageService } from 'src/language/language.service';
import { CorpusDomain } from 'src/corpus-domain/entities/corpus-domain.entity';
import type { IJwtPayload } from '@hangbank/shared';
import { S3StorageService } from 'src/s3-storage/s3-storage.service';
import { CorpusProcesserService } from './corpus-processer.service';

@Injectable()
export class CorpusService {
  constructor(
    @InjectRepository(Corpus) private readonly corpusRepository: Repository<Corpus>,
    @Inject() private readonly languageService: LanguageService,
    @Inject() private readonly corpusDomainService: CorpusDomainService,
    @Inject() private readonly s3StorageService: S3StorageService,
    @Inject() private readonly corpusProcesserService: CorpusProcesserService,
  ) {}

  async create(uploader: IJwtPayload, createCorpusDto: CreateCorpusDto, file: Express.Multer.File): Promise<Corpus> {
    const { name, languageCode, visibility, domainName } = createCorpusDto;
    console.log("Language")
    const language = await this.languageService.findOne(languageCode);

    console.log("Domain")
    let domain: CorpusDomain;
    try {
      domain = await this.corpusDomainService.findOne(domainName);
    } catch {
      domain = await this.corpusDomainService.create({ name: domainName });
    }

    //TODO: necessary?
    // Upload original file to the object storage
    console.log("Upload original")
    await this.s3StorageService.uploadObject(file, this.s3StorageService.originalCorpusBucket); //No catch, if upload fails, the whole process should fail and throw an error

    // Split and processed the file (e.g. create blocks of sentences, remove hyphenation, etc.)
    console.log("Before split")
    const txtBuffer = await this.corpusProcesserService.processCorpusFile(file); //No catch, if processing fails, the whole process should fail and throw an error
    console.log("After split")
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

    console.log("Create corpus entity")
    const corpus = this.corpusRepository.create({
      name,
      visibility,
      language,
      domain,
      uploaderId: uploader.id,
      s3Link: uploadResult.url,
    });

    console.log("Save")
    return this.corpusRepository.save(corpus);
  }
}
