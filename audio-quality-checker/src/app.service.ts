import { BadRequestException, Injectable } from '@nestjs/common';
// import { QuietnessCheck } from './strategy/quietness_check';
// import { LoudnessCheck } from './strategy/loudness_check';
import { AudioQualityChecker, AudioQualityCheckerStrategy, QualityMeasure, WavDecodeResult } from './strategy/audio_quality_checker';
import * as wav from "node-wav";
import { VolumeCheck } from './strategy/volume_check';
import { NoiseCheck } from './strategy/noise_check';

@Injectable()
export class AppService implements AudioQualityChecker {
  
  //Returns the list of used strategies for audio quality check
  async collectStrategies(){
    //TODO: In a real implementation, you would dynamically load strategies from a folder or database
    return [
      // new QuietnessCheck(),
      // new LoudnessCheck(),
      // new VolumeCheck(),
      new NoiseCheck(),
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

    console.log("Sample rate:", decoded.sampleRate);
    console.log("Number of channels:", decoded.channelData.length);
    console.log("Length of first channel:", decoded.channelData[0].length);
    console.log("Duration (seconds):", decoded.channelData[0].length / decoded.sampleRate);


    // const samples: number[][] = decoded.channelData;
    
    //Collecting the strategies and executing them in parallel
    const tasks: Array<(wav: WavDecodeResult) => Promise<QualityMeasure>> = [];
    for(const strategy of await strategies) {
      tasks.push(async (wav) => await strategy.checkQuality(wav));
    }

    const resultsPromises = tasks.map(task => task(decoded));
    results = await Promise.all(resultsPromises);

    return results;
  }

}
