import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { AppService } from './app.service';
import { FilesInterceptor } from '@nestjs/platform-express';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('test-batch-upload')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      limits: {
        fileSize: 100 * 1024 * 1024, // 100 MB max file size
      },
    }),
  )
  async testBatchUpload(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('language') language?: string,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException(
        'At least one audio file must be uploaded.',
      );
    }

    return await this.appService.testBatchUpload(files, language);
  }
}
