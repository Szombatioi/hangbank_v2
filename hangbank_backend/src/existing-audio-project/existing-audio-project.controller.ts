import { Body, Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ExistingAudioProjectService } from './existing-audio-project.service';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('existing-audio-project')
export class ExistingAudioProjectController {
  constructor(
    private readonly existingAudioProjectService: ExistingAudioProjectService,
  ) {}

  @Post()
  // @UseInterceptors(FileInterceptor('audio'))
  async testQueue(@Body() dto: {
    audioId: string,
    s3Url: string,
    language?: string
  }) {
    //Local test to upload a new audio file and append task queue
    await this.existingAudioProjectService.testQueue({dto});
  }
}
