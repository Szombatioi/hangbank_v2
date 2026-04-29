import { ProjectType } from "@/app/(main)/projects/new/components/project-type-selector";

export interface ProjectDto {
  id: string;
  name: string;
  description?: string;
  samplingRate?: number;
  createdAt: string;
  updatedAt?: string;
  type: ProjectType;
  corpusProgress?: number; // 0–100
  corpusName?: string;
  language?: string;       // translatable name, e.g. "en-US"
  speakerCount?: number;
}
