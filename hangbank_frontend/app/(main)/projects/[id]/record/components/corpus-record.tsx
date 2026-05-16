"use client";
//TODO: add prev + next block button
//TODO: add recording length to the recording and display THAT at the beginning of each recorded block
//TODO: always show 5 blocks, even if we are at the beginning - now it shows only 3 blocks
import { useCallback, useEffect, useRef, useState, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
    Box, Button, CircularProgress, Paper, Typography,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SaveIcon from "@mui/icons-material/Save";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import api from "@/app/axios";
import Recorder from "@/app/components/recorder";
import { getMicrophones } from "@/app/components/helpers/get-mics";
import { useSnackbar, Severity } from "@/app/contexts/SnackbarProvider";
import { CorpusProjectDetailDto } from "./corpus-project-details";
import { BODY, HEADLINE, LABEL, ORANGE } from "@/app/components/style-constants";

// ── Helpers ────────────────────────────────────────────────────────────────────
/** Extracts the USB VID:PID from a browser device label, e.g. "(0d8c:0134)". */
function extractVidPid(label: string): string | null {
    const match = label.match(/\(([0-9a-f]{4}:[0-9a-f]{4})\)$/i);
    return match ? match[1] : null;
}

// ── Constants ──────────────────────────────────────────────────────────────────
const BLOCKS_PAGE_SIZE = 20;
const LOAD_AHEAD_THRESHOLD = 5;
const BLOCK_WINDOW = 2; // number of blocks shown before and after the current one

// Visual tokens lifted from the design mockup (Material 3 derived palette)
const COLOR = {
    surface: "#f8f9fa",
    surfaceContainerLow: "#f3f4f5",
    surfaceContainerHighest: "#e1e3e4",
    onSurface: "#191c1d",
    onSurfaceVariant: "#44474c",
    outlineVariant: "#c4c6cc",
    primaryContainer: "#101b30",
    onPrimaryContainer: "#79849d",
    onPrimaryFixedVariant: "#3c475d",
    emeraldBg: "#d1fae5",
    emeraldText: "#047857",
};

// ── Types ──────────────────────────────────────────────────────────────────────
interface RecordingBlockDto {
    id: string;
    blockIndex: number;
    isRecorded: boolean;
    text?: string; // populated when backend provides corpus text per block
}

interface BufferedRecording {
    blob: Blob;
    blockId: string;
    blockIndex: number;
    durationSeconds: number;
}

// ── Status pill (top-left of left column) ──────────────────────────────────────
function StatusPill({ label }: { label: string }) {
    return (
        <Box
            sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 1,
                bgcolor: COLOR.primaryContainer,
                color: COLOR.onPrimaryContainer,
                py: 1, px: 2,
                borderRadius: 999,
                border: `1px solid ${COLOR.outlineVariant}1A`,
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
            }}
        >
            <Box
                sx={{
                    width: 8, height: 8, borderRadius: "50%",
                    bgcolor: COLOR.onPrimaryFixedVariant,
                    animation: "pulse 2s cubic-bezier(0.4,0,0.6,1) infinite",
                    "@keyframes pulse": {
                        "0%, 100%": { opacity: 1, transform: "scale(1)" },
                        "50%": { opacity: 0.6, transform: "scale(1.15)" },
                    },
                }}
            />
            <Typography
                sx={{
                    fontFamily: LABEL,
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.15em",
                }}
            >
                {label}
            </Typography>
        </Box>
    );
}

// ── Section: surrounding blocks list ───────────────────────────────────────────
function formatDuration(seconds: number): string {
    const safe = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
    const mm = Math.floor(safe / 60);
    const ss = Math.floor(safe % 60);
    const cs = Math.floor((safe * 100) % 100);
    return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

interface SurroundingBlocksProps {
    blocks: RecordingBlockDto[];
    currentIdx: number;
    bufferedRecordings: Map<string, BufferedRecording>;
    t: (k: string) => string;
}
function SurroundingBlocks({ blocks, currentIdx, bufferedRecordings, t }: SurroundingBlocksProps) {
    const from = Math.max(0, currentIdx - BLOCK_WINDOW);
    const to = Math.min(blocks.length, currentIdx + BLOCK_WINDOW + 1);
    const window = blocks.slice(from, to);

    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 4, maxWidth: 640 }}>
            {window.map((block) => {
                const idx = blocks.indexOf(block);
                const isCurrent = idx === currentIdx;
                const buffered = bufferedRecordings.get(block.id);
                const isRecorded = idx < currentIdx || !!buffered || block.isRecorded;
                const text = block.text || `${t("record.block")} #${block.blockIndex + 1}`;
                const durationLabel = buffered ? formatDuration(buffered.durationSeconds) : "";

                if (isCurrent) {
                    return (
                        <Box key={block.id} sx={{ display: "flex", alignItems: "flex-start", gap: 4 }}>
                            <Typography
                                sx={{
                                    fontFamily: LABEL,
                                    fontSize: 10,
                                    fontWeight: 700,
                                    color: ORANGE,
                                    pt: 1,
                                    width: 48,
                                    textAlign: "right",
                                }}
                            >
                                {t("record.live").toUpperCase()}
                            </Typography>
                            <Box sx={{ position: "relative", flex: 1 }}>
                                <Typography
                                    sx={{
                                        fontFamily: BODY,
                                        fontSize: 20,
                                        lineHeight: 1.6,
                                        color: COLOR.onSurface,
                                        fontWeight: 500,
                                        fontStyle: "italic",
                                        borderLeft: `2px solid ${ORANGE}`,
                                        pl: 3,
                                        py: 1,
                                        bgcolor: "rgba(59,9,0,0.05)",
                                    }}
                                >
                                    {text}
                                </Typography>
                                <Box
                                    sx={{
                                        position: "absolute",
                                        right: -4,
                                        bottom: 4,
                                        width: 8,
                                        height: 20,
                                        bgcolor: ORANGE,
                                        animation: "blink 1s steps(2,start) infinite",
                                        "@keyframes blink": {
                                            to: { visibility: "hidden" },
                                        },
                                    }}
                                />
                            </Box>
                        </Box>
                    );
                }

                return (
                    <Box
                        key={block.id}
                        sx={{ display: "flex", alignItems: "flex-start", gap: 4, opacity: isRecorded ? 0.55 : 0.35 }}
                    >
                        <Typography
                            sx={{
                                fontFamily: LABEL,
                                fontSize: 10,
                                color: COLOR.onSurfaceVariant,
                                fontVariantNumeric: "tabular-nums",
                                pt: 1,
                                width: 48,
                                textAlign: "right",
                            }}
                        >
                            {durationLabel}
                        </Typography>
                        <Typography sx={{ fontFamily: BODY, fontSize: 20, lineHeight: 1.6, flex: 1 }}>
                            {isRecorded && (
                                <Box
                                    component="span"
                                    sx={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 0.5,
                                        mr: 1.25,
                                        px: 0.75,
                                        py: 0.25,
                                        bgcolor: COLOR.emeraldBg,
                                        color: COLOR.emeraldText,
                                        borderRadius: 0.5,
                                        fontSize: 9,
                                        fontWeight: 700,
                                        textTransform: "uppercase",
                                        letterSpacing: "-0.02em",
                                        fontFamily: LABEL,
                                        verticalAlign: "middle",
                                    }}
                                >
                                    <CheckCircleIcon sx={{ fontSize: 12 }} />
                                    {t("project_detail.recorded").toUpperCase()}
                                </Box>
                            )}
                            {text}
                        </Typography>
                    </Box>
                );
            })}
        </Box>
    );
}

// ── Inner component (needs Suspense boundary for useSearchParams) ───────────────
function CorpusRecordInner() {
    const { t } = useTranslation("common");
    const { showMessage } = useSnackbar();
    const params = useParams();
    const searchParams = useSearchParams();
    const id = params.id as string;

    const startFrom = parseInt(searchParams.get("startFrom") ?? "0", 10);

    // Project / mic
    const [project, setProject] = useState<CorpusProjectDetailDto | null>(null);
    const [micAvailable, setMicAvailable] = useState(false);
    const [micError, setMicError] = useState<string | null>(null);
    const [micLabel, setMicLabel] = useState<string>("");
    const [loading, setLoading] = useState(true);

    // Blocks
    const [blocks, setBlocks] = useState<RecordingBlockDto[]>([]);
    const blocksRef = useRef<RecordingBlockDto[]>([]);
    const [blocksTotal, setBlocksTotal] = useState(0);
    const blocksTotalRef = useRef(0);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [loadingMoreBlocks, setLoadingMoreBlocks] = useState(false);
    const loadingMoreRef = useRef(false);

    // Resolved microphone deviceId (looked up at runtime by label)
    const [resolvedDeviceId, setResolvedDeviceId] = useState<string | null>(null);

    // Blob buffer — ref for stable closure access, state for re-render trigger
    const blobBufferRef = useRef<Map<string, BufferedRecording>>(new Map());
    const [blobBufferSize, setBlobBufferSize] = useState(0);

    // Transcription draft (per-block); TODO: persist when backend supports it
    const [transcription, setTranscription] = useState("");

    // Keep refs in sync with state
    useEffect(() => { blocksRef.current = blocks; }, [blocks]);
    useEffect(() => { blocksTotalRef.current = blocksTotal; }, [blocksTotal]);
    useEffect(() => { loadingMoreRef.current = loadingMoreBlocks; }, [loadingMoreBlocks]);

    // ── Block fetching ─────────────────────────────────────────────────────────
    const fetchBlocks = useCallback(async (from: number, isLoadMore: boolean) => {
        if (isLoadMore) {
            setLoadingMoreBlocks(true);
            loadingMoreRef.current = true;
        }
        try {
            const resp = await api.get<{ data: RecordingBlockDto[]; total: number }>(
                `/project/${id}/blocks`,
                { params: { from, to: from + BLOCKS_PAGE_SIZE } },
            );
            const { data, total } = resp.data;
            setBlocks(prev => {
                const next = isLoadMore ? [...prev, ...data] : data;
                blocksRef.current = next;
                return next;
            });
            setBlocksTotal(total);
            blocksTotalRef.current = total;
            return total;
        } finally {
            if (isLoadMore) {
                setLoadingMoreBlocks(false);
                loadingMoreRef.current = false;
            }
        }
    }, [id]);

    // ── Initialisation ─────────────────────────────────────────────────────────
    useEffect(() => {
        async function init() {
            try {
                // 1. Fetch project detail for speaker info
                const resp = await api.get<CorpusProjectDetailDto>(`/project/${id}/detail`);
                const proj = resp.data;
                setProject(proj);

                // 2. Microphone availability check
                const savedLabel = proj.speaker.microphoneLabel;
                if (savedLabel) {
                    setMicLabel(savedLabel);
                    try {
                        const mics = await getMicrophones();
                        const savedVidPid = extractVidPid(savedLabel);
                        const matched = mics.find(m => {
                            if (savedVidPid) {
                                const liveVidPid = extractVidPid(m.label);
                                if (liveVidPid === savedVidPid) return true;
                            }
                            return m.label === savedLabel;
                        });
                        if (matched) {
                            setResolvedDeviceId(matched.deviceId);
                            setMicAvailable(true);
                        } else {
                            setMicError(t("record.mic_not_found"));
                        }
                    } catch {
                        setMicError(t("record.mic_permission_denied"));
                    }
                } else {
                    setMicError(t("record.mic_not_configured"));
                }

                // 3. Load initial block page
                await fetchBlocks(startFrom, false);
            } catch {
                showMessage(t("project_page.fetch_error"), Severity.error);
            } finally {
                setLoading(false);
            }
        }
        init();
    }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── onAudioBlob handler ────────────────────────────────────────────────────
    const handleAudioBlob = useCallback((blob: Blob, durationSeconds: number) => {
        setCurrentIdx(prev => {
            const block = blocksRef.current[prev];
            if (block) {
                blobBufferRef.current.set(block.id, {
                    blob,
                    blockId: block.id,
                    blockIndex: block.blockIndex,
                    durationSeconds,
                });
                setBlobBufferSize(blobBufferRef.current.size);
            }
            const next = prev + 1;

            // Load-ahead: fetch more blocks when approaching the end of what's loaded
            const remaining = blocksRef.current.length - next;
            const nextFetchFrom = startFrom + blocksRef.current.length;
            if (
                remaining <= LOAD_AHEAD_THRESHOLD &&
                nextFetchFrom < blocksTotalRef.current &&
                !loadingMoreRef.current
            ) {
                fetchBlocks(nextFetchFrom, true);
            }

            return next;
        });
    }, [fetchBlocks, startFrom]);

    // ── Save handler (stub) ────────────────────────────────────────────────────
    const handleSave = () => {
        console.log("Saving blob buffer:", blobBufferRef.current);
    };

    // ── Render: loading ────────────────────────────────────────────────────────
    if (loading) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 12 }}>
                <CircularProgress />
            </Box>
        );
    }

    // ── Render: startFrom out of range ─────────────────────────────────────────
    if (blocksTotal > 0 && startFrom >= blocksTotal) {
        return (
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, mt: 12 }}>
                <WarningAmberIcon sx={{ fontSize: 48, color: "error.main" }} />
                <Typography sx={{ fontFamily: BODY, fontWeight: 600, color: "error.main" }}>
                    {t("record.start_from_out_of_range")}
                </Typography>
            </Box>
        );
    }

    // ── Render: microphone error ───────────────────────────────────────────────
    if (micError) {
        return (
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, mt: 12 }}>
                <WarningAmberIcon sx={{ fontSize: 48, color: "warning.main" }} />
                <Typography sx={{ fontFamily: BODY, fontWeight: 600, color: COLOR.onSurface, textAlign: "center", maxWidth: 400 }}>
                    {micError}
                </Typography>
            </Box>
        );
    }

    // ── Render: main UI ────────────────────────────────────────────────────────
    const currentBlock = blocks[currentIdx] ?? null;
    const isSessionDone = currentIdx >= blocks.length && blocks.length > 0;
    const totalInSession = Math.max(0, blocksTotal - startFrom);
    const currentCountLabel = `${String(Math.min(currentIdx + 1, totalInSession)).padStart(2, "0")} / ${String(totalInSession).padStart(2, "0")}`;
    const promptText =
        isSessionDone
            ? t("record.all_blocks_done")
            : currentBlock?.text
                ? `“${currentBlock.text}”`
                : currentBlock
                    ? `${t("record.block")} #${currentBlock.blockIndex + 1}`
                    : t("record.loading");

    const bufferedRecordings = blobBufferRef.current;
    void blobBufferSize; // keep state hook to trigger re-render when buffer changes

    return (
        <Box sx={{ position: "relative", height: "calc(100vh - 96px)", display: "flex", flexDirection: "column", bgcolor: COLOR.surface, overflow: "hidden" }}>

            {/* 3-6-3 grid */}
            <Box
                sx={{
                    flex: 1,
                    display: "grid",
                    gridTemplateColumns: "3fr 6fr 3fr",
                    gap: 0,
                    overflow: "hidden",
                    pb: 18, // leave room for the floating recorder
                }}
            >
                {/* ── Left column: status badge ───────────────────────────── */}
                <Box sx={{ p: 4, display: "flex", flexDirection: "column", gap: 4 }}>
                    <StatusPill label={t("record.status_recording")} />
                </Box>

                {/* ── Middle column: prompt + blocks ───────────────────────── */}
                <Box sx={{ px: 8, py: 6, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
                    {/* Header row */}
                    <Box>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
                            <Typography
                                sx={{
                                    fontFamily: LABEL,
                                    fontSize: 11,
                                    fontWeight: 500,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.15em",
                                    color: `${COLOR.onSurfaceVariant}80`,
                                    flexShrink: 0,
                                }}
                            >
                                {t("record.current_prompt")}
                            </Typography>
                            <Box sx={{ flex: 1, height: "1px", bgcolor: `${COLOR.outlineVariant}55` }} />
                            <Typography
                                sx={{
                                    fontFamily: LABEL,
                                    fontSize: 11,
                                    fontWeight: 700,
                                    color: COLOR.onSurfaceVariant,
                                    flexShrink: 0,
                                }}
                            >
                                {currentCountLabel}
                            </Typography>
                        </Box>

                        {/* Current block prominent prompt */}
                        <Typography
                            sx={{
                                fontFamily: HEADLINE,
                                fontWeight: 700,
                                fontSize: { xs: "2rem", md: "2.75rem" },
                                lineHeight: 1.1,
                                color: COLOR.onSurface,
                                letterSpacing: "-0.025em",
                                maxWidth: "48rem",
                            }}
                        >
                            {promptText}
                        </Typography>
                    </Box>

                    {/* Surrounding blocks */}
                    {!isSessionDone && (
                        <SurroundingBlocks
                            blocks={blocks}
                            currentIdx={currentIdx}
                            bufferedRecordings={bufferedRecordings}
                            t={t}
                        />
                    )}

                    {loadingMoreBlocks && (
                        <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                            <CircularProgress size={20} />
                        </Box>
                    )}
                </Box>

                {/* ── Right column: session details + transcription ─────────── */}
                <Box
                    sx={{
                        p: 6,
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                        bgcolor: COLOR.surfaceContainerLow,
                        borderLeft: `1px solid ${COLOR.outlineVariant}1A`,
                        overflowY: "auto",
                    }}
                >
                    {/* Session details card */}
                    <Box
                        sx={{
                            bgcolor: COLOR.surfaceContainerHighest,
                            p: 3,
                            borderRadius: 2,
                            display: "flex",
                            flexDirection: "column",
                            gap: 2,
                        }}
                    >
                        <Typography
                            sx={{
                                fontFamily: HEADLINE,
                                fontSize: 11,
                                fontWeight: 700,
                                textTransform: "uppercase",
                                color: `${COLOR.onSurfaceVariant}B3`,
                            }}
                        >
                            {t("record.session_details")}
                        </Typography>
                        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                            <Box>
                                <Typography sx={{ fontFamily: LABEL, fontSize: 10, textTransform: "uppercase", color: `${COLOR.onSurfaceVariant}99` }}>
                                    {t("record.sample_rate")}
                                </Typography>
                                <Typography sx={{ fontFamily: HEADLINE, fontWeight: 700, fontSize: 13 }}>
                                    {project?.samplingRate ? `${(project.samplingRate / 1000).toFixed(1)} kHz` : "—"}
                                </Typography>
                            </Box>
                            <Box>
                                <Typography sx={{ fontFamily: LABEL, fontSize: 10, textTransform: "uppercase", color: `${COLOR.onSurfaceVariant}99` }}>
                                    {t("record.bit_depth")}
                                </Typography>
                                {/* TODO: load bit depth from project settings once configurable */}
                                <Typography sx={{ fontFamily: HEADLINE, fontWeight: 700, fontSize: 13 }}>
                                    16-bit PCM
                                </Typography>
                            </Box>
                            <Box>
                                <Typography sx={{ fontFamily: LABEL, fontSize: 10, textTransform: "uppercase", color: `${COLOR.onSurfaceVariant}99` }}>
                                    {t("record.file_type")}
                                </Typography>
                                {/* TODO: load file type from project settings once configurable */}
                                <Typography sx={{ fontFamily: HEADLINE, fontWeight: 700, fontSize: 13 }}>
                                    WAV
                                </Typography>
                            </Box>
                            <Box sx={{ minWidth: 0 }}>
                                <Typography sx={{ fontFamily: LABEL, fontSize: 10, textTransform: "uppercase", color: `${COLOR.onSurfaceVariant}99` }}>
                                    {t("record.source")}
                                </Typography>
                                <Typography
                                    sx={{
                                        fontFamily: HEADLINE,
                                        fontWeight: 700,
                                        fontSize: 13,
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                    }}
                                    title={micLabel || "—"}
                                >
                                    {micLabel || "—"}
                                </Typography>
                            </Box>
                        </Box>
                    </Box>

                    {/* Transcription card */}
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                        <Typography
                            sx={{
                                fontFamily: HEADLINE,
                                fontSize: 11,
                                fontWeight: 700,
                                textTransform: "uppercase",
                                color: `${COLOR.onSurfaceVariant}B3`,
                            }}
                        >
                            {t("record.transcription")}
                        </Typography>
                        <Box
                            component="textarea"
                            value={transcription}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setTranscription(e.target.value)}
                            placeholder={t("record.transcription_placeholder")}
                            sx={{
                                width: "100%",
                                minHeight: 96,
                                p: 2,
                                bgcolor: COLOR.surface,
                                borderRadius: 1,
                                border: "none",
                                outline: "none",
                                resize: "vertical",
                                fontFamily: BODY,
                                fontSize: 14,
                                fontStyle: "italic",
                                color: `${COLOR.onSurfaceVariant}CC`,
                                lineHeight: 1.6,
                                "&::placeholder": {
                                    color: `${COLOR.onSurfaceVariant}99`,
                                    fontStyle: "italic",
                                },
                            }}
                        />
                    </Box>
                </Box>
            </Box>

            {/* ── Floating recorder (re-uses Recorder component) ─────────── */}
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
                    {!isSessionDone && micAvailable && resolvedDeviceId && (
                        <Recorder
                            deviceId={resolvedDeviceId}
                            onAudioBlob={handleAudioBlob}
                            sampleRate={project?.samplingRate}
                            bitDepth={16}
                        />
                    )}

                    {/* Save action / status row */}
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
                                {blobBufferSize} {t("record.recordings_unsaved")}
                            </Typography>
                        </Box>

                        <Button
                            variant="contained"
                            startIcon={<SaveIcon sx={{ fontSize: "0.85rem !important" }} />}
                            onClick={handleSave}
                            disabled={blobBufferSize === 0}
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
                            {t("record.save")}{blobBufferSize > 0 ? ` (${blobBufferSize})` : ""}
                        </Button>
                    </Box>
                </Paper>
            </Box>
        </Box>
    );
}

// Suspense wrapper required for useSearchParams in App Router
export default function CorpusRecord() {
    return (
        <Suspense fallback={
            <Box sx={{ display: "flex", justifyContent: "center", mt: 12 }}>
                <CircularProgress />
            </Box>
        }>
            <CorpusRecordInner />
        </Suspense>
    );
}
