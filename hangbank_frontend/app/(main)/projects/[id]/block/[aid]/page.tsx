"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Box, CircularProgress, Paper, Typography } from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import api from "@/app/axios";
import Recorder, { RecorderAudioFile } from "@/app/components/recorder";
import { useSnackbar, Severity } from "@/app/providers/SnackbarProvider";
import { resolveMicrophone } from "../../record/helpers/mic-resolver";
import { formatDuration } from "../../record/helpers/format-duration";
import { BODY, HEADLINE, LABEL, ORANGE } from "@/app/components/style-constants";
import SaveButton from "@/app/components/save-button";

//TODO:
// list of AQC elements

interface AudioFileDetail extends RecorderAudioFile {
    blockId: string | null;
    name?: string;
    durationSeconds?: number;
    createdAt?: string;
    samplingRate?: number;
    microphoneLabel?: string | null;
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
    return (
        <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontFamily: LABEL, fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#94a3b8", mb: 0.25 }}>
                {label}
            </Typography>
            <Typography sx={{ fontFamily: BODY, fontSize: "0.9rem", fontWeight: 500, color: "#0f172a", wordBreak: "break-word" }}>
                {value || "—"}
            </Typography>
        </Box>
    );
}

interface SavedRecordingResult {
    blockId: string;
    audioFile: { id: string; s3Link: string; transcription: string };
}

export default function ViewRecording() {
    const { t } = useTranslation("common");
    const { showMessage } = useSnackbar();
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const aid = params.aid as string;

    const [audioFile, setAudioFile] = useState<AudioFileDetail | null>(null);
    const [deviceId, setDeviceId] = useState<string | null>(null);
    const [micWarning, setMicWarning] = useState(false);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [newRecording, setNewRecording] = useState<{ blob: Blob; durationSeconds: number } | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            try {
                const { data } = await api.get<AudioFileDetail>(`/project/audio-file/${aid}`);
                if (cancelled) return;
                setAudioFile(data);

                // Resolve the project's configured microphone so re-recording uses
                // the same device + sampling rate as the original take
                if (data.microphoneLabel) {
                    const { deviceId: resolved } = await resolveMicrophone(data.microphoneLabel);
                    if (cancelled) return;
                    setDeviceId(resolved);
                    setMicWarning(!resolved);
                } else {
                    setMicWarning(true);
                }
            } catch {
                if (!cancelled) setNotFound(true);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        load();
        return () => { cancelled = true; };
    }, [aid]);


    const handleAudioBlob = async (blob: Blob, durationSeconds: number) => {
        setNewRecording({ blob, durationSeconds });
    };

    const handleSaveRecording = async () => {
        setSaving(true);
        if (!audioFile?.blockId || !newRecording) {
            showMessage(t("view_recording.save_error"), Severity.error);
            return;
        }
        const form = new FormData();
        form.append("audio", newRecording.blob, `${audioFile.blockId}.wav`);
        form.append("meta", JSON.stringify([{
            blockId: audioFile.blockId,
            blockIndex: 0,
            durationSeconds: newRecording.durationSeconds,
            transcription: audioFile.transcription ?? "",
        }]));

        try {
            const resp = await api.post<{ results: SavedRecordingResult[] }>(
                `/project/${id}/recordings`,
                form,
                { headers: { "Content-Type": "multipart/form-data" } },
            );
            const saved = resp.data.results?.[0];
            if (saved) {
                setAudioFile(prev => prev ? {
                    ...prev,
                    id: saved.audioFile.id,
                    s3Link: saved.audioFile.s3Link,
                    transcription: saved.audioFile.transcription,
                } : prev);
                // Keep the URL valid (the old audio file id was deleted on overwrite)
                router.replace(`/projects/${id}/block/${saved.audioFile.id}`);
            }
            showMessage(t("view_recording.save_success"), Severity.success);
        } catch {
            showMessage(t("view_recording.save_error"), Severity.error);
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 12 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (notFound || !audioFile) {
        return (
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, mt: 12 }}>
                <WarningAmberIcon sx={{ fontSize: 48, color: "warning.main" }} />
                <Typography sx={{ fontFamily: BODY, fontWeight: 600, color: "#0f172a", textAlign: "center", maxWidth: 420 }}>
                    {t("view_recording.not_found")}
                </Typography>
            </Box>
        );
    }

    const fileFormat = audioFile.name?.split(".").pop()?.toUpperCase();

    return (
        <Box
            sx={{
                p: { xs: 3, md: 5 },
                maxWidth: 1100,
                mx: "auto",
                display: "flex",
                flexDirection: { xs: "column", md: "row" },
                gap: 4,
                alignItems: "flex-start",
            }}
        >
            {/* Main column */}
            <Box sx={{ flex: 1, width: "100%", minWidth: 0 }}>
                <Typography sx={{ fontFamily: HEADLINE, fontWeight: 700, fontSize: "1.5rem", color: "#0f172a", letterSpacing: "-0.02em", mb: 1 }}>
                    {t("view_recording.title")}
                </Typography>

                {audioFile.transcription && (
                    <Typography sx={{ fontFamily: LABEL, fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#94a3b8", mb: 0.5 }}>
                        {t("view_recording.transcription")}
                    </Typography>
                )}
                <Typography sx={{ fontFamily: BODY, fontSize: "1rem", color: "#1e293b", lineHeight: 1.6, mb: 3 }}>
                    {t("view_recording.transcription_label")}: {audioFile.transcription || "—"}
                </Typography>

                {micWarning && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                        <WarningAmberIcon sx={{ fontSize: 18, color: "warning.main" }} />
                        <Typography sx={{ fontFamily: BODY, fontSize: "0.85rem", color: "#92400e" }}>
                            {t("view_recording.mic_warning")}
                        </Typography>
                    </Box>
                )}

                <Recorder
                    deviceId={deviceId ?? ""}
                    sampleRate={audioFile.samplingRate}
                    onAudioBlob={handleAudioBlob}
                    recordedAudio={audioFile}
                />
                <Box sx={{ py: 1 }}>
                    <SaveButton
                        onClick={handleSaveRecording}
                        saving={saving}
                        disabled={!newRecording}
                        count={0}
                    />
                </Box>
            </Box>

            {/* Info box */}
            <Paper
                elevation={0}
                sx={{
                    width: { xs: "100%", md: 300 },
                    flexShrink: 0,
                    border: "1px solid #e2e8f0",
                    borderRadius: 3,
                    p: 3,
                }}
            >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2.5 }}>
                    <Box sx={{ width: 4, height: 20, bgcolor: ORANGE, borderRadius: "2px" }} />
                    <Typography sx={{ fontFamily: LABEL, fontWeight: 700, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.15em", color: "#475569" }}>
                        {t("view_recording.file_info")}
                    </Typography>
                </Box>

                <InfoRow label={t("view_recording.label_name")} value={audioFile.name} />
                <InfoRow label={t("view_recording.label_format")} value={fileFormat} />
                <InfoRow
                    label={t("view_recording.label_length")}
                    value={audioFile.durationSeconds != null ? formatDuration(audioFile.durationSeconds) : undefined}
                />
                <InfoRow
                    label={t("view_recording.label_sample_rate")}
                    value={audioFile.samplingRate ? `${audioFile.samplingRate.toLocaleString()} Hz` : undefined}
                />
                <InfoRow
                    label={t("view_recording.label_created")}
                    value={audioFile.createdAt ? new Date(audioFile.createdAt).toLocaleString() : undefined}
                />
            </Paper>
        </Box>
    );
}
