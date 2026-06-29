import { Body, Controller, Get, Post, UploadedFile, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { AppService } from './app.service';
import { FileFieldsInterceptor, FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Post()
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'master', maxCount: 1 }, // Only allow 1 master file
    { name: 'wavs', maxCount: 99 }    // Allow up to 99 standard wav files
  ], {
    limits: {
      fileSize: 500 * 1024 * 1024, //TODO: a méret lehet állítandó, de egyelőre legyen 500MB
    },
    storage: memoryStorage()
  }))
  async checkAudioQuality(
    @UploadedFiles() files: { master: Express.Multer.File[], wavs: Express.Multer.File[] },
    @Body('ids') idsRaw: string,
  ) {
    console.log("AQC called!");
    const masterFile = files.master?.[0];
    const additionalWavs = files.wavs || [];
    if(!masterFile) {
      throw new Error("Master file is required");
    }
    if(additionalWavs.length === 0) {
      throw new Error("At least one additional wav file is required");
    }

    // ids: a JSON array of audio-file ids, parallel to the `wavs` files.
    let ids: string[];
    try {
      ids = JSON.parse(idsRaw ?? '[]');
    } catch {
      throw new Error("ids must be a valid JSON array");
    }

    return await this.appService.checkAudioQuality(masterFile, additionalWavs, ids);
  }
}
