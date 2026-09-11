import { Module } from '@nestjs/common';
import { ProjectService } from './project.service';
import { ProjectRoleService } from './project-role.service';
import { ProjectController } from './project.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CorpusBasedProject } from './entities/corpus-based-project.entity';
import { Speaker } from './entities/speaker.entity';
import { ProjectRole } from './entities/project-role.entity';
import { CorpusBlock } from 'src/corpus/entities/corpus-block.entity';
import { AuthModule } from 'src/auth/auth.module';
import { CorpusModule } from 'src/corpus/corpus.module';
import { AudioFileModule } from 'src/audio-file/audio-file.module';
import { S3StorageClientModule } from 'src/s3-storage-client/s3-storage-client.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CorpusBasedProject, Speaker, ProjectRole, CorpusBlock]),
    AuthModule,
    CorpusModule,
    S3StorageClientModule,
    AudioFileModule,
  ],
  controllers: [ProjectController],
  providers: [ProjectService, ProjectRoleService],
})
export class ProjectModule {}
