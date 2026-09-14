import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable } from '@nestjs/common';
import { Queue, randomUUID } from 'bullmq';
import { S3StorageService } from './s3-storage-client/s3-storage-client.service';

@Injectable()
export class AppService {
    constructor(
        @InjectQueue('jobs') private readonly jobQueue: Queue,
        private readonly s3StorageManager: S3StorageService
    ){}
    
    async testBatchUpload(files: Express.Multer.File[], language?: string){
        //Upload to s3
        files.map(async (file) => {
            const { filename, url } = await this.s3StorageManager.uploadObject(file, this.s3StorageManager.audioBucket);
            console.log(`Uploaded ${filename} to ${url}`);
            //Add to queue
            const id = `batch-test-${randomUUID()}`;
            await this.jobQueue.add(
                'batch-test-job',
                {
                    audio_id: id,
                    audio_name: filename,
                    language: language,
                },
                {
                    jobId: id,
                    removeOnComplete: true,
                    removeOnFail: 1000,
                }
            );

            console.log("Added job to queue for file: ", filename);
        });
    }
}
