import * as fs from "fs";
import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { buffer } from "stream/consumers";
import { QualityMeasure } from "./strategy/audio_quality_checker";

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('TEST 1?', () => {
      const test_file_path = './test/test-audio-file.wav';
      if(!fs.existsSync(test_file_path)) {
        console.error(`Test audio file not found at path: ${test_file_path}`);
        process.exit(1);
      }
      
      const audioFile = {
        buffer: fs.readFileSync(test_file_path),
        originalname: 'test-audio-file.wav',
        mimetype: 'audio/wav',
      } as Express.Multer.File;

      //TODO
      const expectedResult: QualityMeasure[] = [
        {
          name: "quality_loudness",
          value: 0,
          threshold: 0,
          result: false,
        },
        {
          name: "quality_quietness",
          value: 0,
          threshold: 0,
          result: false,
        }
      ];

      expect(appController.checkAudioQuality(audioFile)).toEqual(expectedResult);
    });
  });
});
