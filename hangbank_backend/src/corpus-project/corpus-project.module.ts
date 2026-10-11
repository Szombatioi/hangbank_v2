import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CorpusBasedProject } from 'src/project/entities/corpus-based-project.entity';
import { Speaker } from 'src/project/entities/speaker.entity';
import { CorpusBlock } from 'src/corpus/entities/corpus-block.entity';
import { ProjectModule } from 'src/project/project.module';
import { AuthModule } from 'src/auth/auth.module';
import { CorpusModule } from 'src/corpus/corpus.module';
import { AudioFileModule } from 'src/audio-file/audio-file.module';
import { S3StorageClientModule } from 'src/s3-storage-client/s3-storage-client.module';
import { CorpusProjectService } from './corpus-project.service';
import { CorpusProjectController } from './corpus-project.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([CorpusBasedProject, Speaker, CorpusBlock]),
    ProjectModule,
    AuthModule,
    CorpusModule,
    AudioFileModule,
    S3StorageClientModule,
  ],
  controllers: [CorpusProjectController],
  providers: [CorpusProjectService],
})
export class CorpusProjectModule {}
