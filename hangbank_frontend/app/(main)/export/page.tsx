"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
    Box, Button, Chip, CircularProgress, MenuItem,
    Paper, Select, Typography,
} from "@mui/material";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import api from "@/app/axios";
import { ProjectDto } from "@/app/components/types/project.dto";
import { useSnackbar, Severity } from "@/app/providers/SnackbarProvider";
import { BODY, HEADLINE, LABEL, ORANGE } from "@/app/components/style-constants";
import AudioFileCard, { ExportableAudioFile } from "./components/audio-file-card";
import { EXPORT_FORMATS, EXPORT_FORMAT_LABELS, ExportFormat } from "./components/export-format";

function PanelHeader({ label }: { label: string }) {
    return (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2.5 }}>
            <Box sx={{ width: 4, height: 20, bgcolor: ORANGE, borderRadius: "2px" }} />
            <Typography sx={{ fontFamily: LABEL, fontWeight: 700, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--app-text-secondary)" }}>
                {label}
            </Typography>
        </Box>
    );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
    return (
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
            <Typography sx={{ fontFamily: LABEL, fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--app-text-faint)" }}>
                {label}
            </Typography>
            <Typography sx={{ fontFamily: HEADLINE, fontSize: "0.95rem", fontWeight: 700, color: "#f8fafc" }}>
                {value}
            </Typography>
        </Box>
    );
}

function ExportPageInner() {
    const { t } = useTranslation("common");
    const { showMessage } = useSnackbar();
    const searchParams = useSearchParams();

    const [projects, setProjects] = useState<ProjectDto[]>([]);
    const [loadingProjects, setLoadingProjects] = useState(true);
    const [selectedProjectId, setSelectedProjectId] = useState("");

    const [audioFiles, setAudioFiles] = useState<ExportableAudioFile[]>([]);
    const [loadingFiles, setLoadingFiles] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const [format, setFormat] = useState<ExportFormat>(ExportFormat.LJSpeech);
    const [exporting, setExporting] = useState(false);

    // Load the projects the user owns; preselect one if ?project= is present.
    useEffect(() => {
        let cancelled = false;
        api.get<ProjectDto[]>("/project")
            .then(({ data }) => {
                if (cancelled) return;
                setProjects(data);
                const paramId = searchParams.get("project");
                if (paramId && data.some((p) => p.id === paramId)) {
                    setSelectedProjectId(paramId);
                }
            })
            .catch(() => { if (!cancelled) showMessage(t("export_page.error_load_projects"), Severity.error); })
            .finally(() => { if (!cancelled) setLoadingProjects(false); });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Load the selected project's exportable audio files; select them all by default.
    useEffect(() => {
        if (!selectedProjectId) {
            setAudioFiles([]);
            setSelectedIds(new Set());
            return;
        }
        let cancelled = false;
        setLoadingFiles(true);
        api.get<ExportableAudioFile[]>(`/project/${selectedProjectId}/audio-files`)
            .then(({ data }) => {
                if (cancelled) return;
                setAudioFiles(data);
                setSelectedIds(new Set(data.map((f) => f.audioFileId)));
            })
            .catch(() => {
                if (cancelled) return;
                setAudioFiles([]);
                setSelectedIds(new Set());
                showMessage(t("export_page.error_load_files"), Severity.error);
            })
            .finally(() => { if (!cancelled) setLoadingFiles(false); });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedProjectId]);

    const selectedProject = useMemo(
        () => projects.find((p) => p.id === selectedProjectId) ?? null,
        [projects, selectedProjectId],
    );

    const toggle = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleExport = async () => {
        if (!canExport || exporting) return;
        setExporting(true);
        try {
            const resp = await api.post(
                `/export/${selectedProjectId}`,
                { format, audioFileIds: Array.from(selectedIds) },
                { responseType: "blob" },
            );

            // Prefer the server-provided filename, fall back to a sensible default
            const disposition = resp.headers["content-disposition"] as string | undefined;
            const filename = disposition?.match(/filename="?([^"]+)"?/)?.[1]
                ?? `export-${selectedProjectId}.zip`;

            const url = URL.createObjectURL(resp.data as Blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);

            showMessage(t("export_page.export_success"), Severity.success);
        } catch {
            showMessage(t("export_page.export_error"), Severity.error);
        } finally {
            setExporting(false);
        }
    };

    const canExport = !!selectedProjectId && selectedIds.size > 0;

    return (
        <Box sx={{ p: { xs: 3, md: 5 }, maxWidth: 1200, mx: "auto" }}>
            <Typography sx={{ fontFamily: HEADLINE, fontWeight: 700, fontSize: "1.75rem", color: "var(--app-text-primary)", letterSpacing: "-0.02em" }}>
                {t("export_page.title")}
            </Typography>
            <Typography sx={{ fontFamily: BODY, fontSize: "0.95rem", color: "var(--app-text-muted)", mt: 0.5, mb: 4 }}>
                {t("export_page.description")}
            </Typography>

            <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, gap: 3, alignItems: "flex-start" }}>
                {/* Main column */}
                <Box sx={{ flex: 1, width: "100%", minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>

                    {/* Source selection */}
                    <Paper elevation={0} sx={{ border: "1px solid var(--app-border)", borderRadius: 3, p: 3 }}>
                        <PanelHeader label={t("export_page.source_selection")} />

                        {loadingProjects ? (
                            <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                                <CircularProgress size={22} />
                            </Box>
                        ) : (
                            <Select
                                value={selectedProjectId}
                                onChange={(e) => setSelectedProjectId(e.target.value)}
                                fullWidth
                                displayEmpty
                                sx={{ borderRadius: "8px" }}
                                renderValue={(val) =>
                                    val
                                        ? (projects.find((p) => p.id === val)?.name ?? val)
                                        : <Box component="span" sx={{ color: "var(--app-text-faint)" }}>{t("export_page.select_project")}</Box>
                                }
                            >
                                {projects.map((p) => (
                                    <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                                ))}
                            </Select>
                        )}

                        {/* Audio files list */}
                        {selectedProjectId && (
                            <Box sx={{ mt: 3 }}>
                                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
                                    <Typography sx={{ fontFamily: LABEL, fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--app-text-faint)" }}>
                                        {t("export_page.audio_files")}
                                    </Typography>
                                    <Chip
                                        label={t("export_page.items_selected", { count: selectedIds.size })}
                                        size="small"
                                        sx={{ bgcolor: "var(--app-btn)", color: "#fff", fontFamily: LABEL, fontWeight: 700, fontSize: "0.65rem" }}
                                    />
                                </Box>

                                {loadingFiles ? (
                                    <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                                        <CircularProgress size={22} />
                                    </Box>
                                ) : audioFiles.length === 0 ? (
                                    <Typography sx={{ fontFamily: BODY, fontSize: "0.875rem", color: "var(--app-text-faint)", py: 2 }}>
                                        {t("export_page.no_audio_files")}
                                    </Typography>
                                ) : (
                                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                                        {audioFiles.map((f) => (
                                            <AudioFileCard
                                                key={f.audioFileId}
                                                file={f}
                                                selected={selectedIds.has(f.audioFileId)}
                                                onToggle={() => toggle(f.audioFileId)}
                                            />
                                        ))}
                                    </Box>
                                )}
                            </Box>
                        )}
                    </Paper>

                    {/* Format selection */}
                    <Paper elevation={0} sx={{ border: "1px solid var(--app-border)", borderRadius: 3, p: 3 }}>
                        <PanelHeader label={t("export_page.select_format")} />
                        <Select
                            value={format}
                            onChange={(e) => setFormat(e.target.value as ExportFormat)}
                            fullWidth
                            sx={{ borderRadius: "8px" }}
                        >
                            {EXPORT_FORMATS.map((f) => (
                                <MenuItem key={f} value={f}>{EXPORT_FORMAT_LABELS[f]}</MenuItem>
                            ))}
                        </Select>
                    </Paper>
                </Box>

                {/* Export summary side panel */}
                <Paper
                    elevation={0}
                    sx={{
                        width: { xs: "100%", md: 320 },
                        flexShrink: 0,
                        bgcolor: "#101b30",
                        borderRadius: 3,
                        p: 3,
                        position: { md: "sticky" },
                        top: { md: 24 },
                    }}
                >
                    <Typography sx={{ fontFamily: HEADLINE, fontWeight: 700, fontSize: "1rem", color: "#f8fafc", mb: 3 }}>
                        {t("export_page.summary_title")}
                    </Typography>

                    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <SummaryRow label={t("export_page.summary_selected_blocks")} value={String(selectedIds.size)} />
                        <SummaryRow label={t("export_page.summary_bitrate")} value="16-bit" />
                        <SummaryRow
                            label={t("export_page.summary_sample_rate")}
                            value={selectedProject?.samplingRate ? `${selectedProject.samplingRate.toLocaleString()} Hz` : "—"}
                        />
                        <SummaryRow label={t("export_page.summary_format")} value={EXPORT_FORMAT_LABELS[format]} />
                    </Box>

                    <Button
                        fullWidth
                        variant="contained"
                        startIcon={exporting ? <CircularProgress size={16} sx={{ color: "inherit" }} /> : <FileDownloadOutlinedIcon />}
                        onClick={handleExport}
                        disabled={!canExport || exporting}
                        sx={{
                            mt: 3.5,
                            bgcolor: ORANGE,
                            color: "#fff",
                            borderRadius: 2,
                            py: 1.25,
                            fontFamily: LABEL,
                            fontWeight: 700,
                            fontSize: "0.8rem",
                            textTransform: "none",
                            "&:hover": { bgcolor: "#c93d0f" },
                            "&.Mui-disabled": { bgcolor: "rgba(237,74,20,0.3)", color: "rgba(255,255,255,0.5)" },
                        }}
                    >
                        {t("export_page.initiate_export")}
                    </Button>
                </Paper>
            </Box>
        </Box>
    );
}

// Suspense boundary required for useSearchParams in the App Router
export default function ExportPage() {
    return (
        <Suspense fallback={
            <Box sx={{ display: "flex", justifyContent: "center", mt: 12 }}>
                <CircularProgress />
            </Box>
        }>
            <ExportPageInner />
        </Suspense>
    );
}
