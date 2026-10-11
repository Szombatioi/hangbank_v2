import { AiChatProject } from "src/ai-chat-project/entity/ai-chat-project.entity";

interface ProjectListItemBase {
  id: string;
  name: string;
  description: string;
  samplingRate?: number | null;
  createdAt: Date;
  updatedAt: Date;
  language: string | null;
  speakerCount: number;
}

export interface CorpusProjectListItemDto extends ProjectListItemBase {
  type: 'corpus';
  corpusName: string;
  progress: number;
}
export interface AIChatProjectListItemDto extends ProjectListItemBase {
  type: 'ai chat';
  topic: string;
}

export interface ExistingFilesProjectListItemDto extends ProjectListItemBase {
  type: 'existing files';
  audioFileCount: number;
  progress: number;
}

export type ProjectListItemDto =
  | CorpusProjectListItemDto
  | ExistingFilesProjectListItemDto
  | AIChatProjectListItemDto;
