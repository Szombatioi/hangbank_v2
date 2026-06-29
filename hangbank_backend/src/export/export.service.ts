import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ExportStrategy } from './export.strategy.interface';
import { LJSpeechExportStrategy } from './implementations/ljspeech-export';
import { ExportFormat } from './export-format.enum';

export interface ExportRequest {
    format: ExportFormat;
    audioFileIds?: string[];
}

@Injectable()
export class ExportService {
    constructor(
        @Inject(LJSpeechExportStrategy)
        private readonly ljSpeechExport: ExportStrategy,
    ) {}

    // Exports a project's selected audio files using the requested format's strategy.
    export(requesterId: string, projectId: string, request: ExportRequest) {
        const strategy = this.strategyFor(request.format);
        return strategy.export(requesterId, projectId, {
            audioFileIds: request.audioFileIds,
        });
    }

    private strategyFor(format: ExportFormat): ExportStrategy {
        switch (format) {
            case ExportFormat.LJSpeech:
                return this.ljSpeechExport;
            default:
                throw new BadRequestException(`Unsupported export format: ${format}`);
        }
    }
}
