interface ProjectListItemBase {
  id: string;
  name: string;
  description: string;
  samplingRate?: number | null;
  createdAt: Date;
  updatedAt: Date;
  language: string | null;
  speakerCount: number;
  progress: number;
}

export interface CorpusProjectListItemDto extends ProjectListItemBase {
  type: 'corpus';
  corpusName: string;
}

export interface ExistingFilesProjectListItemDto extends ProjectListItemBase {
  type: 'existing files';
  audioFileCount: number;
}

export type ProjectListItemDto =
  | CorpusProjectListItemDto
  | ExistingFilesProjectListItemDto;
