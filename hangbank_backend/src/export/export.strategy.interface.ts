import { Project } from "src/project/entities/project.entity";

export interface ExportStrategy{
    export(projectId: string);
}