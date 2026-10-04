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
  progress: number; // 0–100, its meaning depends on the project type
}

export interface CorpusProjectListItemDto extends ProjectListItemBase {
  type: ProjectType.CORPUS;
  corpusName: string;
}

export interface ExistingFilesProjectListItemDto extends ProjectListItemBase {
  type: ProjectType.EXISTING_FILES;
  audioFileCount: number;
}

export type ProjectListItemDto =
  | CorpusProjectListItemDto
  | ExistingFilesProjectListItemDto;
