import { Inject, Injectable } from '@nestjs/common';
import { ExportStrategy } from './export.strategy.interface';
import { LJSpeechExportStrategy } from './implementations/ljspeech-export';

@Injectable()
export class ExportService {
    constructor(
        @Inject(LJSpeechExportStrategy)
        private readonly ljSpeechExport: ExportStrategy,
    ) {}

    // Exports a project using the LJSpeech strategy.
    export(projectId: string) {
        return this.ljSpeechExport.export(projectId);
    }
}
