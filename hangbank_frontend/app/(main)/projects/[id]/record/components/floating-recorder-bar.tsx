"use client";

import { Box, Grid, IconButton, Paper, Tooltip, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import Recorder, { RecorderAudioFile } from "@/app/components/recorder";
import SaveButton from "@/app/components/save-button";
import { BODY, LABEL } from "@/app/components/style-constants";
import { COLOR } from "../helpers/colors";
import { ArrowLeft, ArrowRight } from "@mui/icons-material";

interface FloatingRecorderBarProps {
    showRecorder: boolean;
    deviceId: string;
    sampleRate?: number;
    onAudioBlob: (blob: Blob, durationSeconds: number) => void;
    bufferSize: number;
    saving: boolean;
    onSave: () => void;
    /** Pre-recorded audio for the current block, if it was already recorded */
    recordedAudio: RecorderAudioFile | null;
    /** Remounts the recorder per block so the right audio loads (and state resets) */
    recorderKey?: string;
    onPrev: () => void;
    onNext: () => void;
    canPrev: boolean;
    canNext: boolean;
    /** Live transcription output + language (BCP-47) */
    onTranscript?: (text: string) => void;
    transcriptionLang?: string;
}

export default function FloatingRecorderBar({
    showRecorder, deviceId, sampleRate, onAudioBlob, bufferSize, saving, onSave,
    recordedAudio, recorderKey, onPrev, onNext, canPrev, canNext,
    onTranscript, transcriptionLang,
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
                        recordedAudio={recordedAudio}
                        sessionKey={recorderKey}
                        onTranscript={onTranscript}
                        transcriptionLang={transcriptionLang}
                    />
                )}

                <Grid container>
                    <Grid size={4}>
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
                    </Grid>

                    <Grid size={4} sx={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", gap: 1 }}>
                        <Tooltip title={t("record.prev_block_tooltip")}>
                            <span>
                                <IconButton onClick={onPrev} disabled={!canPrev}>
                                    <ArrowLeft />
                                </IconButton>
                            </span>
                        </Tooltip>
                        <span style={{
                            WebkitTouchCallout: "none",
                            WebkitUserSelect: "none",
                            KhtmlUserSelect: "none",
                            MozUserSelect: "none",
                            msUserSelect: "none",
                            userSelect: "none",
                        }}>|</span>
                        <Tooltip title={t("record.next_block_tooltip")}>
                            <span>
                                <IconButton onClick={onNext} disabled={!canNext}>
                                    <ArrowRight />
                                </IconButton>
                            </span>
                        </Tooltip>
                    </Grid>

                    <Grid size={4} sx={{ display: "flex", justifyContent: "end", alignItems: "center" }}>
                        <SaveButton
                            onClick={onSave}
                            saving={saving}
                            disabled={bufferSize === 0}
                            count={bufferSize}
                        />
                    </Grid>
                </Grid>
            </Paper>
        </Box>
    );
}
