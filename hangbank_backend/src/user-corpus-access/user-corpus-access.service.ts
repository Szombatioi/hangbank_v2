import { Injectable } from '@nestjs/common';
import { CreateUserCorpusAccessDto } from './dto/create-user-corpus-access.dto';
import { UpdateUserCorpusAccessDto } from './dto/update-user-corpus-access.dto';
import { UserCorpusAccess } from './entities/user-corpus-access.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class UserCorpusAccessService {
  constructor(
    @InjectRepository(UserCorpusAccess) private readonly userCorpusAccessRepo: Repository<UserCorpusAccess>
  ) {}

  async grantAccess(userId: string, corpusId: string): Promise<void> {
    await this.userCorpusAccessRepo
    .createQueryBuilder()
    .insert()
    .orIgnore()
    .values({ userId, corpusId })
    .execute();
  }
  
  async hasAccess(userId: string, corpusId: string): Promise<boolean> {
    return this.userCorpusAccessRepo.existsBy({ userId, corpusId });
  }

  async revokeAccess(userId: string, corpusId: string): Promise<void> {
    await this.userCorpusAccessRepo.delete({ userId, corpusId });
  }
}

