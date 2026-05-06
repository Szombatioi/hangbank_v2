import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AudioQuality } from './entities/audio-quality.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AudioQuality])],
  exports: [TypeOrmModule],
})
export class AudioQualityModule {}
