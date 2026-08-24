import { CorpusVisibility } from '../entities/corpus-visibility';

export class CorpusListItemDto {
  id: string;
  name: string;
  language: { name: string };
  visibility: CorpusVisibility;
  domain?: { name: string };
  phoneticalCoverage: number;
  blockCount: number;
  createdAt: Date;
  isUploader: boolean;
}
