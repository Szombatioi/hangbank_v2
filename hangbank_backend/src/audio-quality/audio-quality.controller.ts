import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/guards/auth.guard';
import type { IJwtPayload } from '@hangbank/shared';
import { AudioQualityService } from './audio-quality.service';

@Controller('audio-quality')
export class AudioQualityController {
  constructor(private readonly audioQualityService: AudioQualityService) {}

  // Static display name + value ranges for each quality-check type.
  @UseGuards(AuthGuard)
  @Get('ranges')
  getRanges() {
    return this.audioQualityService.getQualityRanges();
  }

  // All stored quality measures for an audio file, as an array of objects.
  @UseGuards(AuthGuard)
  @Get('audio-file/:audioFileId')
  getForAudioFile(
    @Req() req: { user: IJwtPayload },
    @Param('audioFileId') audioFileId: string,
  ) {
    return this.audioQualityService.getAudioQualities(audioFileId, req.user.id);
  }
}
