import {
  AudioQualityCheckerStrategy,
  QualityMeasure,
  WavDecodeResult,
} from './audio_quality_checker';
import * as ort from 'onnxruntime-node';
import { readFileSync } from 'fs';
// import WaveFile from 'wavefile';
const { WaveFile } = require('wavefile'); //bc this is a commonJS module

export class SpeakerCheck implements AudioQualityCheckerStrategy {
  readonly requiredWavCount = 2;
  private session: ort.InferenceSession | null = null;

  private async getSession(): Promise<ort.InferenceSession> {
    if (!this.session) {
      this.session = await ort.InferenceSession.create(
        './onnx/ecapa_tdnn.onnx',
      );
    }
    return this.session;
  }

  async checkQuality(wavs: WavDecodeResult[]): Promise<QualityMeasure> {
    const session = await this.getSession();

    if (!wavs[0] || !wavs[1]) {
      throw new Error('two_files_needed'); //TODO: UI-n fordítás
    }

    const [emb1, emb2] = await Promise.all([
      this.getEmbedding(session, wavs[0]), //unknown
      this.getEmbedding(session, wavs[1]), //reference
    ]);

    const match = this.isSameSpeaker(emb1, emb2);

    return {
      name: 'speaker_check',
      result: match,
      message: match ? 'Ugyanaz a személy beszél' : 'Különböző személy beszél',
    };
  }

  // private toMono16kHz(wav: WavDecodeResult): Float32Array {
  //   console.log('wav:', wav);
  //   console.log('channelData:', wav?.channelData);
  //   console.log('sampleRate:', wav?.sampleRate);
  //   // Csatornák átlagolása → mono
  //   const sampleCount = wav.channelData[0].length;
  //   const mono = new Float32Array(sampleCount);

  //   for (let i = 0; i < sampleCount; i++) {
  //     let sum = 0;
  //     for (const channel of wav.channelData) {
  //       sum += channel[i];
  //     }
  //     mono[i] = sum / wav.channelData.length;
  //   }

  //   if (wav.sampleRate === 16000) {
  //     return mono;
  //   }

  //   const wf = new WaveFile();
  //   wf.fromScratch(1, wav.sampleRate, '32f', mono);
  //   wf.toSampleRate(16000);
  //   return wf.channelData[0] as Float32Array;
  // }

  private toMono16kHz(wav: WavDecodeResult): Float32Array {
    const sampleCount = wav.channelData[0].length;
    const mono = new Float32Array(sampleCount);
  
    for (let i = 0; i < sampleCount; i++) {
      let sum = 0;
      for (const channel of wav.channelData) {
        sum += channel[i];
      }
      mono[i] = sum / wav.channelData.length;
    }
  
    if (wav.sampleRate === 16000) {
      return mono;
    }
  
    const wf = new WaveFile();
    wf.fromScratch(1, wav.sampleRate, '32f', mono);
    wf.toSampleRate(16000);
    return wf.getSamples(false, Float32Array) as Float32Array;
  }

  // private toMono16kHz(wav: WavDecodeResult): Float32Array {
  //   // Csatornák átlagolása → mono
  //   const sampleCount = wav.channelData[0].length;
  //   const mono = new Float32Array(sampleCount);
  
  //   for (let i = 0; i < sampleCount; i++) {
  //     let sum = 0;
  //     for (const channel of wav.channelData) {
  //       sum += channel[i];
  //     }
  //     mono[i] = sum / wav.channelData.length;
  //   }
  
  //   if (wav.sampleRate === 16000) {
  //     return mono;
  //   }
  
  //   // Linear resample to 16kHz
  //   const ratio = wav.sampleRate / 16000;
  //   const outputLength = Math.floor(sampleCount / ratio);
  //   const resampled = new Float32Array(outputLength);
  
  //   for (let i = 0; i < outputLength; i++) {
  //     const srcIndex = i * ratio;
  //     const srcFloor = Math.floor(srcIndex);
  //     const srcCeil = Math.min(srcFloor + 1, sampleCount - 1);
  //     const fraction = srcIndex - srcFloor;
  
  //     // Linear interpollation between two neighbouring samples
  //     resampled[i] = mono[srcFloor] * (1 - fraction) + mono[srcCeil] * fraction;
  //   }
  
  //   return resampled;
  // }

  //Loading the audio file and pre-transforming to
  // a. 32f bit depth
  // b. 16khz sampling rate
  // -> then returning the samples of this (mono?) channel?
  // async loadAudio(filePath: string): Promise<Float32Array> {
  //   const wav = new WaveFile(readFileSync(filePath));
  //   wav.toBitDepth('32f');
  //   wav.toSampleRate(16000);

  //   const channels = wav.channelData as Float32Array[];
  //   const sampleCount = channels[0].length; //(Sample rate * audio length) per channel
  //   const mono = new Float32Array(sampleCount);

  //   //Average of channels, instead of using only one channel -> improved precision
  //   for (let i = 0; i < sampleCount; i++) {
  //     let sum = 0;
  //     for (const channel of channels) {
  //       sum += channel[i];
  //     }
  //     mono[i] = sum / channels.length;
  //   }

  //   return mono;
  // }

  private async getEmbedding(
    session: ort.InferenceSession,
    wav: WavDecodeResult,
  ): Promise<Float32Array> {
    const samples = this.toMono16kHz(wav);
    const tensor = new ort.Tensor('float32', samples, [1, samples.length]);

    // Running the ECAPA-TDNN neural network:
    // kiszámolja belőle a modell az X hangmintából a hangszóró "ujjlenyomatát"
    const output = await session.run({ waveform: tensor });

    //Returning the "embedding" column from the output
    //embedding: 192 numbers that represent the voice of the audio file(?)
    return output['embedding'].data as Float32Array;
  }

  //Koszinusz-hasonlóság használata
  //Embedding-eket hasonlít össze: a és b
  private isSameSpeaker(
    a: Float32Array,
    b: Float32Array,
    threshold = 0.75,
  ): boolean {
    let dot = 0,
      normA = 0,
      normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const similarity = dot / (Math.sqrt(normA) * Math.sqrt(normB));
    return similarity >= threshold;
  }
}
