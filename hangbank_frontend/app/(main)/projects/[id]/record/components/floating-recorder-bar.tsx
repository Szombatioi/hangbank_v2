"use client";

import { Box, Button, CircularProgress, Paper, Typography } from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import { useTranslation } from "react-i18next";
import Recorder from "@/app/components/recorder";
import { BODY, LABEL } from "@/app/components/style-constants";
import { COLOR } from "../helpers/colors";

interface FloatingRecorderBarProps {
    showRecorder: boolean;
    deviceId: string;
    sampleRate?: number;
    onAudioBlob: (blob: Blob, durationSeconds: number) => void;
    bufferSize: number;
    saving: boolean;
    onSave: () => void;
}

export default function FloatingRecorderBar({
    showRecorder, deviceId, sampleRate, onAudioBlob, bufferSize, saving, onSave,
}: FloatingRecorderBarProps) {
    const { t } = useTranslation("common");

    return (
        <Box
            sx={{
                position: "absolute",
                bottom: 24,
                left: "50%",
                transform: "translateX(-50%)",
                width: "min(720px, calc(100% - 96px))",
                zIndex: 50,
            }}
        >
            <Paper
                elevation={6}
                sx={{
                    bgcolor: "rgba(255,255,255,0.85)",
                    backdropFilter: "blur(16px)",
                    borderRadius: 4,
                    border: "1px solid rgba(255,255,255,0.4)",
                    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
                    p: 3,
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                }}
            >
                {showRecorder && (
                    <Recorder
                        deviceId={deviceId}
                        onAudioBlob={onAudioBlob}
                        sampleRate={sampleRate}
                        bitDepth={16}
                    />
                )}

                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
                    <Box>
                        <Typography
                            sx={{
                                fontFamily: LABEL,
                                fontSize: 10,
                                fontWeight: 700,
                                textTransform: "uppercase",
                                letterSpacing: "0.12em",
                                color: `${COLOR.onSurfaceVariant}99`,
                            }}
                        >
                            {t("record.pending_save_label")}
                        </Typography>
                        <Typography
                            sx={{
                                fontFamily: BODY,
                                fontSize: 14,
                                fontWeight: 600,
                                color: COLOR.onSurface,
                            }}
                        >
                            {bufferSize} {t("record.recordings_unsaved")}
                        </Typography>
                    </Box>

                    <Button
                        variant="contained"
                        startIcon={saving
                            ? <CircularProgress size={14} sx={{ color: "inherit" }} />
                            : <SaveIcon sx={{ fontSize: "0.85rem !important" }} />}
                        onClick={onSave}
                        disabled={bufferSize === 0 || saving}
                        sx={{
                            bgcolor: COLOR.onSurface,
                            borderRadius: 1.5,
                            textTransform: "none",
                            fontFamily: LABEL,
                            fontWeight: 700,
                            fontSize: "0.75rem",
                            px: 2.5,
                            "&:hover": { bgcolor: "#0f172a" },
                            "&.Mui-disabled": { bgcolor: COLOR.surfaceContainerHighest, color: `${COLOR.onSurfaceVariant}80` },
                        }}
                    >
                        {saving ? t("record.saving") : `${t("record.save")}${bufferSize > 0 ? ` (${bufferSize})` : ""}`}
                    </Button>
                </Box>
            </Paper>
        </Box>
    );
}
