import { createTheme, type PaletteMode } from "@mui/material/styles";

// ─── Design Token Reference ──────────────────────────────────────────────────
// Palette derived from "The Sonic Archivist" design system (ui_design/DESIGN.md)
//
// Light surface hierarchy (tonal layering — no 1px borders):
//   surface                  #f8f9fa  ← canvas
//   surface_container_low    #f3f4f5  ← sidebars
//   surface_container        #edeeef  ← cards
//   surface_container_high   #e7e8e9  ← inputs, active rows
//   surface_container_highest#e1e3e4  ← highest contrast surface
//   surface_container_lowest #ffffff  ← floating / glassmorphism
//
// Dark surface hierarchy:
//   surface                  #191c1d  ← canvas
//   surface_container_low    #1e2021  ← sidebars
//   surface_container        #222426  ← cards
//   surface_container_high   #2c2e2f  ← inputs, active rows
//   surface_container_highest#373839  ← highest contrast surface
//   surface_container_lowest #0e1011  ← deep void
//
// Accent (#ed4a14) is the "Signal" — reserved for Record, errors, live indicators only.
// ─────────────────────────────────────────────────────────────────────────────

const LIGHT = {
  surface: "#F0F1F2",
  containerLowest: "#ffffff",
  containerLow: "#f3f4f5",
  container: "#edeeef",
  containerHigh: "#e7e8e9",
  containerHighest: "#e1e3e4",
  onSurface: "#191c1d",
  onSurfaceVariant: "#44474c",
  outline: "#74777d",
  outlineVariant: "#c4c6cc",
  appBar: "#f8f9fa",
  appBarText: "#060a17",
  primaryText: "#1a1c1d",
  secondaryText: "#4c607c",
  buttonPrimary: "#ed4a14",
};

const DARK = {
  surface: "#191c1d",
  containerLowest: "#0e1011",
  containerLow: "#1e2021",
  container: "#222426",
  containerHigh: "#2c2e2f",
  containerHighest: "#373839",
  onSurface: "#e1e3e4",
  onSurfaceVariant: "#c4c6cc",
  outline: "#8e9099",
  outlineVariant: "#44474c",
  appBar: "#1e2021",
  appBarText: "#F0F1F2",
  primaryText: "#e2e3e4",
  secondaryText: "#939499",
  buttonPrimary: "#ed4a14",
};

// Shared component overrides that don't depend on mode
const sharedComponents = {
  MuiButton: {
    defaultProps: { disableElevation: true },
    styleOverrides: {
      root: {
        borderRadius: 0,
        textTransform: "uppercase" as const,
        letterSpacing: "0.08em",
      },
    },
  },
  MuiChip: {
    styleOverrides: {
      root: { borderRadius: 4 },
    },
  },
};

const sharedTypography = {
  fontFamily: "'Inter', sans-serif",
  h1: { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, letterSpacing: "-0.03em" },
  h2: { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, letterSpacing: "-0.025em" },
  h3: { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, letterSpacing: "-0.02em" },
  h4: { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, letterSpacing: "-0.015em" },
  h5: { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 },
  h6: { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 },
  body1: { fontFamily: "'Inter', sans-serif", lineHeight: 1.6 },
  body2: { fontFamily: "'Inter', sans-serif", lineHeight: 1.5 },
  caption: { fontFamily: "'Manrope', sans-serif", fontWeight: 500, fontSize: "0.7rem" },
  overline: {
    fontFamily: "'Manrope', sans-serif",
    fontWeight: 800,
    fontSize: "0.625rem",
    letterSpacing: "0.15em",
    textTransform: "uppercase" as const,
  },
  button: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontWeight: 700,
    letterSpacing: "0.08em",
  },
};

export function createAppTheme(mode: PaletteMode) {
  const S = mode === "light" ? LIGHT : DARK;
  const isDark = mode === "dark";

  return createTheme({
    palette: {
      mode,
      primary: {
        main: isDark ? "#bbc6e2" : "#000000",   // inverse-primary in dark
        light: "#101b30",
        dark: "#000000",
        contrastText: isDark ? "#1a1c2a" : "#ffffff",
      },
      secondary: {
        main: isDark ? "#afc9ea" : "#47607e",   // secondary-fixed-dim in dark
        light: "#79849d",
        contrastText: isDark ? "#0d2135" : "#ffffff",
      },
      error: {
        main: "#ed4a14",                         // Signal — same in both modes
        contrastText: "#ffffff",
      },
      background: {
        default: S.surface,
        paper: isDark ? S.containerLow : S.containerLowest,
      },
      text: {
        primary: S.onSurface,
        secondary: S.onSurfaceVariant,
        disabled: S.outline,
      },
      divider: isDark
        ? "rgba(68, 71, 76, 0.4)"      // outlineVariant dark at 40%
        : "rgba(196, 198, 204, 0.15)", // outlineVariant light at 15% (Ghost Border rule)
      
    },

    typography: sharedTypography,

    shape: {
      borderRadius: 2, // Near-square — precision instrument aesthetic
    },

    components: {
      ...sharedComponents,

      MuiCssBaseline: {
        styleOverrides: {
          "*, *::before, *::after": { boxSizing: "border-box" },
          body: {
            margin: 0,
            padding: 0,
            backgroundColor: S.surface,
            color: S.onSurface,
          },
        },
      },

      // AppBar — always uses the deep primary-container regardless of mode
      MuiAppBar: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            backgroundColor: S.appBar,
            color: S.appBarText,
            boxShadow: "none",
          },
        },
      },

      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            backgroundColor: isDark ? S.containerLow : S.containerLowest,
            boxShadow: isDark
              ? "0 2px 24px rgba(0, 0, 0, 0.3)"
              : "0 2px 24px rgba(25, 28, 29, 0.05)",
          },
          elevation6: {
            boxShadow: isDark
              ? "0 4px 40px rgba(0, 0, 0, 0.5)"
              : "0 4px 40px rgba(25, 28, 29, 0.08)",
          },
        },
      },

      // Filled inputs — top-rounded only, underline only (no border)
      MuiFilledInput: {
        styleOverrides: {
          root: {
            backgroundColor: S.containerHigh,
            borderRadius: "2px 2px 0 0",
            "&:hover": { backgroundColor: S.containerHighest },
            "&.Mui-focused": { backgroundColor: S.containerHigh },
            "&:before": { borderBottomColor: S.outlineVariant },
            "&:after": { borderBottomColor: isDark ? "#afc9ea" : "#47607e" },
          },
        },
      },

      MuiDivider: {
        styleOverrides: {
          root: {
            borderColor: isDark
              ? "rgba(68, 71, 76, 0.4)"
              : "rgba(196, 198, 204, 0.15)",
          },
        },
      },
    },
  });
}
