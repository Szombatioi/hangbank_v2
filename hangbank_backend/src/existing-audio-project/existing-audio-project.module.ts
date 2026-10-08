import { Module } from '@nestjs/common';
import { ExistingAudioProjectService } from './existing-audio-project.service';
import { ExistingAudioProjectController } from './existing-audio-project.controller';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AudioFileModule } from 'src/audio-file/audio-file.module';
import { AudioQualityModule } from 'src/audio-quality/audio-quality.module';
import { AuthModule } from 'src/auth/auth.module';
import { LanguageModule } from 'src/language/language.module';
import { S3StorageClientModule } from 'src/s3-storage-client/s3-storage-client.module';
import { TranscriptionResultProcessor } from './transcription-result-processor.processor';

@Module({
  imports: [
    // BullModule.forRootAsync({
    //   imports: [ConfigModule],
    //   inject: [ConfigService],
    //   useFactory: (config: ConfigService) => ({
    //     connection: {
    //       host: config.get('REDIS_HOST', 'localhost'),
    //       port: config.get<number>('REDIS_PORT', 6379),
    //       password: config.get('REDIS_PASSWORD') || undefined,
    //     },
    //   }),
    // }),

    BullModule.registerQueue({ name: 'jobs' }),
    BullModule.registerQueue({ name: 'results' }),
    AudioFileModule,
    AudioQualityModule,
    AuthModule,
    LanguageModule,
    S3StorageClientModule,
  ],
  controllers: [ExistingAudioProjectController],
  providers: [
    ExistingAudioProjectService,
    TranscriptionResultProcessor,
  ],
})
export class ExistingAudioProjectModule {}
