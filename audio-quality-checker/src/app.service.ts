import { BadRequestException, Injectable } from '@nestjs/common';
// import { QuietnessCheck } from './strategy/quietness_check';
// import { LoudnessCheck } from './strategy/loudness_check';
import { AudioQualityChecker, AudioQualityCheckerStrategy, QualityMeasure, WavDecodeResult } from './strategy/audio_quality_checker';
import * as wav from "node-wav";
import { VolumeCheck } from './strategy/volume_check';
import { NoiseCheck } from './strategy/noise_check';
import { SpeakerCheck } from './strategy/speaker_check';

@Injectable()
export class AppService implements AudioQualityChecker {
  
  //Returns the list of used strategies for audio quality check
  async collectStrategies(){
    //TODO: In a real implementation, you would dynamically load strategies from a folder or database
    return [
      // new QuietnessCheck(),
      // new LoudnessCheck(),
      new VolumeCheck(),
      new NoiseCheck(),
      new SpeakerCheck(),
    ]
  }

  async checkAudioQuality(audioFiles: Express.Multer.File[]): Promise<QualityMeasure[]> {
    if(!audioFiles || audioFiles.length === 0) {
      throw new BadRequestException("No audio files provided");
    }

    audioFiles.forEach(file => {
      if(!['audio/wav', 'audio/x-wav', 'audio/wave'].includes(file.mimetype)) {
        throw new BadRequestException("file_must_be_wav");
      }
    });


    const strategies = this.collectStrategies();
    let results: QualityMeasure[] = [];

    const decoded_wavs = audioFiles.map(f => wav.decode(f.buffer));

    // console.log("Sample rate:", decoded.sampleRate);
    // console.log("Number of channels:", decoded.channelData.length);
    // console.log("Length of first channel:", decoded.channelData[0].length);
    // console.log("Duration (seconds):", decoded.channelData[0].length / decoded.sampleRate);


    // const samples: number[][] = decoded.channelData;
    
    //Collecting the strategies and executing them in parallel
    const tasks: Array<(wavs: WavDecodeResult[]) => Promise<QualityMeasure>> = [];
    for(const strategy of await strategies) {
      tasks.push(async (wavs) => {
        if(wavs.length < strategy.requiredWavCount){
          throw new Error("not_enough_files_for_strategy");
        }

        return await strategy.checkQuality(wavs.slice(0, strategy.requiredWavCount));
      });
    }

    const resultsPromises = tasks.map(task => task(decoded_wavs));
    results = await Promise.all(resultsPromises);

    return results;
  }

}
