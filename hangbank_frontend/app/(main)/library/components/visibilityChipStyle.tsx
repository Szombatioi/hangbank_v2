"use client";
export function visibilityChipStyle(v: string) {
  if (v === "public") return { bgcolor: "var(--app-success-bg)", color: "var(--app-success-fg)" };
  if (v === "private") return { bgcolor: "var(--app-warn-bg)", color: "var(--app-warn-fg)" };
  return { bgcolor: "var(--app-border)", color: "var(--app-text-secondary)" };
}
