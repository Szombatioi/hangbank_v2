"use client";
//TODO: add prev + next block button
//TODO: add recording length to the recording and display THAT at the beginning of each recorded block
//TODO: always show 5 blocks, even if we are at the beginning - now it shows only 3 blocks
//TODO: make the transcript text box not editable
//TODO: before starting to record, test if the "master audio file" is present, record if not
//TODO: on load, check which is the next unrecorded block and start from there
import { useCallback, useEffect, useRef, useState, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Box, CircularProgress, Typography } from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import api from "@/app/axios";
import { useSnackbar, Severity } from "@/app/providers/SnackbarProvider";
import { BODY } from "@/app/components/style-constants";
import { CorpusProjectDetailDto } from "./corpus-project-details";
import MasterRecordingDialog from "./master-recording-dialog";
import StatusPill from "./status-pill";
import PromptHeader from "./prompt-header";
import SurroundingBlocks from "./surrounding-blocks";
import RightPanel from "./right-panel";
import FloatingRecorderBar from "./floating-recorder-bar";
import { COLOR } from "../helpers/colors";
import { resolveMicrophone } from "../helpers/mic-resolver";
import { BufferedRecording, RecordingBlockDto } from "../helpers/types";

const BLOCKS_PAGE_SIZE = 20;
const LOAD_AHEAD_THRESHOLD = 5;

function CorpusRecordInner() {
    const { t } = useTranslation("common");
    const { showMessage } = useSnackbar();
    const params = useParams();
    const searchParams = useSearchParams();
    const id = params.id as string;

    const startFrom = parseInt(searchParams.get("startFrom") ?? "0", 10);

    const [project, setProject] = useState<CorpusProjectDetailDto | null>(null);
    const [micAvailable, setMicAvailable] = useState(false);
    const [micError, setMicError] = useState<string | null>(null);
    const [micLabel, setMicLabel] = useState<string>("");
    const [loading, setLoading] = useState(true);

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

    const [saving, setSaving] = useState(false);

    useEffect(() => { blocksRef.current = blocks; }, [blocks]);
    useEffect(() => { blocksTotalRef.current = blocksTotal; }, [blocksTotal]);
    useEffect(() => { loadingMoreRef.current = loadingMoreBlocks; }, [loadingMoreBlocks]);

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

    // Re-fetchable detail loader, so we can refresh after the master recording is saved
    const reloadProjectDetail = useCallback(async () => {
        const resp = await api.get<CorpusProjectDetailDto>(`/project/${id}/detail`);
        setProject(resp.data);
        return resp.data;
    }, [id]);

    useEffect(() => {
        async function init() {
            try {
                const proj = await reloadProjectDetail();

                const savedLabel = proj.speaker.microphoneLabel;
                if (savedLabel) {
                    setMicLabel(savedLabel);
                    const { deviceId, error } = await resolveMicrophone(savedLabel);
                    if (deviceId) {
                        setResolvedDeviceId(deviceId);
                        setMicAvailable(true);
                    } else if (error === "permission_denied") {
                        setMicError(t("record.mic_permission_denied"));
                    } else {
                        setMicError(t("record.mic_not_found"));
                    }
                } else {
                    setMicError(t("record.mic_not_configured"));
                }

                await fetchBlocks(startFrom, false);
            } catch {
                showMessage(t("project_page.fetch_error"), Severity.error);
            } finally {
                setLoading(false);
            }
        }
        init();
    }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

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

    const handleSave = async () => {
        const recordings = Array.from(blobBufferRef.current.values());
        if (recordings.length === 0 || saving) return;

        const form = new FormData();
        const meta = recordings.map(r => ({
            blockId: r.blockId,
            blockIndex: r.blockIndex,
            durationSeconds: r.durationSeconds,
        }));
        for (const r of recordings) {
            form.append("audio", r.blob, `${r.blockId}.wav`);
        }
        form.append("meta", JSON.stringify(meta));

        setSaving(true);
        try {
            await api.post(`/project/${id}/recordings`, form, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            // Only clear the records we just uploaded — any take captured during
            // the in-flight request stays in the buffer for the next save.
            for (const r of recordings) blobBufferRef.current.delete(r.blockId);
            setBlobBufferSize(blobBufferRef.current.size);
            showMessage(t("record.save_success"), Severity.success);
            void reloadProjectDetail();
        } catch {
            showMessage(t("record.save_error"), Severity.error);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 12 }}>
                <CircularProgress />
            </Box>
        );
    }

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
            <Box
                sx={{
                    flex: 1,
                    display: "grid",
                    gridTemplateColumns: "3fr 6fr 3fr",
                    overflow: "hidden",
                    pb: 18, // leave room for the floating recorder
                }}
            >
                <Box sx={{ p: 4, display: "flex", flexDirection: "column", gap: 4 }}>
                    <StatusPill label={t("record.status_recording")} />
                </Box>

                <Box sx={{ px: 8, py: 6, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
                    <PromptHeader countLabel={currentCountLabel} promptText={promptText} />

                    {!isSessionDone && (
                        <SurroundingBlocks
                            blocks={blocks}
                            currentIdx={currentIdx}
                            bufferedRecordings={bufferedRecordings}
                        />
                    )}

                    {loadingMoreBlocks && (
                        <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                            <CircularProgress size={20} />
                        </Box>
                    )}
                </Box>

                <RightPanel
                    samplingRate={project?.samplingRate}
                    micLabel={micLabel}
                    transcription={transcription}
                    onTranscriptionChange={setTranscription}
                />
            </Box>

            <FloatingRecorderBar
                showRecorder={!isSessionDone && micAvailable && !!resolvedDeviceId}
                deviceId={resolvedDeviceId ?? ""}
                sampleRate={project?.samplingRate}
                onAudioBlob={handleAudioBlob}
                bufferSize={blobBufferSize}
                saving={saving}
                onSave={handleSave}
            />

            {/* Blocking master-recording gate — only after mic is resolved so the dialog has a deviceId */}
            {micAvailable && resolvedDeviceId && project && !project.masterRecording && (
                <MasterRecordingDialog
                    open
                    projectId={id}
                    deviceId={resolvedDeviceId}
                    sampleRate={project.samplingRate}
                    onSaved={() => { void reloadProjectDetail(); }}
                />
            )}
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
