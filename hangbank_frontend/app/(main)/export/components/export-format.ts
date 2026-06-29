// Supported dataset export formats. Kept as an enum for now (single format);
// the backend export strategies mirror these names.
export enum ExportFormat {
    LJSpeech = "LJSpeech",
}

export const EXPORT_FORMATS: ExportFormat[] = Object.values(ExportFormat);

// Display label per format. Format names are proper nouns, so they're not translated.
export const EXPORT_FORMAT_LABELS: Record<ExportFormat, string> = {
    [ExportFormat.LJSpeech]: "LJSpeech",
};
