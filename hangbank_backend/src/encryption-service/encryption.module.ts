import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from 'src/project/entities/project.entity';
import { S3StorageClientModule } from 'src/s3-storage-client/s3-storage-client.module';
import { EncryptionService } from './encryption.service';

@Module({
  imports: [],
  controllers: [],
  providers: [EncryptionService],
  exports: [EncryptionService]
})
export class EncryptionModule {}
