export const LABEL = "'Manrope', sans-serif";
export const HEADLINE = "'Space Grotesk', sans-serif";
export const BODY = "'Inter', sans-serif";
export const ORANGE = "#ed4a14";

export const paperSx = {
  bgcolor: "var(--app-surface-muted)",
  borderRadius: 4,
  py: 4,
  px: 4,
  mb: 3,
  display: "flex",
  flexDirection: "column",
} as const;

export const sectionTitleSx = {
  fontFamily: LABEL,
  fontWeight: 700,
  letterSpacing: "0.12em",
  color: "text.secondary",
} as const;

export const fieldLabelSx = {
  fontFamily: LABEL,
  textTransform: "capitalize",
  mb: 0.75,
} as const;

export const textFieldSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "8px",
    bgcolor: "var(--app-card)",
  },
} as const;

export const captionSx = {
  fontFamily: LABEL,
  fontSize: "0.65rem",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.15em",
  color: "var(--app-text-faint)",
  mb: 0.5,
} as const;
