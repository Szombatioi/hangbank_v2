"use client";
import {
  Delete,
  PauseCircleFilled,
  PlayCircleFilled,
  RestoreFromTrash,
  WarningAmberRounded,
} from "@mui/icons-material";
import {
  Box,
  CircularProgress,
  IconButton,
  Paper,
  Tooltip,
  Typography,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "@/app/axios";
import ConfirmDialog from "@/app/components/confirm-dialog";
import { BODY, LABEL } from "@/app/components/style-constants";
import { translateHttpError } from "@/app/components/helpers/http-error";
import { useSnackbar, Severity } from "@/app/providers/SnackbarProvider";

interface UploadedAudioFilePaperProps {
  id: string;
  filename: string;
  type: string; //e.g. mp3
  originalSamplingRate: number; // Hz
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
  const { showMessage } = useSnackbar();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loadingAudio, setLoadingAudio] = useState(false);

  const [confirmMasterOpen, setConfirmMasterOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  const togglePlayback = async () => {
    if (isPlaying) {
      audioRef.current?.pause();
      return;
    }

    let audio = audioRef.current;
    if (!audio) {
      setLoadingAudio(true);
      try {
        const { data } = await api.get<{ url: string }>(
          `/project/audio-file/${id}/url`
        );
        audio = new Audio(data.url);
        audio.addEventListener("play", () => setIsPlaying(true));
        audio.addEventListener("pause", () => setIsPlaying(false));
        audio.addEventListener("ended", () => setIsPlaying(false));
        audio.addEventListener("error", () => {
          audioRef.current = null;
          setIsPlaying(false);
        });
        audioRef.current = audio;
      } catch (err) {
        showMessage(
          translateHttpError(err, t, t("uploaded_file.error_play")),
          Severity.error
        );
        return;
      } finally {
        setLoadingAudio(false);
      }
    }

    try {
      await audio.play();
    } catch {
      audioRef.current = null;
      showMessage(t("uploaded_file.error_play"), Severity.error);
    }
  };

  const samplingRateLabel = `${originalSamplingRate / 1000} kHz`;

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
        {/* Top: file name (+ unsaved-changes marker) */}
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
          <Tooltip
            title={isPlaying ? t("uploaded_file.pause") : t("uploaded_file.play")}
          >
            <span>
              <IconButton
                sx={{ padding: 0 }}
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlayback();
                }}
                disabled={loadingAudio}
              >
                {loadingAudio ? (
                  <CircularProgress size={24} />
                ) : isPlaying ? (
                  <PauseCircleFilled />
                ) : (
                  <PlayCircleFilled />
                )}
              </IconButton>
            </span>
          </Tooltip>

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
        <Tooltip
          title={
            isMasterPrompt
              ? t("uploaded_file.master_tooltip")
              : t("uploaded_file.set_master_tooltip")
          }
        >
          <span>
            <IconButton
              onClick={() => setConfirmMasterOpen(true)}
              disabled={isMasterPrompt || markedForDeletion}
              sx={{
                ...actionButtonSx,
                fontFamily: LABEL,
                fontWeight: 700,
                fontSize: "1rem",
                "&.Mui-disabled": isMasterPrompt
                  ? { bgcolor: "#fdf5e7", color: "#603e11" }
                  : undefined,
              }}
            >
              M
            </IconButton>
          </span>
        </Tooltip>
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
        open={confirmMasterOpen}
        title={t("uploaded_file.set_master_title")}
        description={t("uploaded_file.set_master_description")}
        proceedLabel={t("uploaded_file.set_master_confirm")}
        onProceed={() => {
          setConfirmMasterOpen(false);
          setAsMasterPrompt(id);
        }}
        onCancel={() => setConfirmMasterOpen(false)}
      />

      <ConfirmDialog
        open={confirmDeleteOpen}
        title={t("uploaded_file.remove_title")}
        description={t("uploaded_file.remove_description")}
        proceedLabel={t("uploaded_file.remove_confirm")}
        dangerous
        onProceed={() => {
          setConfirmDeleteOpen(false);
          audioRef.current?.pause();
          onDelete();
        }}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </Paper>
  );
}
