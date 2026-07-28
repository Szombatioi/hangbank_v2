import { Project } from "src/project/entities/project.entity";
import { ExportOptions, ExportStrategy } from "../export.strategy.interface";
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { Repository } from "typeorm";
import { ProjectRoleType } from "src/project/entities/project-role.enum";


export abstract class ExportBase implements ExportStrategy {
    constructor(
        private readonly projectRepositovy: Repository<Project>,
    ){}
    abstract export(requesterId: string, projectId: string, options?: ExportOptions);

    async collectProjectData(requesterId: string, projectId: string, audioFileIds?: string[]) {
        const project = await this.projectRepositovy.findOne({
            where: {
                id: projectId
            },
            relations: {
                audioFiles: true,
                roles: true,
            }
        });
        if(!project){
            throw new NotFoundException(`Project with id '${projectId}' not found`);
        }

        // Only the project owner may export it (ownership-only for now)
        const isOwner = project.roles?.some(
            (r) => r.userId === requesterId && r.role === ProjectRoleType.OWNER,
        );
        if (!isOwner) {
            throw new ForbiddenException('Only the project owner can export this project');
        }

        // Restrict to the selected audio files when provided. Filtering against the
        // project's own files also prevents exporting ids from another project.
        let files = project.audioFiles;
        if (audioFileIds && audioFileIds.length > 0) {
            const wanted = new Set(audioFileIds);
            files = files.filter((f) => wanted.has(f.id));
        }

        return {
            files,
        }
    }
}