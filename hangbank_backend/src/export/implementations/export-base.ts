import { Project } from "src/project/entities/project.entity";
import { ExportStrategy } from "../export.strategy.interface";
import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";


export abstract class ExportBase implements ExportStrategy {
    constructor(
        private readonly projectRepositovy: Repository<Project>, 
    ){}
    abstract export(projectId: string);
    
    async collectProjectData(projectId: string) {
        //TODO: permission check
        const project = await this.projectRepositovy.findOne({
            where: {
                id: projectId
            },
            relations: {
                audioFiles: true
            }
        });
        if(!project){
            throw new NotFoundException();
        }

        return {
            files: project.audioFiles,
        }
    }
}