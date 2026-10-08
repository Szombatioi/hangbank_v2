import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Repository } from 'typeorm';
import { AudioFile } from 'src/audio-file/entities/audio-file.entity';

interface TranscriptionResult {
  audio_id: string;
  text: string;
}

@Processor('results', { removeOnComplete: { count: 1000 } })
export class TranscriptionResultProcessor extends WorkerHost {
  constructor(
    @InjectRepository(AudioFile)
    private readonly audioFileRepository: Repository<AudioFile>,
  ) {
    super();
  }

  async process(job: Job<TranscriptionResult>): Promise<void> {
    const { audio_id, text } = job.data;
    Logger.log(`Processing result for ${audio_id}: ${text}`);

    await this.audioFileRepository.update(
      { id: audio_id, transcription: '' },
      { transcription: text.trim() },
    );
  }
}
