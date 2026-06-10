import { Controller, Get, Post, UploadedFile, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { AppService } from './app.service';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Post()
  @UseInterceptors(FilesInterceptor('wavs', 2, {
    limits: {
      fileSize: 50 * 1024 * 1024, //TODO: a méret lehet állítandó, de egyelőre legyen 50MB
    },
    storage: memoryStorage()
  }))
  async checkAudioQuality(@UploadedFiles() files: Express.Multer.File[]) {
    return await this.appService.checkAudioQuality(files);
  }
}
