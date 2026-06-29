import { Project } from "src/project/entities/project.entity";
import { ExportOptions } from "../export.strategy.interface";
import { Inject, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ExportBase } from "./export-base";
import { S3StorageService } from "src/s3-storage/s3-storage.service";
import { ZipArchive } from "archiver";

@Injectable()
export class LJSpeechExportStrategy extends ExportBase{
    constructor(
        @InjectRepository(Project) private readonly projectRepository: Repository<Project>,
        @Inject() private readonly s3StorageService: S3StorageService
    ){
        super(projectRepository);
    }

    async export(requesterId: string, projectId: string, options?: ExportOptions) {
        const data = await this.collectProjectData(requesterId, projectId, options?.audioFileIds);

        // archiver v8 exposes format classes instead of the old archiver('zip') factory
        const archive = new ZipArchive({
            zlib: { level: 9 } // Maximum compression
        });

        // ZIP file:
        // → wavs/
            // file1.wav
            // file2.wav
        // → metadata.csv
            // filename | transcription | transcription normalized

        const files = [...data.files].sort((a, b) => a.name.localeCompare(b.name));

        for (const audioFile of files) {
            //Download file and convert to wav file
            const file = await this.s3StorageService.downloadObject(audioFile.s3Link, this.s3StorageService.audioBucket);
            archive.append(file, { name: `wavs/${audioFile.name}` });
        }

        const csvContent = "filename|transcription\n" + files.map(f => `${f.name}|${f.transcription}`).join('\n');
        // Prepend a UTF-8 BOM and append as a UTF-8 buffer so spreadsheet apps (Excel)
        // read accented characters (e.g. Hungarian) as UTF-8 instead of guessing a
        // single-byte code page, which produces mojibake.
        const bom = String.fromCharCode(0xfeff);
        archive.append(Buffer.from(bom + csvContent, 'utf-8'), { name: 'metadata.csv' });

        // Don't await: the controller pipes the stream and finalize() only resolves
        // once that consumer drains it. Catch so a failure isn't an unhandled
        // rejection (it's also emitted via the 'error' event the controller handles).
        archive.finalize().catch((err) => {
            console.error('Export archive finalize error', err);
        });
        return archive;
    }
}
