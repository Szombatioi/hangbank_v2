import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AiChatProjectService } from './ai-chat-project.service';
import { IJwtPayload } from '@hangbank/shared';
import { SaveExistingAudioProjectDto } from 'src/existing-audio-project/dto/save-existing-audio-project.dto';
import { AuthGuard } from 'src/guards/auth.guard';
import { SaveAIChatProjectDTO } from './dto/save-ai-chat-project.dto';

@Controller('ai-chat-project')
export class AiChatProjectController {
  constructor(private readonly aiChatProjectService: AiChatProjectService) {}

  @UseGuards(AuthGuard)
  @Post('project')
  create(
    @Req() req: { user: IJwtPayload },
    @Body() dto: SaveAIChatProjectDTO,
  ) {
    return this.aiChatProjectService.create(req.user, dto);
  }
}
