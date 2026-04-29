"use client";

import { CorpusDto } from "@/app/components/types/corpus.dto";
import { Box, Typography, Button } from "@mui/material";
import AlbumIcon from "@mui/icons-material/Album";
import { LABEL, BODY } from "../corpus-based-settings";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";

export function CorpusRow({
  corpus,
  selected,
  onSelect,
  onPreview,
  t,
}: {
  corpus: CorpusDto;
  selected: boolean;
  onSelect: () => void;
  onPreview: () => void;
  t: (k: string) => string;
}) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 2,
        px: 2,
        py: 1.75,
        borderRadius: 3,
        border: "1.5px solid",
        borderColor: selected ? "#191c1d" : "transparent",
        bgcolor: selected ? "#f0f0f0" : "transparent",
        transition: "all 0.15s",
        "&:hover": { bgcolor: selected ? "#f0f0f0" : "#f4f4f5" },
      }}
    >
      {/* Icon */}
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: 2,
          bgcolor: selected ? "#191c1d" : "#e7e8e9",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          transition: "background-color 0.15s",
        }}
      >
        <AlbumIcon sx={{ fontSize: "1.2rem", color: selected ? "#fff" : "#94a3b8" }} />
      </Box>

      {/* Info */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          sx={{
            fontFamily: LABEL,
            fontWeight: 700,
            fontSize: "0.875rem",
            color: "#0f172a",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {corpus.name}
        </Typography>
        <Typography sx={{ fontFamily: BODY, fontSize: "0.75rem", color: "#64748b" }}>
          {t(`language.${corpus.language.name}`)}
          {corpus.domain ? ` · ${corpus.domain.name}` : ""}
        </Typography>
      </Box>

      {/* Actions */}
      <Box sx={{ display: "flex", gap: 1, flexShrink: 0 }}>
        <Button
          size="small"
          variant="text"
          startIcon={<OpenInNewIcon sx={{ fontSize: "0.875rem !important" }} />}
          onClick={(e) => { e.stopPropagation(); onPreview(); }}
          sx={{
            fontFamily: LABEL,
            fontWeight: 600,
            fontSize: "0.75rem",
            textTransform: "none",
            color: "#64748b",
            "&:hover": { color: "#0f172a", bgcolor: "transparent" },
          }}
        >
          {t("new_project.corpus_based.dialog_preview")}
        </Button>

        <Button
          size="small"
          variant={selected ? "contained" : "outlined"}
          startIcon={selected ? <CheckCircleOutlineIcon sx={{ fontSize: "0.875rem !important" }} /> : undefined}
          onClick={(e) => { e.stopPropagation(); onSelect(); }}
          sx={
            selected
              ? {
                  fontFamily: LABEL,
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  textTransform: "none",
                  bgcolor: "#191c1d",
                  color: "#fff",
                  borderRadius: 2,
                  "&:hover": { bgcolor: "#0f172a" },
                }
              : {
                  fontFamily: LABEL,
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  textTransform: "none",
                  borderColor: "#cbd5e1",
                  color: "#334155",
                  borderRadius: 2,
                  "&:hover": { borderColor: "#191c1d", color: "#191c1d", bgcolor: "transparent" },
                }
          }
        >
          {selected
            ? t("new_project.corpus_based.dialog_selected")
            : t("new_project.corpus_based.dialog_select")}
        </Button>
      </Box>
    </Box>
  );
}