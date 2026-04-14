import { Module } from '@nestjs/common';
import { S3StorageService } from './s3-storage.service';
import { S3StorageController } from './s3-storage.controller';

@Module({
  controllers: [S3StorageController],
  providers: [S3StorageService],
  exports: [S3StorageService]
})
export class S3StorageModule {}
