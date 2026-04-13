import { Controller } from '@nestjs/common';
import { S3StorageService } from './s3-storage.service';

@Controller('s3-storage')
export class S3StorageController {
  constructor(private readonly s3StorageService: S3StorageService) {}
}
