export type ProjectRole = "VIEW" | "EDITOR";
export const PROJECT_ROLES: ProjectRole[] = ["VIEW", "EDITOR"];

export const HEADLINE = "'Space Grotesk', sans-serif";
export const LABEL = "'Manrope', sans-serif";
export const BODY = "'Inter', sans-serif";

export const SAMPLING_RATES: { value: number; label: string; recommended: boolean }[] =
  [
    { value: 8000, label: "8,000 Hz", recommended: false },
    { value: 16000, label: "16,000 Hz", recommended: false },
    { value: 24000, label: "24,000 Hz", recommended: false },
    { value: 32000, label: "32,000 Hz", recommended: false },
    { value: 44100, label: "44,100 Hz", recommended: false },
    { value: 48000, label: "48,000 Hz", recommended: true },
  ];
