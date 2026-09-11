import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';

@Injectable()
export class ExistingAudioProjectService {
    constructor(
        @InjectQueue('jobs') private readonly jobQueue: Queue
    ) { }

    async testQueue(dto: any) {
        await this.jobQueue.add(
            'test-job',
            { 
                audioId: dto.audioId,
                s3Url: dto.s3Url,
                language: dto.language,
            },
            { attempts: 3, backoff: { type: 'exponential', delay: 1000 } }
        );
    }
}
