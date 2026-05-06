import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AudioFile } from './entities/audio-file.entity';
import { AudioQualityModule } from 'src/audio-quality/audio-quality.module';
import { AudioModificationModule } from 'src/audio-modification/audio-modification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AudioFile]),
    AudioQualityModule,
    AudioModificationModule,
  ],
  exports: [TypeOrmModule],
})
export class AudioFileModule {}
