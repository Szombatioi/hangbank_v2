import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AudioQuality } from './entities/audio-quality.entity';
import { AudioQualityService } from './audio-quality.service';
import { AudioQualityController } from './audio-quality.controller';
import { AudioFileModule } from 'src/audio-file/audio-file.module';
import { HttpModule } from '@nestjs/axios/dist/http.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AudioQuality]),
    forwardRef(() => AudioFileModule),
    HttpModule
  ],
  controllers: [AudioQualityController],
  providers: [AudioQualityService],
  exports: [TypeOrmModule, AudioQualityService],
})
export class AudioQualityModule {}
