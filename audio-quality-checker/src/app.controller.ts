import { Controller, Get, Post, UseInterceptors } from '@nestjs/common';
import { AppService } from './app.service';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Post()
  @UseInterceptors(FileInterceptor('file', {
    //storage: process.env.NODE_ENV === 'development' ? undefined : undefined, // Alapértelmezésben a memóriát használja a NestJS/Multer
    limits: {
      fileSize: 50 * 1024 * 1024, //Max. 50Mb
    },
  }))
  async checkAudioQuality(file: Express.Multer.File) {
    return await this.appService.checkAudioQuality(file);
  }
}
