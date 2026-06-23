import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config/dist/config.service';
import { HttpService } from '@nestjs/axios/dist/http.service';
import { AudioQuality, AudioQualityType } from './entities/audio-quality.entity';
import {
  AudioFileQuality,
  QualityMeasure,
} from './entities/audio-quality-check.interface';
import {
  AUDIO_QUALITY_METADATA,
  AudioQualityMetadata,
} from './audio-quality.metadata';
import { AudioFileService } from 'src/audio-file/audio-file.service';

@Injectable()
export class AudioQualityService {
  private readonly aqcUrl: string;

  constructor(
    @InjectRepository(AudioQuality)
    private readonly audioQualityRepository: Repository<AudioQuality>,
    @Inject() private readonly audioFileService: AudioFileService,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.aqcUrl =
      this.configService.get<string>('AQC_SERVICE_URL') ??
      'http://localhost:3002';
  }

  // Returns every quality-check result stored for an audio file (owner-checked),
  // as a plain array of { id, type, values } objects.
  async getAudioQualities(
    audioFileId: string,
    requesterId: string,
  ): Promise<Pick<AudioQuality, 'id' | 'type' | 'values'>[]> {
    await this.audioFileService.getForUser(audioFileId, requesterId); // permission
    const qualities = await this.audioQualityRepository.find({
      where: { audioFile: { id: audioFileId } },
    });
    return qualities.map((q) => ({ id: q.id, type: q.type, values: q.values }));
  }

  // Static display name + value ranges for each quality-check type.
  getQualityRanges(): Record<AudioQualityType, AudioQualityMetadata> {
    return AUDIO_QUALITY_METADATA;
  }

  // Upserts a single quality check for an audio file (owner-checked). If a check
  // of this type already exists for the file, it is silently overwritten.
  async setAudioQuality(
    audioFileId: string,
    qualityType: AudioQualityType,
    check: QualityMeasure,
    requesterId: string,
  ): Promise<void> {
    const audioFile = await this.audioFileService.getForUser(
      audioFileId,
      requesterId,
    ); // permission

    const existing = await this.audioQualityRepository.findOne({
      where: { audioFile: { id: audioFileId }, type: qualityType },
    });

    if (existing) {
      existing.values = check.values;
      await this.audioQualityRepository.save(existing);
      return;
    }

    await this.audioQualityRepository.save(
      this.audioQualityRepository.create({
        audioFile,
        type: qualityType,
        values: check.values,
      }),
    );
  }

  // Sends the master + each recording (tagged with its audio-file id) to the AQC
  // service and returns the per-audio-file quality results. Resilient: a checker
  // failure returns [] so recording saves never fail because of it.
  async callAqcService(
    master: Blob,
    wavs: { id: string; blob: Blob }[],
  ): Promise<AudioFileQuality[]> {
    if (wavs.length === 0) return [];

    const formData = new FormData();
    formData.append('master', master);
    for (const w of wavs) {
      formData.append('wavs', w.blob);
    }
    // ids are parallel to the `wavs` files (same order), so the checker can tell
    // which results belong to which audio file.
    formData.append('ids', JSON.stringify(wavs.map((w) => w.id)));

    try {
      const resp = await this.httpService.axiosRef.post<AudioFileQuality[]>(
        `${this.aqcUrl}/`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return resp.data ?? [];
    } catch (e) {
      console.error('AQC service call failed', e);
      return [];
    }
  }
}
