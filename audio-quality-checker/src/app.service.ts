import { BadRequestException, Injectable } from '@nestjs/common';
// import { QuietnessCheck } from './strategy/quietness_check';
// import { LoudnessCheck } from './strategy/loudness_check';
import { AudioFileQuality, AudioQualityChecker, AudioQualityCheckerStrategy, QualityMeasure, WavDecodeResult } from './strategy/audio_quality_checker';
import * as wav from "node-wav";
import { VolumeCheck } from './strategy/volume_check';
import { NoiseCheck } from './strategy/noise_check';
import { SpeakerCheck } from './strategy/speaker_check';

@Injectable()
export class AppService implements AudioQualityChecker {

  //Returns the list of used strategies for audio quality check
  async collectStrategies() {
    //TODO: In a real implementation, you would dynamically load strategies from a folder or database
    return [
      // new QuietnessCheck(),
      // new LoudnessCheck(),
      new VolumeCheck(),
      new NoiseCheck(),
      new SpeakerCheck(),
    ]
  }

  async checkAudioQuality(
    master: Express.Multer.File,
    wavs: Express.Multer.File[],
    ids: string[],
  ): Promise<AudioFileQuality[]> {
    if (!master || wavs.length === 0) {
      throw new BadRequestException("No audio files provided");
    }
    // Each wav must carry its audio-file id (parallel arrays), so we can report
    // back which audio each set of quality measures belongs to.
    if (ids.length !== wavs.length) {
      throw new BadRequestException(
        `ids length (${ids.length}) must match wavs length (${wavs.length})`,
      );
    }

    const strategies = await this.collectStrategies();

    const masterWav = wav.decode(master.buffer);
    const additionalWavs = wavs.map(f => wav.decode(f.buffer));

    // For each target recording, run every strategy against the master and group
    // the resulting measures under that recording's audio-file id.
    return Promise.all(
      additionalWavs.map(async (targetWav, i): Promise<AudioFileQuality> => {
        const measures = await Promise.all(
          strategies.map(strategy => strategy.checkQuality(masterWav, targetWav)),
        );
        return { audioFileId: ids[i], measures };
      }),
    );
  }

}
