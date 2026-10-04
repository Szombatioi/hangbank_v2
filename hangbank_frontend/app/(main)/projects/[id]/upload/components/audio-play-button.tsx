"use client";
import { PauseCircleFilled, PlayCircleFilled } from "@mui/icons-material";
import { CircularProgress, IconButton, Tooltip } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { translateHttpError } from "@/app/components/helpers/http-error";
import { Severity, useSnackbar } from "@/app/providers/SnackbarProvider";

interface AudioPlayButtonProps {
  resolveUrl: () => Promise<string>;
  releaseUrl?: (url: string) => void;
}

export default function AudioPlayButton({
  resolveUrl,
  releaseUrl,
}: AudioPlayButtonProps) {
  const { t } = useTranslation("common");
  const { showMessage } = useSnackbar();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);

  const discardAudio = () => {
    audioRef.current?.pause();
    audioRef.current = null;
    if (urlRef.current) releaseUrl?.(urlRef.current);
    urlRef.current = null;
  };

  useEffect(() => discardAudio, []); // eslint-disable-line react-hooks/exhaustive-deps

  const togglePlayback = async () => {
    if (isPlaying) {
      audioRef.current?.pause();
      return;
    }

    let audio = audioRef.current;
    if (!audio) {
      setLoading(true);
      try {
        const url = await resolveUrl();
        urlRef.current = url;
        audio = new Audio(url);
        audio.addEventListener("play", () => setIsPlaying(true));
        audio.addEventListener("pause", () => setIsPlaying(false));
        audio.addEventListener("ended", () => setIsPlaying(false));
        audio.addEventListener("error", () => {
          discardAudio();
          setIsPlaying(false);
        });
        audioRef.current = audio;
      } catch (err) {
        showMessage(
          translateHttpError(err, t, t("uploaded_file.error_play")),
          Severity.error,
        );
        return;
      } finally {
        setLoading(false);
      }
    }

    try {
      await audio.play();
    } catch (err) {
      discardAudio();
      showMessage(
        err instanceof DOMException && err.name === "NotSupportedError" //when AIFF cannot be played on chrome etc.
          ? t("uploaded_file.error_play_unsupported")
          : t("uploaded_file.error_play"),
        Severity.error,
      );
    }
  };

  return (
    <Tooltip title={isPlaying ? t("uploaded_file.pause") : t("uploaded_file.play")}>
      <span>
        <IconButton
          sx={{ padding: 0 }}
          onClick={(e) => {
            e.stopPropagation();
            void togglePlayback();
          }}
          disabled={loading}
        >
          {loading ? (
            <CircularProgress size={24} />
          ) : isPlaying ? (
            <PauseCircleFilled />
          ) : (
            <PlayCircleFilled />
          )}
        </IconButton>
      </span>
    </Tooltip>
  );
}
