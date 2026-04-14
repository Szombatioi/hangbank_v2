import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCorpusDomainDto } from './dto/create-corpus-domain.dto';
import { CorpusDomain } from './entities/corpus-domain.entity';

@Injectable()
export class CorpusDomainService {
  constructor(
    @InjectRepository(CorpusDomain)
    private readonly corpusDomainRepository: Repository<CorpusDomain>,
  ) {}

  async create(createCorpusDomainDto: CreateCorpusDomainDto): Promise<CorpusDomain> {
    const existing = await this.corpusDomainRepository.findOne({
      where: { name: createCorpusDomainDto.name },
    });
    if (existing) {
      throw new ConflictException(`Domain '${createCorpusDomainDto.name}' already exists`);
    }

    const domain = this.corpusDomainRepository.create(createCorpusDomainDto);
    return this.corpusDomainRepository.save(domain);
  }

  async findAll(): Promise<CorpusDomain[]> {
    return this.corpusDomainRepository.find();
  }

  async findOne(name: string): Promise<CorpusDomain> {
    const domain = await this.corpusDomainRepository.findOne({ where: { name } });
    if (!domain) {
      throw new NotFoundException(`Domain '${name}' not found`);
    }
    return domain;
  }

  async remove(name: string): Promise<void> {
    const domain = await this.findOne(name);
    await this.corpusDomainRepository.remove(domain);
  }
}
