import { Language } from "src/language/entities/language.entity";
import { Project } from "src/project/entities/project.entity";
import { Speaker } from "src/project/entities/speaker.entity";
import { OneToOne, Column, ManyToOne, OneToMany } from "typeorm";
import { ChatMessage } from "./chat-message.entity";

export class AiChatProject extends Project {
  @OneToOne(() => Speaker, (s) => s.project)
  speaker!: Speaker;

  @Column({ default: false })
  useAutomaticTranscription!: boolean;

  @ManyToOne(() => Language, { nullable: true })
  transcriptionLanguage?: Language | null;

  @Column({ nullable: true, default: null })
  topic?: string | null;

  @OneToMany(() => ChatMessage, c => c.aiChatProject, { cascade: true })
  messages: ChatMessage[];
}
