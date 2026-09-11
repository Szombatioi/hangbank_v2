import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AudioFile } from './entities/audio-file.entity';
import { AudioQualityModule } from 'src/audio-quality/audio-quality.module';
import { S3StorageClientModule } from 'src/s3-storage-client/s3-storage-client.module';
import { AudioFileService } from './audio-file.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([AudioFile]),
    forwardRef(() =>AudioQualityModule),
    S3StorageClientModule
  ],
  providers: [AudioFileService],
  exports: [TypeOrmModule, AudioFileService],
})
export class AudioFileModule {}
