"use client";

import { useTheme } from "@mui/material/styles";

// Visual tokens for the recording flow (Material 3 derived palette), per theme mode.
// Returned as hex strings (not CSS vars) so existing alpha-append usages such as
// `${COLOR.onSurfaceVariant}99` keep working.
const LIGHT = {
    surface: "#f8f9fa",
    surfaceContainerLow: "#f3f4f5",
    surfaceContainerHighest: "#e1e3e4",
    onSurface: "#191c1d",
    onSurfaceVariant: "#44474c",
    outlineVariant: "#c4c6cc",
    primaryContainer: "#101b30",
    onPrimaryContainer: "#79849d",
    onPrimaryFixedVariant: "#3c475d",
    emeraldBg: "#d1fae5",
    emeraldText: "#047857",
    glassBg: "rgba(255,255,255,0.85)",
    glassBorder: "rgba(255,255,255,0.4)",
} as const;

const DARK: Record<keyof typeof LIGHT, string> = {
    surface: "#191c1d",
    surfaceContainerLow: "#1e2021",
    surfaceContainerHighest: "#373839",
    onSurface: "#e1e3e4",
    onSurfaceVariant: "#c4c6cc",
    outlineVariant: "#5a5d63",
    primaryContainer: "#101b30",
    onPrimaryContainer: "#9aa6c0",
    onPrimaryFixedVariant: "#b0c0dc",
    emeraldBg: "#16331c",
    emeraldText: "#74d57f",
    glassBg: "rgba(34,36,38,0.85)",
    glassBorder: "rgba(255,255,255,0.08)",
};

export type RecordColors = Record<keyof typeof LIGHT, string>;

// Light tokens as a static default (kept for backwards compatibility / non-hook use).
export const COLOR = LIGHT;

/** Theme-aware recording-flow colors. Use inside components. */
export function useColors(): RecordColors {
    const theme = useTheme();
    return theme.palette.mode === "dark" ? DARK : LIGHT;
}
