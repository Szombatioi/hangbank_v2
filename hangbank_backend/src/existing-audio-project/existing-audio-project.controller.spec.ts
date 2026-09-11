import { Test, TestingModule } from '@nestjs/testing';
import { ExistingAudioProjectController } from './existing-audio-project.controller';
import { ExistingAudioProjectService } from './existing-audio-project.service';

describe('ExistingAudioProjectController', () => {
  let controller: ExistingAudioProjectController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExistingAudioProjectController],
      providers: [ExistingAudioProjectService],
    }).compile();

    controller = module.get<ExistingAudioProjectController>(ExistingAudioProjectController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
