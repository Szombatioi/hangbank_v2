"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Box, Button, CircularProgress, Dialog, DialogContent, Typography,
} from "@mui/material";
import GraphicEqIcon from "@mui/icons-material/GraphicEq";
import SaveIcon from "@mui/icons-material/Save";
import { AxiosError } from "axios";
import api from "@/app/axios";
import Recorder from "@/app/components/recorder";
import { Severity, useSnackbar } from "@/app/contexts/SnackbarProvider";
import { BODY, HEADLINE, LABEL, ORANGE } from "@/app/components/style-constants";

interface MasterRecordingDialogProps {
    open: boolean;
    projectId: string;
    deviceId: string;
    sampleRate?: number;
    onSaved: () => void;
}

interface MasterRecordingTake {
    blob: Blob;
    durationSeconds: number;
}

function formatDuration(seconds: number): string {
    const safe = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
    const mm = Math.floor(safe / 60);
    const ss = Math.floor(safe % 60);
    const cs = Math.floor((safe * 100) % 100);
    return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

export default function MasterRecordingDialog({
    open, projectId, deviceId, sampleRate, onSaved,
}: MasterRecordingDialogProps) {
    const { t } = useTranslation("common");
    const { showMessage } = useSnackbar();

    const [prompt, setPrompt] = useState<string | null>(null);
    const [promptLoading, setPromptLoading] = useState(false);
    const [take, setTake] = useState<MasterRecordingTake | null>(null);
    const [saving, setSaving] = useState(false);

    // Fetch prompt when dialog opens; reset state when it closes so a re-open is clean
    useEffect(() => {
        if (!open) {
            setPrompt(null);
            setTake(null);
            return;
        }
        let cancelled = false;
        setPromptLoading(true);
        api.get<{ languageCode: string; text: string }>(`/project/${projectId}/master-recording-prompt`)
            .then(resp => { if (!cancelled) setPrompt(resp.data.text); })
            .catch(() => { if (!cancelled) setPrompt(t("master_recording.loading_prompt")); })
            .finally(() => { if (!cancelled) setPromptLoading(false); });
        return () => { cancelled = true; };
    }, [open, projectId, t]);

    const handleAudioBlob = useCallback((blob: Blob, durationSeconds: number) => {
        setTake({ blob, durationSeconds });
    }, []);

    const handleSave = async () => {
        if (!take) return;
        setSaving(true);
        const form = new FormData();
        form.append("audio", take.blob, "master.wav");
        form.append("durationSeconds", String(take.durationSeconds));
        try {
            await api.post(`/project/${projectId}/master-recording`, form, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            onSaved();
        } catch (err) {
            const status = (err as AxiosError)?.response?.status;
            if (status === 501) {
                showMessage(t("master_recording.save_not_implemented"), Severity.warning);
            } else {
                showMessage(t("master_recording.save_error"), Severity.error);
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog
            open={open}
            disableEscapeKeyDown
            // Blocking: ignore backdrop/escape dismissals — user must record and save (or abandon the page)
            onClose={() => { /* no-op */ }}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: { borderRadius: 3, bgcolor: "#f8f9fa" },
            }}
        >
            <DialogContent sx={{ p: { xs: 4, md: 6 }, display: "flex", flexDirection: "column", gap: 4 }}>
                {/* Header */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Box
                        sx={{
                            width: 40, height: 40, borderRadius: 999,
                            bgcolor: ORANGE, color: "#fff",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            flexShrink: 0,
                        }}
                    >
                        <GraphicEqIcon />
                    </Box>
                    <Box>
                        <Typography sx={{ fontFamily: HEADLINE, fontWeight: 700, fontSize: "1.5rem", lineHeight: 1.1, color: "#191c1d" }}>
                            {t("master_recording.title")}
                        </Typography>
                        <Typography sx={{ fontFamily: BODY, fontSize: "0.9rem", color: "#44474c", mt: 0.5 }}>
                            {t("master_recording.subtitle")}
                        </Typography>
                    </Box>
                </Box>

                {/* Prompt */}
                <Box>
                    <Typography
                        sx={{
                            fontFamily: LABEL,
                            fontSize: 11,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.15em",
                            color: "rgba(68,71,76,0.6)",
                            mb: 1.5,
                        }}
                    >
                        {t("master_recording.prompt_label")}
                    </Typography>
                    <Box
                        sx={{
                            p: 3,
                            bgcolor: "#fff",
                            borderRadius: 2,
                            border: "1px solid rgba(196,198,204,0.4)",
                            minHeight: 96,
                            display: "flex",
                            alignItems: "center",
                        }}
                    >
                        {promptLoading || !prompt ? (
                            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                                <CircularProgress size={18} />
                                <Typography sx={{ fontFamily: BODY, color: "#44474c" }}>
                                    {t("master_recording.loading_prompt")}
                                </Typography>
                            </Box>
                        ) : (
                            <Typography
                                sx={{
                                    fontFamily: HEADLINE,
                                    fontSize: { xs: "1.25rem", md: "1.5rem" },
                                    lineHeight: 1.4,
                                    color: "#191c1d",
                                    fontWeight: 500,
                                }}
                            >
                                “{prompt}”
                            </Typography>
                        )}
                    </Box>
                </Box>

                {/* Recorder */}
                <Recorder
                    deviceId={deviceId}
                    onAudioBlob={handleAudioBlob}
                    sampleRate={sampleRate}
                    bitDepth={16}
                />

                {/* Footer */}
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
                    <Box>
                        <Typography sx={{ fontFamily: LABEL, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(68,71,76,0.6)" }}>
                            {t("master_recording.duration_label")}
                        </Typography>
                        <Typography sx={{ fontFamily: HEADLINE, fontWeight: 700, fontSize: "1rem", fontVariantNumeric: "tabular-nums", color: take ? "#191c1d" : "rgba(68,71,76,0.5)" }}>
                            {take ? formatDuration(take.durationSeconds) : t("master_recording.no_recording_yet")}
                        </Typography>
                    </Box>
                    <Button
                        variant="contained"
                        startIcon={saving ? <CircularProgress size={14} sx={{ color: "inherit" }} /> : <SaveIcon sx={{ fontSize: "0.95rem !important" }} />}
                        disabled={!take || saving}
                        onClick={handleSave}
                        sx={{
                            bgcolor: "#191c1d",
                            borderRadius: 1.5,
                            textTransform: "none",
                            fontFamily: LABEL,
                            fontWeight: 700,
                            fontSize: "0.8rem",
                            px: 3,
                            py: 1.2,
                            "&:hover": { bgcolor: "#0f172a" },
                            "&.Mui-disabled": { bgcolor: "#e1e3e4", color: "rgba(68,71,76,0.5)" },
                        }}
                    >
                        {saving ? t("master_recording.saving") : t("master_recording.save")}
                    </Button>
                </Box>
            </DialogContent>
        </Dialog>
    );
}
