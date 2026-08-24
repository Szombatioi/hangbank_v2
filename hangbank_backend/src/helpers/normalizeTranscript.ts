// Normalizes a transcript for comparison: lowercased, punctuation stripped, trimmed.
// Exported so other modules (e.g. export) can flag transcription mismatches the same way.

export function normalizeTranscript(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
    .trim();
}
