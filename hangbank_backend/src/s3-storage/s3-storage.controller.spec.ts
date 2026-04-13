import { Test, TestingModule } from '@nestjs/testing';
import { S3StorageController } from './s3-storage.controller';
import { S3StorageService } from './s3-storage.service';

describe('S3StorageController', () => {
  let controller: S3StorageController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [S3StorageController],
      providers: [S3StorageService],
    }).compile();

    controller = module.get<S3StorageController>(S3StorageController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
