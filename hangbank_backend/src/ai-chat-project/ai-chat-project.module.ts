import { Module } from '@nestjs/common';
import { AiChatProjectService } from './ai-chat-project.service';
import { AiChatProjectController } from './ai-chat-project.controller';
import { AuthModule } from 'src/auth/auth.module';
import { LanguageModule } from 'src/language/language.module';

@Module({
  imports: [
    AuthModule,
    LanguageModule
  ],
  controllers: [AiChatProjectController],
  providers: [AiChatProjectService],
})
export class AiChatProjectModule {}
