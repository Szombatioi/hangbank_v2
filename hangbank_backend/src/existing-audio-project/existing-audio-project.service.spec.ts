import { Test, TestingModule } from '@nestjs/testing';
import { ExistingAudioProjectService } from './existing-audio-project.service';

describe('ExistingAudioProjectService', () => {
  let service: ExistingAudioProjectService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExistingAudioProjectService],
    }).compile();

    service = module.get<ExistingAudioProjectService>(ExistingAudioProjectService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
