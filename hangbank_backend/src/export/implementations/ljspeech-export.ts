import { Project } from "src/project/entities/project.entity";
import { ExportStrategy } from "../export.strategy.interface";
import { Inject, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ExportBase } from "./export-base";
import { S3StorageService } from "src/s3-storage/s3-storage.service";
const archiver = require('archiver');

@Injectable()
export class LJSpeechExportStrategy extends ExportBase{
    constructor(
        @InjectRepository(Project) private readonly projectRepository: Repository<Project>,
        @Inject() private readonly s3StorageService: S3StorageService
    ){
        super(projectRepository);
    }

    async export(projectId: string) {
        //TODO: Check permission for project
        const data = await this.collectProjectData(projectId);

        const archive = archiver('zip', {
            zlib: { level: 9 } // Maximum compression
        });

        // ZIP file: 
        // → wavs/
            // file1.wav
            // file2.wav
        // → metadata.csv
            // filename | transcription | transcription normalized

        for(const audioFile of data.files){
            //Download file and convert to wav file
            const file = await this.s3StorageService.downloadObject(audioFile.s3Link, this.s3StorageService.audioBucket);
            archive.append(file, { name: `wavs/${audioFile.name}` });
        }

        const csvContent = "filename|transcription\n" + data.files.map(f => `${f.name}|${f.transcription}`).join('\n');
        archive.append(csvContent, { name: 'metadata.csv' });

        archive.finalize();
        return archive;
    }
    
}