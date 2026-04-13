import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateLanguageDto } from './dto/create-language.dto';
import { UpdateLanguageDto } from './dto/update-language.dto';
import { Language } from './entities/language.entity';

@Injectable()
export class LanguageService {
  constructor(
    @InjectRepository(Language)
    private readonly languageRepository: Repository<Language>,
  ) {}

  async create(createLanguageDto: CreateLanguageDto): Promise<Language> {
    const existing = await this.languageRepository.findOne({
      where: { code: createLanguageDto.code },
    });
    if (existing) {
      throw new ConflictException(
        `Language with code '${createLanguageDto.code}' already exists`,
      );
    }

    const language = this.languageRepository.create({
      ...createLanguageDto,
      isTranslated: createLanguageDto.isTranslated ?? false,
    });
    return this.languageRepository.save(language);
  }

  async findAll(): Promise<Language[]> {
    return this.languageRepository.find();
  }

  /** Returns only languages that have a complete UI translation. */
  async findAllTranslated(): Promise<Language[]> {
    return this.languageRepository.find({ where: { isTranslated: true } });
  }

  async findOne(code: string): Promise<Language> {
    const language = await this.languageRepository.findOne({ where: { code } });
    if (!language) {
      throw new NotFoundException(`Language with code '${code}' not found`);
    }
    return language;
  }

  async update(code: string, updateLanguageDto: UpdateLanguageDto): Promise<Language> {
    const language = await this.findOne(code);
    Object.assign(language, updateLanguageDto);
    return this.languageRepository.save(language);
  }

  async remove(code: string): Promise<void> {
    const language = await this.findOne(code);
    await this.languageRepository.remove(language);
  }
}
