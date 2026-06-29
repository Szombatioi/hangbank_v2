import { LanguageDto } from "./language.dto";

export type CorpusVisibility = 'public' | 'protected' | 'private';

export interface CorpusDto {
  id: string;
  name: string;
  language: LanguageDto;
  visibility: CorpusVisibility;
  s3Link: string;
  domain?: { name: string };
  phoneticalCoverage: number;
  blockCount: number;
  uploaderId: string;
  createdAt: string;
}
