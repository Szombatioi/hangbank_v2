"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Box, Button, CircularProgress, Paper, TextField, Typography } from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import api from "@/app/axios";
import Recorder, { RecorderAudioFile } from "@/app/components/recorder";
import { useSnackbar, Severity } from "@/app/providers/SnackbarProvider";
import { resolveMicrophone } from "../../record/helpers/mic-resolver";
import { formatDuration } from "../../record/helpers/format-duration";
import { BODY, HEADLINE, LABEL, ORANGE } from "@/app/components/style-constants";
import SaveButton from "@/app/components/save-button";
import {
    AudioQualityMeasure,
    QualityRangesByType,
} from "@/app/components/helpers/audio-quality";
import QualityCheckCard from "./components/quality-check-card";

interface MasterRecordingInfo {
    id: string;
    name: string;
    durationSeconds: number | null;
}

interface AudioFileDetail extends RecorderAudioFile {
    blockId: string | null;
    blockIndex?: number | null;
    name?: string;
    projectName?: string | null;
    durationSeconds?: number;
    createdAt?: string;
    samplingRate?: number;
    microphoneLabel?: string | null;
    languageCode?: string | null;
    prompt?: string | null;
    masterRecording?: MasterRecordingInfo | null;
}

function SectionHeader({ label }: { label: string }) {
    return (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
            <Box sx={{ width: 4, height: 20, bgcolor: ORANGE, borderRadius: "2px" }} />
            <Typography sx={{ fontFamily: LABEL, fontWeight: 700, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--app-text-secondary)" }}>
                {label}
            </Typography>
        </Box>
    );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
    return (
        <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontFamily: LABEL, fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--app-text-faint)", mb: 0.25 }}>
                {label}
            </Typography>
            <Typography sx={{ fontFamily: BODY, fontSize: "0.9rem", fontWeight: 500, color: "var(--app-text-primary)", wordBreak: "break-word" }}>
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
    const [savingTranscription, setSavingTranscription] = useState(false);

    // Editable transcription (seeded from the saved value, updated live on re-record)
    const [transcription, setTranscription] = useState("");
    const [qualities, setQualities] = useState<AudioQualityMeasure[]>([]);
    const [ranges, setRanges] = useState<QualityRangesByType>({});

    // Presigned URL for playing the project's master recording
    const [masterUrl, setMasterUrl] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            try {
                const { data } = await api.get<AudioFileDetail>(`/project/audio-file/${aid}`);
                if (cancelled) return;
                setAudioFile(data);
                setTranscription(data.transcription ?? "");

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
                return;
            } finally {
                if (!cancelled) setLoading(false);
            }

            // Quality checks are non-critical — don't fail the page if they're missing.
            try {
                const [qResp, rResp] = await Promise.all([
                    api.get<AudioQualityMeasure[]>(`/audio-quality/audio-file/${aid}`),
                    api.get<QualityRangesByType>(`/audio-quality/ranges`),
                ]);
                if (cancelled) return;
                setQualities(qResp.data);
                setRanges(rResp.data);
            } catch {
                /* ignore — just no quality cards */
            }
        }
        load();
        return () => { cancelled = true; };
    }, [aid]);

    // Resolve a presigned URL for the master recording once we know its id.
    useEffect(() => {
        const masterId = audioFile?.masterRecording?.id;
        if (!masterId) {
            setMasterUrl(null);
            return;
        }
        let cancelled = false;
        api
            .get<{ url: string }>(`/project/audio-file/${masterId}/url`)
            .then(({ data }) => { if (!cancelled) setMasterUrl(data.url); })
            .catch(() => { if (!cancelled) setMasterUrl(null); });
        return () => { cancelled = true; };
    }, [audioFile?.masterRecording?.id]);

    // Re-fetch the stored quality measures (e.g. after editing the transcription).
    const refreshQualities = async () => {
        try {
            const { data } = await api.get<AudioQualityMeasure[]>(`/audio-quality/audio-file/${aid}`);
            setQualities(data);
        } catch {
            /* ignore */
        }
    };

    const handleAudioBlob = async (blob: Blob, durationSeconds: number) => {
        setNewRecording({ blob, durationSeconds });
    };

    const handleSaveRecording = async () => {
        if (!audioFile?.blockId || !newRecording) {
            showMessage(t("view_recording.save_error"), Severity.error);
            return;
        }
        setSaving(true);
        const form = new FormData();
        form.append("audio", newRecording.blob, `${audioFile.blockId}.wav`);
        form.append("meta", JSON.stringify([{
            blockId: audioFile.blockId,
            blockIndex: 0,
            durationSeconds: newRecording.durationSeconds,
            transcription: transcription, // the (possibly edited) transcription
        }]));

        try {
            const resp = await api.post<{ results: SavedRecordingResult[] }>(
                `/project/${id}/recordings`,
                form,
                { headers: { "Content-Type": "multipart/form-data" } },
            );
            const saved = resp.data.results?.[0];
            setNewRecording(null);
            if (saved) {
                // Re-running checks happens server-side on save; navigate to the new
                // audio file id (the old one was deleted) so the page reloads its
                // transcription + freshly computed quality checks.
                router.replace(`/projects/${id}/block/${saved.audioFile.id}`);
            }
            showMessage(t("view_recording.save_success"), Severity.success);
        } catch {
            showMessage(t("view_recording.save_error"), Severity.error);
        } finally {
            setSaving(false);
        }
    };

    // Save just the transcription (no new audio). Re-runs the transcription check.
    const handleSaveTranscription = async () => {
        setSavingTranscription(true);
        try {
            await api.patch(`/project/audio-file/${aid}/transcription`, { transcription });
            setAudioFile((prev) => (prev ? { ...prev, transcription } : prev));
            await refreshQualities();
            showMessage(t("view_recording.transcription_saved"), Severity.success);
        } catch {
            showMessage(t("view_recording.save_error"), Severity.error);
        } finally {
            setSavingTranscription(false);
        }
    };

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
                <Typography sx={{ fontFamily: BODY, fontWeight: 600, color: "var(--app-text-primary)", textAlign: "center", maxWidth: 420 }}>
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
                <Typography sx={{ fontFamily: HEADLINE, fontWeight: 700, fontSize: "1.5rem", color: "var(--app-text-primary)", letterSpacing: "-0.02em", mb: 2 }}>
                    {t("view_recording.title")}
                </Typography>

                {/* Current prompt — the expected text for this block */}
                <Box sx={{ mb: 3 }}>
                    <Typography sx={{ fontFamily: LABEL, fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--app-text-faint)", mb: 0.75 }}>
                        {t("view_recording.current_prompt")}
                    </Typography>
                    <Typography
                        sx={{
                            fontFamily: BODY,
                            fontSize: "1.1rem",
                            fontStyle: "italic",
                            lineHeight: 1.6,
                            color: "var(--app-text-body)",
                            borderLeft: `2px solid ${ORANGE}`,
                            pl: 2,
                            py: 0.5,
                        }}
                    >
                        {audioFile.prompt || "—"}
                    </Typography>
                </Box>

                {micWarning && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                        <WarningAmberIcon sx={{ fontSize: 18, color: "warning.main" }} />
                        <Typography sx={{ fontFamily: BODY, fontSize: "0.85rem", color: "var(--app-warn-fg)" }}>
                            {t("view_recording.mic_warning")}
                        </Typography>
                    </Box>
                )}

                <Recorder
                    deviceId={deviceId ?? ""}
                    sampleRate={audioFile.samplingRate}
                    onAudioBlob={handleAudioBlob}
                    recordedAudio={audioFile}
                    onTranscript={setTranscription}
                    transcriptionLang={audioFile.languageCode ?? undefined}
                />

                {/* Editable transcription */}
                <Box sx={{ mt: 3 }}>
                    <Typography sx={{ fontFamily: LABEL, fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--app-text-faint)", mb: 0.75 }}>
                        {t("view_recording.transcription")}
                    </Typography>
                    <TextField
                        value={transcription}
                        onChange={(e) => setTranscription(e.target.value)}
                        placeholder="—"
                        fullWidth
                        multiline
                        minRows={2}
                        sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px", fontFamily: BODY, fontSize: "0.95rem" } }}
                    />
                    {/* Save transcription only — independent of (re-)recording */}
                    <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={handleSaveTranscription}
                            disabled={savingTranscription || transcription === (audioFile.transcription ?? "")}
                            startIcon={savingTranscription ? <CircularProgress size={14} sx={{ color: "inherit" }} /> : undefined}
                            sx={{
                                borderRadius: 1.5,
                                textTransform: "none",
                                fontFamily: LABEL,
                                fontWeight: 700,
                                fontSize: "0.72rem",
                                borderColor: "var(--app-border-strong)",
                                color: "var(--app-text-primary)",
                                "&:hover": { borderColor: "var(--app-text-faint)", bgcolor: "var(--app-surface-subtle)" },
                            }}
                        >
                            {t("view_recording.save_transcription")}
                        </Button>
                    </Box>
                </Box>

                <Box sx={{ py: 2 }}>
                    <SaveButton
                        onClick={handleSaveRecording}
                        saving={saving}
                        disabled={!newRecording}
                    />
                </Box>

                {/* Quality checks */}
                <Box sx={{ mt: 2 }}>
                    <SectionHeader label={t("view_recording.quality_checks")} />
                    {qualities.length === 0 ? (
                        <Typography sx={{ fontFamily: BODY, fontSize: "0.875rem", color: "var(--app-text-faint)" }}>
                            {t("view_recording.no_quality_checks")}
                        </Typography>
                    ) : (
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                            {qualities
                                .filter((q) => ranges[q.type])
                                .map((q) => (
                                    <QualityCheckCard key={q.id} measure={q} meta={ranges[q.type]} />
                                ))}
                        </Box>
                    )}
                </Box>
            </Box>

            {/* Right column: info box + master recording */}
            <Box sx={{ width: { xs: "100%", md: 300 }, flexShrink: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                <Paper
                    elevation={0}
                    sx={{
                        border: "1px solid var(--app-border)",
                        borderRadius: 3,
                        p: 3,
                    }}
                >
                    <SectionHeader label={t("view_recording.file_info")} />

                    <InfoRow label={t("view_recording.label_project")} value={audioFile.projectName} />
                    <InfoRow
                        label={t("view_recording.label_block")}
                        value={audioFile.blockIndex != null ? `#${audioFile.blockIndex + 1}` : undefined}
                    />
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

                {/* Master recording — the project's reference voice */}
                {audioFile.masterRecording && (
                    <Paper
                        elevation={0}
                        sx={{
                            border: "1px solid var(--app-border)",
                            borderRadius: 3,
                            p: 3,
                        }}
                    >
                        <SectionHeader label={t("view_recording.master_recording")} />

                        <InfoRow label={t("view_recording.label_name")} value={audioFile.masterRecording.name} />
                        <InfoRow
                            label={t("view_recording.label_format")}
                            value={audioFile.masterRecording.name.split(".").pop()?.toUpperCase()}
                        />
                        <InfoRow
                            label={t("view_recording.label_length")}
                            value={audioFile.masterRecording.durationSeconds != null ? formatDuration(audioFile.masterRecording.durationSeconds) : undefined}
                        />
                        {masterUrl ? (
                            <Box
                                component="audio"
                                controls
                                src={masterUrl}
                                sx={{ width: "100%", mt: 1 }}
                            />
                        ) : (
                            <Typography sx={{ fontFamily: BODY, fontSize: "0.8rem", color: "var(--app-text-faint)", mt: 1 }}>
                                {t("view_recording.master_loading")}
                            </Typography>
                        )}
                    </Paper>
                )}
            </Box>
        </Box>
    );
}
