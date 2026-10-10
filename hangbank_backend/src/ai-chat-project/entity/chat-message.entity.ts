import { AudioFile } from 'src/audio-file/entities/audio-file.entity';
import { Column, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { AiChatProject } from './ai-chat-project.entity';

export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: ['user', 'ai'] })
  sender!: 'user' | 'ai';

  @Column()
  index!: number;

  @Column()
  text!: string;

  @OneToOne(() => AudioFile, { nullable: true })
  @JoinColumn()
  audioFile?: AudioFile | null;

  @ManyToOne(() => AiChatProject, (aic) => aic.messages, { onDelete: 'CASCADE' })
  aiChatProject!: AiChatProject;
}
