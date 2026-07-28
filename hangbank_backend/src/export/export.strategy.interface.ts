export interface ExportOptions {
    // Restrict the export to these audio-file ids. When omitted/empty, every audio
    // file of the project is exported.
    audioFileIds?: string[];
}

export interface ExportStrategy {
    export(requesterId: string, projectId: string, options?: ExportOptions);
}