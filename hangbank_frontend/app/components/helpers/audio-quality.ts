// Shared audio-quality helpers: matching a measured value to its range, and
// determining whether an audio file has any quality problems. Reusable anywhere
// (block detail page, block lists, badges, …).

export interface QualityRange {
    min: number;
    max: number | null; // null = open-ended upper bound
    displayName: string; // i18n key
    isProblem?: boolean; // true when a value landing here is a problem
}

export interface QualityMetadata {
    displayName: string; // i18n key for the check's name
    ranges: QualityRange[];
}

// Keyed by AudioQualityType (e.g. "SpeakerCheck") — the GET /audio-quality/ranges shape.
export type QualityRangesByType = Record<string, QualityMetadata>;

// One stored measure — the GET /audio-quality/audio-file/:id shape.
export interface AudioQualityMeasure {
    id: string;
    type: string;
    values: number[];
}

/** Finds the range a value falls into (min ≤ value ≤ max; max === null is open-ended). */
export function matchRange(
    value: number,
    ranges: QualityRange[],
): QualityRange | undefined {
    return ranges.find(
        (r) => value >= r.min && (r.max === null || value <= r.max),
    );
}

/** True when any of the given values lands in a problem range. */
export function valuesHaveProblem(
    values: number[],
    ranges: QualityRange[],
): boolean {
    return values.some((v) => matchRange(v, ranges)?.isProblem === true);
}

/** True when a single measure indicates a problem. */
export function measureHasProblem(
    measure: AudioQualityMeasure,
    rangesByType: QualityRangesByType,
): boolean {
    const meta = rangesByType[measure.type];
    return meta ? valuesHaveProblem(measure.values, meta.ranges) : false;
}

/** Quick check: does the audio file have ANY quality problems across its measures? */
export function audioFileHasProblems(
    measures: AudioQualityMeasure[],
    rangesByType: QualityRangesByType,
): boolean {
    return measures.some((m) => measureHasProblem(m, rangesByType));
}
