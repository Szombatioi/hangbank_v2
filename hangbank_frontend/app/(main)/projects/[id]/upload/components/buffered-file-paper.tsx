"use client";
import { Delete } from "@mui/icons-material";
import { Box, Chip, IconButton, Paper, Typography } from "@mui/material";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import ConfirmDialog from "@/app/components/confirm-dialog";
import { BODY, LABEL } from "@/app/components/style-constants";
import MasterFileButton from "./master-file-button";
import AudioPlayButton from "./audio-play-button";

interface BufferedAudioFilePaperProps {
  file: File;
  isMasterPrompt: boolean;
  setAsMasterPrompt: () => void;
  onDelete: () => void;
  onOpen: () => void;
}

export default function BufferedAudioFilePaper({
  file,
  isMasterPrompt,
  setAsMasterPrompt,
  onDelete,
  onOpen,
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
      <Box
        onClick={onOpen}
        sx={{
          cursor: "pointer",
          flexGrow: 1,
          minWidth: 0,
          alignSelf: "stretch",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          alignItems: "start",
          gap: 2,
        }}
      >
        <Typography
          sx={{
            fontFamily: BODY,
            fontWeight: 600,
            color: "var(--app-text-primary)",
            wordBreak: "break-all",
          }}
        >
          {file.name}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
          <AudioPlayButton
            resolveUrl={async () => URL.createObjectURL(file)}
            releaseUrl={(url) => URL.revokeObjectURL(url)}
          />
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
        </Box>
      </Box>

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
        <MasterFileButton
          isMasterPrompt={isMasterPrompt}
          onConfirm={setAsMasterPrompt}
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
