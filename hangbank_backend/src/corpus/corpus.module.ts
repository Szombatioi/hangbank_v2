import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Corpus } from './entities/corpus.entity';
import { CorpusService } from './corpus.service';
import { CorpusProcesserService } from './corpus-processer.service';
import { CorpusController } from './corpus.controller';
import { LanguageModule } from '../language/language.module';
import { CorpusDomainModule } from 'src/corpus-domain/corpus-domain.module';
import { AuthModule } from 'src/auth/auth.module';
import { S3StorageModule } from 'src/s3-storage/s3-storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Corpus]),
    LanguageModule,
    CorpusDomainModule,
    // AuthModule
    S3StorageModule
  ],
  controllers: [CorpusController],
  providers: [CorpusService, CorpusProcesserService],
  exports: [CorpusService],
})
export class CorpusModule {}
