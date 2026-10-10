import { Module } from '@nestjs/common';
import { AiChatProjectService } from './ai-chat-project.service';
import { AiChatProjectController } from './ai-chat-project.controller';

@Module({
  controllers: [AiChatProjectController],
  providers: [AiChatProjectService],
})
export class AiChatProjectModule {}
