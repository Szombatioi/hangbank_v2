"use client";
import { Delete, RestoreFromTrash, WarningAmberRounded } from "@mui/icons-material";
import { Box, IconButton, Paper, Tooltip, Typography } from "@mui/material";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import api from "@/app/axios";
import ConfirmDialog from "@/app/components/confirm-dialog";
import { BODY, LABEL } from "@/app/components/style-constants";
import MasterFileButton from "./master-file-button";
import AudioPlayButton from "./audio-play-button";

interface UploadedAudioFilePaperProps {
  id: string;
  filename: string;
  type: string; //e.g. mp3
  originalSamplingRate: number | null; // Hz
  isMasterPrompt: boolean;
  setAsMasterPrompt: (id: string) => void;
  onDelete: () => void;
  onOpen: () => void;
  markedForDeletion?: boolean;
  onRestore?: () => void;
  modified?: boolean;
}

const fileDetailsSx = {
  fontFamily: LABEL,
  fontSize: "0.7rem",
  fontWeight: "bold",
  textTransform: "uppercase",
  color: "var(--app-text-faint)",
} as const;

const actionButtonSx = { width: 40, height: 40 } as const;

export default function UploadedAudioFilePaper({
  id,
  filename,
  type,
  originalSamplingRate,
  isMasterPrompt,
  setAsMasterPrompt,
  onDelete,
  onOpen,
  markedForDeletion = false,
  onRestore,
  modified = false,
}: UploadedAudioFilePaperProps) {
  const { t } = useTranslation("common");
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const fetchPresignedUrl = async () => {
    const { data } = await api.get<{ url: string }>(
      `/project/audio-file/${id}/url`,
    );
    return data.url;
  };

  const samplingRateLabel =
    originalSamplingRate != null ? `${originalSamplingRate / 1000} kHz` : "—";

  return (
    <Paper
      sx={{
        py: 2,
        px: 2,
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "stretch",
        opacity: markedForDeletion ? 0.55 : 1,
      }}
    >
      {/* Left side: opens the details dialog */}
      <Box
        onClick={onOpen}
        sx={{
          cursor: "pointer",
          flexGrow: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          alignItems: "start",
          gap: 2,
        }}
      >
        {/* Top: file name */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
          <Typography
            sx={{
              fontFamily: BODY,
              fontWeight: 600,
              color: "var(--app-text-primary)",
              wordBreak: "break-all",
              textDecoration: markedForDeletion ? "line-through" : "none",
            }}
          >
            {filename}
          </Typography>
          {modified && (
            <Tooltip title={t("uploaded_file.modified_tooltip")}>
              <WarningAmberRounded
                sx={{ fontSize: "1.1rem", color: "#f5a623", flexShrink: 0 }}
              />
            </Tooltip>
          )}
        </Box>

        {/* Bottom: details */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 3,
          }}
        >
          <AudioPlayButton resolveUrl={fetchPresignedUrl} />

          <Typography sx={fileDetailsSx}>{type}</Typography>

          <Typography sx={fileDetailsSx}>{samplingRateLabel}</Typography>
        </Box>
      </Box>

      {/* Right side: actions */}
      <Box
        sx={{
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 0.5,
          ml: 2,
        }}
      >
        <MasterFileButton
          isMasterPrompt={isMasterPrompt}
          disabled={markedForDeletion}
          onConfirm={() => setAsMasterPrompt(id)}
        />
        {markedForDeletion ? (
          <Tooltip title={t("uploaded_file.restore_tooltip")}>
            <IconButton onClick={onRestore} sx={actionButtonSx}>
              <RestoreFromTrash />
            </IconButton>
          </Tooltip>
        ) : (
          <IconButton
            onClick={() => setConfirmDeleteOpen(true)}
            sx={actionButtonSx}
          >
            <Delete />
          </IconButton>
        )}
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
