import { Controller } from '@nestjs/common';
import { AiChatProjectService } from './ai-chat-project.service';

@Controller('ai-chat-project')
export class AiChatProjectController {
  constructor(private readonly aiChatProjectService: AiChatProjectService) {}
}
