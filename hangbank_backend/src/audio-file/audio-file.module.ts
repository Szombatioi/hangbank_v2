import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AudioFile } from './entities/audio-file.entity';
import { AudioQualityModule } from 'src/audio-quality/audio-quality.module';
import { AudioModificationModule } from 'src/audio-modification/audio-modification.module';
import { S3StorageModule } from 'src/s3-storage/s3-storage.module';
import { AudioFileService } from './audio-file.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([AudioFile]),
    AudioQualityModule,
    AudioModificationModule,
    S3StorageModule
  ],
  providers: [AudioFileService],
  exports: [TypeOrmModule, AudioFileService],
})
export class AudioFileModule {}
