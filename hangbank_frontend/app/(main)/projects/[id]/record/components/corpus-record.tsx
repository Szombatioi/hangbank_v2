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
const UPCOMING_PREVIEW = 6; // keep in sync with SurroundingBlocks' UPCOMING_COUNT

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
    const currentIdxRef = useRef(0);
    const [loadingMoreBlocks, setLoadingMoreBlocks] = useState(false);
    const loadingMoreRef = useRef(false);

    // Resolved microphone deviceId (looked up at runtime by label)
    const [resolvedDeviceId, setResolvedDeviceId] = useState<string | null>(null);

    // Blob buffer — ref for stable closure access, state for re-render trigger
    const blobBufferRef = useRef<Map<string, BufferedRecording>>(new Map());
    const [blobBufferSize, setBlobBufferSize] = useState(0);

    // Transcription draft (per-block); TODO: persist when backend supports it
    const [transcription, setTranscription] = useState("");
    const transcriptionRef = useRef(""); // latest value for stable access in callbacks

    const [saving, setSaving] = useState(false);

    useEffect(() => { blocksRef.current = blocks; }, [blocks]);
    useEffect(() => { blocksTotalRef.current = blocksTotal; }, [blocksTotal]);
    useEffect(() => { loadingMoreRef.current = loadingMoreBlocks; }, [loadingMoreBlocks]);
    useEffect(() => { transcriptionRef.current = transcription; }, [transcription]);
    useEffect(() => { currentIdxRef.current = currentIdx; }, [currentIdx]);

    // Edit the active block's transcription. If a buffered (unsaved) take exists for
    // this block, update its transcription too — otherwise the edit is lost and the
    // text captured at record time is what gets uploaded on save.
    const handleTranscriptionChange = useCallback((value: string) => {
        setTranscription(value);
        const block = blocksRef.current[currentIdxRef.current];
        const buffered = block ? blobBufferRef.current.get(block.id) : undefined;
        if (buffered) {
            buffered.transcription = value;
        }
    }, []);

    // Load the active block's transcription whenever it changes (navigation, auto-advance,
    // or first load): prefer a buffered (unsaved) take's transcription, then the saved
    // recording's, else empty. Keyed on the block id so it never fires mid-recording
    // (same block) and won't be clobbered by load-ahead appends.
    useEffect(() => {
        const block = blocksRef.current[currentIdx];
        const buffered = block ? blobBufferRef.current.get(block.id) : undefined;
        setTranscription(buffered?.transcription ?? block?.audioFile?.transcription ?? "");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentIdx, blocks[currentIdx]?.id]);

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

    // Load-ahead: fetch the next page when we're within LOAD_AHEAD_THRESHOLD of the
    // last loaded block. Safe to call on every navigation/record — it no-ops when a
    // fetch is already in flight or everything is loaded.
    const maybeLoadAhead = useCallback((targetIdx: number) => {
        const remaining = blocksRef.current.length - targetIdx;
        const nextFetchFrom = startFrom + blocksRef.current.length;
        if (
            remaining <= LOAD_AHEAD_THRESHOLD &&
            nextFetchFrom < blocksTotalRef.current &&
            !loadingMoreRef.current
        ) {
            fetchBlocks(nextFetchFrom, true);
        }
    }, [fetchBlocks, startFrom]);

    const handleAudioBlob = useCallback((blob: Blob, durationSeconds: number) => {
        setCurrentIdx(prev => {
            const block = blocksRef.current[prev];
            if (block) {
                blobBufferRef.current.set(block.id, {
                    blob,
                    blockId: block.id,
                    blockIndex: block.blockIndex,
                    durationSeconds,
                    transcription: transcriptionRef.current,
                });
                setBlobBufferSize(blobBufferRef.current.size);
            }
            const next = prev + 1;
            // Also pre-fetch the upcoming-blocks preview so it's never empty
            maybeLoadAhead(next + UPCOMING_PREVIEW);
            return next;
        });
    }, [maybeLoadAhead]);

    // Move one block back/forward; fetch more blocks when nearing the loaded edge.
    // (Prev never needs a fetch — pagination only runs forward from startFrom.)
    const handlePrev = useCallback(() => {
        setCurrentIdx(prev => Math.max(0, prev - 1));
    }, []);

    const handleNext = useCallback(() => {
        setCurrentIdx(prev => {
            const totalInSession = blocksTotalRef.current - startFrom;
            const next = prev + 1;
            if (next >= totalInSession) return prev; // already at the last block

            // Keep enough loaded ahead to cover navigation + the upcoming-blocks preview
            maybeLoadAhead(next + UPCOMING_PREVIEW);
            return next;
        });
    }, [maybeLoadAhead, startFrom]);

    const handleSave = async () => {
        const recordings = Array.from(blobBufferRef.current.values());
        if (recordings.length === 0 || saving) return;

        const form = new FormData();
        const meta = recordings.map(r => ({
            blockId: r.blockId,
            blockIndex: r.blockIndex,
            durationSeconds: r.durationSeconds,
            transcription: r.transcription
        }));
        for (const r of recordings) {
            form.append("audio", r.blob, `${r.blockId}.wav`);
        }
        form.append("meta", JSON.stringify(meta));

        setSaving(true);
        try {
            const resp = await api.post<{
                saved: number;
                results: { blockId: string; audioFile: { id: string; s3Link: string; transcription: string } }[];
            }>(`/project/${id}/recordings`, form, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            // Only clear the records we just uploaded — any take captured during
            // the in-flight request stays in the buffer for the next save.
            for (const r of recordings) blobBufferRef.current.delete(r.blockId);
            setBlobBufferSize(blobBufferRef.current.size);

            // Update each saved block with its newly created audio file, so going
            // back to it loads the new recording (not the now-deleted old one).
            const savedById = new Map(resp.data.results.map(r => [r.blockId, r.audioFile]));
            setBlocks(prev => {
                const next = prev.map(b =>
                    savedById.has(b.id)
                        ? { ...b, isRecorded: true, audioFile: savedById.get(b.id) }
                        : b,
                );
                blocksRef.current = next;
                return next;
            });

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

    // Load the current block's existing recording (if any) into the recorder
    const recordedAudio = currentBlock?.audioFile ?? null;
    const canPrev = currentIdx > 0;
    const canNext = currentIdx < totalInSession - 1;

    return (
        <Box sx={{ position: "relative", height: "calc(100vh - 96px)", display: "flex", flexDirection: "column", bgcolor: COLOR.surface, overflow: "hidden" }}>
            <Box
                sx={{
                    flex: 1,
                    display: "grid",
                    gridTemplateColumns: "1fr 8fr 3fr",
                    overflow: "hidden",
                    pb: 18, // leave room for the floating recorder
                }}
            >
                <Box sx={{ p: 4, display: "flex", flexDirection: "column", gap: 4 }}>
                    <StatusPill label={t("record.status_recording")} />
                </Box>

                <Box sx={{ px: 8, py: 6, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
                    <PromptHeader
                        countLabel={currentCountLabel}
                        promptText={promptText}
                        isRecorded={!isSessionDone && !!currentBlock?.isRecorded}
                        isBuffered={!isSessionDone && !!currentBlock && bufferedRecordings.has(currentBlock.id)}
                    />

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
                    onTranscriptionChange={handleTranscriptionChange}
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
                recordedAudio={recordedAudio}
                recorderKey={currentBlock?.id}
                onPrev={handlePrev}
                onNext={handleNext}
                canPrev={canPrev}
                canNext={canNext}
                onTranscript={setTranscription}
                transcriptionLang={project?.languageCode}
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
