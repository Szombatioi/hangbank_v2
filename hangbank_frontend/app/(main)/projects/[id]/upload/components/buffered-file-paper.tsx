"use client";
import { Delete } from "@mui/icons-material";
import { Box, Chip, IconButton, Paper, Typography } from "@mui/material";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import ConfirmDialog from "@/app/components/confirm-dialog";
import { BODY, LABEL } from "@/app/components/style-constants";

interface BufferedAudioFilePaperProps {
  filename: string;
  onDelete: () => void;
}

export default function BufferedAudioFilePaper({
  filename,
  onDelete,
}: BufferedAudioFilePaperProps) {
  const { t } = useTranslation("common");
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  return (
    <Paper
      sx={{
        py: 2,
        px: 2,
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <Typography
        sx={{
          fontFamily: BODY,
          fontWeight: 600,
          color: "var(--app-text-primary)",
          wordBreak: "break-all",
          minWidth: 0,
        }}
      >
        {filename}
      </Typography>

      <Box
        sx={{
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 0.5,
          ml: 2,
        }}
      >
        <Chip
          label={t("uploaded_file.buffered")}
          size="small"
          sx={{
            fontFamily: LABEL,
            fontWeight: 700,
            fontSize: "0.65rem",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            bgcolor: "var(--app-info-bg, #e8f0fe)",
            color: "var(--app-info-fg, #1a56db)",
          }}
        />
        <IconButton
          onClick={() => setConfirmDeleteOpen(true)}
          sx={{ width: 40, height: 40 }}
        >
          <Delete />
        </IconButton>
      </Box>

      <ConfirmDialog
        open={confirmDeleteOpen}
        title={t("uploaded_file.remove_title")}
        description={t("uploaded_file.remove_description")}
        proceedLabel={t("uploaded_file.remove_confirm")}
        dangerous
        onProceed={() => {
          setConfirmDeleteOpen(false);
          onDelete();
        }}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </Paper>
  );
}
