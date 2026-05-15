"use client";
{/* TODO: redesign!
  Current Prompt -------------- 04/12     <RECORDING badge>
  <Actual text to read>
  
  <Text blocks>
      <Time>   <Badge if recorded/buffered><Text>
      <Time>   <Badge if recorded/buffered><Text>
      <LIVE>   <wrap><Text></wrap>
  </Text blocks>

  <Recording block> (waverform, button, next-prev buttons)



  ON SIDE:
  Session details (samplerate, bit depth (ADD TODO comment to load this once we allow this setting), file type, etc)

  Transcription (SAVE THIS TOO!)
  */}
import { useCallback, useEffect, useRef, useState, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
    Box, Button, Chip, CircularProgress,
    Grid, Paper, Typography,
} from "@mui/material";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import SaveIcon from "@mui/icons-material/Save";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import api from "@/app/axios";
import Recorder from "@/app/components/recorder";
import { getMicrophones } from "@/app/components/helpers/get-mics";
import { useSnackbar, Severity } from "@/app/contexts/SnackbarProvider";
import { CorpusProjectDetailDto } from "./corpus-project-details";
import { BODY, LABEL, ORANGE } from "@/app/components/style-constants";

// ── Helpers ────────────────────────────────────────────────────────────────────
/** Extracts the USB VID:PID from a browser device label, e.g. "(0d8c:0134)". */
function extractVidPid(label: string): string | null {
    const match = label.match(/\(([0-9a-f]{4}:[0-9a-f]{4})\)$/i);
    return match ? match[1] : null;
}

// ── Constants ──────────────────────────────────────────────────────────────────
const BLOCKS_PAGE_SIZE = 20;
const LOAD_AHEAD_THRESHOLD = 5;

// ── Types ──────────────────────────────────────────────────────────────────────
interface RecordingBlockDto {
    id: string;
    blockIndex: number;
    isRecorded: boolean;
    text?: string; // populated when backend provides corpus text per block
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
    const blobBufferRef = useRef<Map<string, Blob>>(new Map());
    const [blobBufferSize, setBlobBufferSize] = useState(0);

    // Auto-scroll sidebar to current block
    const currentBlockRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        currentBlockRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, [currentIdx]);

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
                debugger;
                // 2. Microphone availability check
                // Primary:  match by VID:PID extracted from the OS label (survives port changes, reboots)
                // Fallback: exact label match (for macOS which omits VID:PID from labels)
                const savedLabel = proj.speaker.microphoneLabel;
                if (savedLabel) {
                    try {
                        const mics = await getMicrophones(); // also requests mic permission
                        const savedVidPid = extractVidPid(savedLabel);
                        const matched = mics.find(m => {
                            if (savedVidPid) {
                                const liveVidPid = extractVidPid(m.label);
                                if (liveVidPid === savedVidPid) return true;
                            }
                            return m.label === savedLabel;
                        });
                        if (matched) {
                            setResolvedDeviceId(matched.deviceId); // live deviceId for Recorder
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
    const handleAudioBlob = useCallback((blob: Blob) => {
        setCurrentIdx(prev => {
            const block = blocksRef.current[prev];
            if (block) {
                blobBufferRef.current.set(block.id, blob);
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
                <Typography sx={{ fontFamily: BODY, fontWeight: 600, color: "#0f172a", textAlign: "center", maxWidth: 400 }}>
                    {micError}
                </Typography>
            </Box>
        );
    }

    // ── Render: main UI ────────────────────────────────────────────────────────
    const currentBlock = blocks[currentIdx] ?? null;
    const isSessionDone = currentIdx >= blocks.length && blocks.length > 0;

    return (
        <Box sx={{ pb: 12, pt: 4, px: { xs: 2, md: 5 }, maxWidth: 1400, mx: "auto" }}>
            <Grid container spacing={3}>

                {/* ── Main recording area (8 cols) ──────────────────────────── */}
                <Grid size={{ xs: 12, md: 8 }}>
                    <Paper elevation={0} sx={{ border: "1px solid #e2e8f0", borderRadius: 3, p: 4 }}>

                        {/* Block label + progress chip */}
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                                <Box sx={{ width: 4, height: 20, bgcolor: ORANGE, borderRadius: "2px" }} />
                                <Typography sx={{ fontFamily: LABEL, fontWeight: 700, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.15em", color: "#475569" }}>
                                    {isSessionDone
                                        ? t("record.session_complete")
                                        : currentBlock
                                            ? `${t("record.block")} #${currentBlock.blockIndex + 1}`
                                            : t("record.loading")
                                    }
                                </Typography>
                            </Box>
                            <Chip
                                label={`${Math.min(currentIdx, blocks.length)} / ${blocksTotal - startFrom}`}
                                size="small"
                                sx={{ fontFamily: LABEL, fontSize: "0.65rem", fontWeight: 700, bgcolor: "#f1f5f9", color: "#475569" }}
                            />
                        </Box>

                        {/* Corpus text display */}
                        <Box sx={{
                            mb: 4, p: 3, bgcolor: "#f8fafc", borderRadius: 2, minHeight: 140,
                            display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                            {isSessionDone ? (
                                <Typography sx={{ fontFamily: BODY, fontSize: "1rem", color: "#64748b", textAlign: "center" }}>
                                    {t("record.all_blocks_done")}
                                </Typography>
                            ) : currentBlock?.text ? (
                                <Typography sx={{ fontFamily: BODY, fontSize: "1.25rem", lineHeight: 1.9, color: "#1e293b", width: "100%" }}>
                                    {currentBlock.text}
                                </Typography>
                            ) : currentBlock ? (
                                <Typography sx={{ fontFamily: LABEL, fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#94a3b8" }}>
                                    {t("record.block")} #{currentBlock.blockIndex + 1}
                                </Typography>
                            ) : null}
                        </Box>

                        {/* Recorder */}
                        {!isSessionDone && micAvailable && resolvedDeviceId && (
                            <Recorder
                                deviceId={resolvedDeviceId}
                                onAudioBlob={handleAudioBlob}
                                sampleRate={project?.samplingRate}
                                bitDepth={32}
                            />
                        )}

                        {/* Keyboard hints */}
                        {!isSessionDone && (
                            <Box sx={{ mt: 2.5, display: "flex", gap: 2.5, justifyContent: "center", flexWrap: "wrap" }}>
                                {[
                                    { key: "Space", label: t("record.hint_space") },
                                    { key: "Esc / Enter", label: t("record.hint_escape") },
                                ].map(({ key, label }) => (
                                    <Box key={key} sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                                        <Chip
                                            label={key}
                                            size="small"
                                            sx={{ fontFamily: LABEL, fontWeight: 700, fontSize: "0.6rem", bgcolor: "#e2e8f0", color: "#475569", borderRadius: 1 }}
                                        />
                                        <Typography sx={{ fontFamily: LABEL, fontSize: "0.65rem", color: "#94a3b8" }}>
                                            {label}
                                        </Typography>
                                    </Box>
                                ))}
                            </Box>
                        )}
                    </Paper>
                </Grid>

                {/* ── Sidebar block list (4 cols) ────────────────────────────── */}
                <Grid size={{ xs: 12, md: 4 }}>
                    <Paper elevation={0} sx={{
                        border: "1px solid #e2e8f0", borderRadius: 3, p: 2,
                        height: 500, display: "flex", flexDirection: "column",
                    }}>
                        <Typography sx={{
                            fontFamily: LABEL, fontWeight: 700, fontSize: "0.65rem",
                            textTransform: "uppercase", letterSpacing: "0.15em",
                            color: "#94a3b8", px: 1, mb: 1.5,
                        }}>
                            {t("record.blocks")}
                        </Typography>

                        <Box sx={{ flex: 1, overflowY: "auto" }}>
                            {blocks.map((block, idx) => {
                                const isCurrent = idx === currentIdx;
                                const isBuffered = blobBufferRef.current.has(block.id);
                                return (
                                    <Box
                                        key={block.id}
                                        ref={isCurrent ? currentBlockRef : undefined}
                                        sx={{
                                            display: "flex", alignItems: "center", gap: 1.5,
                                            px: 2, py: 1, borderRadius: 2, mb: 0.5,
                                            bgcolor: isCurrent ? "#fff7ed" : "transparent",
                                            border: `1px solid ${isCurrent ? ORANGE : "transparent"}`,
                                            transition: "all 0.15s",
                                        }}
                                    >
                                        {isCurrent && (
                                            <FiberManualRecordIcon sx={{ fontSize: "0.55rem", color: ORANGE, flexShrink: 0 }} />
                                        )}
                                        <Typography sx={{
                                            fontFamily: LABEL, fontWeight: 700, fontSize: "0.72rem",
                                            color: isCurrent ? "#ea580c" : "#475569", flex: 1,
                                        }}>
                                            #{block.blockIndex + 1}
                                        </Typography>
                                        <Chip
                                            label={
                                                isBuffered
                                                    ? t("record.buffered")
                                                    : block.isRecorded
                                                        ? t("project_detail.recorded")
                                                        : t("project_detail.pending")
                                            }
                                            size="small"
                                            sx={{
                                                height: 16, fontSize: "0.58rem", fontFamily: LABEL, fontWeight: 700,
                                                bgcolor: isBuffered ? "#dcfce7" : block.isRecorded ? "#dbeafe" : "#f1f5f9",
                                                color: isBuffered ? "#15803d" : block.isRecorded ? "#1d4ed8" : "#94a3b8",
                                            }}
                                        />
                                    </Box>
                                );
                            })}

                            {loadingMoreBlocks && (
                                <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                                    <CircularProgress size={20} />
                                </Box>
                            )}
                        </Box>
                    </Paper>
                </Grid>
            </Grid>

            {/* ── Floating footer ────────────────────────────────────────────── */}
            <Paper
                elevation={3}
                sx={{
                    // position: "fixed", bottom: 0, left: 0, right: 0,
                    px: { xs: 3, md: 6 }, py: 1.5,
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    borderTop: "1px solid #e2e8f0", bgcolor: "#fff", zIndex: 1200,
                }}
            >
                <Box>
                    <Typography sx={{ fontFamily: LABEL, fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#94a3b8" }}>
                        {t("record.pending_save_label")}
                    </Typography>
                    <Typography sx={{ fontFamily: BODY, fontSize: "0.875rem", fontWeight: 600, color: "#0f172a" }}>
                        {blobBufferSize} {t("record.recordings_unsaved")}
                    </Typography>
                </Box>

                <Button
                    variant="contained"
                    startIcon={<SaveIcon sx={{ fontSize: "0.85rem !important" }} />}
                    onClick={handleSave}
                    disabled={blobBufferSize === 0}
                    sx={{
                        bgcolor: "#191c1d",
                        borderRadius: 1.5,
                        textTransform: "none",
                        fontFamily: LABEL,
                        fontWeight: 700,
                        fontSize: "0.75rem",
                        px: 2.5,
                        "&:hover": { bgcolor: "#0f172a" },
                        "&.Mui-disabled": { bgcolor: "#e2e8f0", color: "#94a3b8" },
                    }}
                >
                    {t("record.save")}{blobBufferSize > 0 ? ` (${blobBufferSize})` : ""}
                </Button>
            </Paper>
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
