import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserCorpusAccessService } from './user-corpus-access.service';
import { UserCorpusAccessController } from './user-corpus-access.controller';
import { UserCorpusAccess } from './entities/user-corpus-access.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserCorpusAccess])
  ],
  controllers: [UserCorpusAccessController],
  providers: [UserCorpusAccessService],
})
export class UserCorpusAccessModule {}
