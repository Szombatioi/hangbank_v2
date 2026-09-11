import { Module } from '@nestjs/common';
import { ExistingAudioProjectService } from './existing-audio-project.service';
import { ExistingAudioProjectController } from './existing-audio-project.controller';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get('REDIS_PASSWORD') || undefined,
        },
      }),
    }),

    BullModule.registerQueue({ name: "jobs" }),
  ],
  controllers: [ExistingAudioProjectController],
  providers: [ExistingAudioProjectService],
})
export class ExistingAudioProjectModule {}
