import { Module } from '@nestjs/common';
import { ExportService } from './export.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from 'src/project/entities/project.entity';
import { LJSpeechExportStrategy } from './implementations/ljspeech-export';
import { S3StorageModule } from 'src/s3-storage/s3-storage.module';
import { ExportController } from './export.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project]),
    S3StorageModule
  ],
  controllers: [ExportController],
  providers: [ExportService, LJSpeechExportStrategy],
  exports: [ExportService]
})
export class ExportModule {}
