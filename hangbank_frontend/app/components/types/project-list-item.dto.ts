import { ProjectType } from "@/app/(main)/projects/new/components/project-type-selector";

interface ProjectListItemBase {
  id: string;
  name: string;
  description: string;
  samplingRate?: number | null;
  createdAt: string;
  updatedAt: string;
  language: string | null; // translatable language name
  speakerCount: number;
  progress?: number | null; // 0–100, based on how many blocks have already been recorded (CORPUS mode)
}

export interface CorpusProjectListItemDto extends ProjectListItemBase {
  type: ProjectType.CORPUS;
  corpusName: string;
}

export interface AIChatProjectListItemDto extends ProjectListItemBase {
  type: ProjectType.AI_CHAT;
  topic: string;
}

export interface ExistingFilesProjectListItemDto extends ProjectListItemBase {
  type: ProjectType.EXISTING_FILES;
  audioFileCount: number;
}

export type ProjectListItemDto =
  | CorpusProjectListItemDto
  | ExistingFilesProjectListItemDto
  | AIChatProjectListItemDto;
