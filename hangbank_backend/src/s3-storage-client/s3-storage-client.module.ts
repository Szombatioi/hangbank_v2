import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { S3StorageService } from './s3-storage-client.service';

@Module({
  imports: [HttpModule],
  providers: [S3StorageService],
  exports: [S3StorageService],
})
export class S3StorageClientModule {}
