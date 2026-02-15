import { BadRequestException, Injectable } from '@nestjs/common';
import { QuietnessCheck } from './strategy/quietness_check';
import { LoudnessCheck } from './strategy/loudness_check';
import { AudioQualityChecker, AudioQualityCheckerStrategy, QualityMeasure } from './strategy/audio_quality_checker';
import * as wav from "node-wav";

@Injectable()
export class AppService implements AudioQualityChecker {
  
  //Returns the list of used strategies for audio quality check
  async collectStrategies(){
    //TODO: In a real implementation, you would dynamically load strategies from a folder or database
    return [
      new QuietnessCheck(),
      new LoudnessCheck(),
    ]
  }

  async checkAudioQuality(audioFile: Express.Multer.File): Promise<QualityMeasure[]> {
    if(!audioFile) {
      throw new BadRequestException("No audio file provided");
    }

    if(!['audio/wav', 'audio/x-wav', 'audio/wave'].includes(audioFile.mimetype)) {
      throw new BadRequestException("File must be a WAV audio file");
    }
    
    const strategies = this.collectStrategies();
    let results: QualityMeasure[] = [];

    const decoded = wav.decode(audioFile.buffer);
    const samples: number[][] = decoded.channelData;
    
    //Collecting the strategies and executing them in parallel
    const tasks: Array<(samples: number[][]) => Promise<QualityMeasure>> = [];
    for(const strategy of await strategies) {
      tasks.push(async (samples) => await strategy.checkQuality(samples));
    }

    const resultsPromises = tasks.map(task => task(samples));
    results = await Promise.all(resultsPromises);

    return results;
  }

}
