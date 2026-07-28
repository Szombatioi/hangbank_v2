"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
    Box, Button, Chip, CircularProgress, Paper, Typography,
} from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { AxiosError } from "axios";
import api from "@/app/axios";
import { CorpusDto } from "@/app/components/types/corpus.dto";
import { BODY, HEADLINE, LABEL, ORANGE } from "@/app/components/style-constants";

const PAGE_SIZE = 30;

function visibilityChipStyle(v: string) {
    if (v === "public") return { bgcolor: "var(--app-success-bg)", color: "var(--app-success-fg)" };
    if (v === "private") return { bgcolor: "var(--app-warn-bg)", color: "var(--app-warn-fg)" };
    return { bgcolor: "var(--app-border)", color: "var(--app-text-secondary)" };
}

export default function ViewCorpusPage() {
    const { t } = useTranslation("common");
    const id = useParams().id as string;

    const [corpus, setCorpus] = useState<CorpusDto | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [blocks, setBlocks] = useState<string[]>([]);
    const [loadingMore, setLoadingMore] = useState(false);

    const total = corpus?.blockCount ?? 0;

    // Appends the next page — only used by the "Load more" button.
    const fetchMore = async () => {
        setLoadingMore(true);
        try {
            const resp = await api.get<string[]>(`/corpus/${id}/blocks`, {
                params: { from: blocks.length, to: blocks.length + PAGE_SIZE },
            });
            setBlocks(prev => [...prev, ...resp.data]);
        } catch {
            setError(t("corpus_view.error_load_blocks"));
        } finally {
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        // `ignore` guards against React StrictMode's double-mount (and stale
        // requests after the id changes) so the first page is set once, not appended twice.
        let ignore = false;
        async function init() {
            try {
                const [corpusResp, blocksResp] = await Promise.all([
                    api.get<CorpusDto>(`/corpus/${id}`),
                    api.get<string[]>(`/corpus/${id}/blocks`, {
                        params: { from: 0, to: PAGE_SIZE },
                    }),
                ]);
                if (ignore) return;
                setCorpus(corpusResp.data);
                setBlocks(blocksResp.data); // replace — this is the initial page
            } catch (err) {
                if (ignore) return;
                const status = (err as AxiosError).response?.status;
                if (status === 404) setError(t("corpus_view.not_found"));
                else if (status === 403) setError(t("corpus_view.access_denied"));
                else setError(t("corpus_view.error_load"));
            } finally {
                if (!ignore) setLoading(false);
            }
        }
        init();
        return () => { ignore = true; };
    }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

    if (loading) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 12 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error || !corpus) {
        return (
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, mt: 12 }}>
                <WarningAmberIcon sx={{ fontSize: 48, color: "warning.main" }} />
                <Typography sx={{ fontFamily: BODY, fontWeight: 600, color: "var(--app-text-primary)", textAlign: "center", maxWidth: 420 }}>
                    {error ?? t("corpus_view.error_load")}
                </Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ p: { xs: 3, md: 5 }, maxWidth: 900, mx: "auto" }}>

            {/* Header */}
            <Box sx={{ mb: 4 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
                    <Chip
                        label={t(`library_page.visibility.${corpus.visibility}`)}
                        size="small"
                        sx={{ ...visibilityChipStyle(corpus.visibility), fontFamily: LABEL, fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em" }}
                    />
                    <Chip
                        label={t(`language.${corpus.language.name}`)}
                        size="small"
                        sx={{ bgcolor: "var(--app-surface-muted)", color: "var(--app-text-secondary)", fontFamily: LABEL, fontSize: "0.6rem", fontWeight: 700 }}
                    />
                    {corpus.domain && (
                        <Chip
                            label={corpus.domain.name}
                            size="small"
                            sx={{ bgcolor: "var(--app-surface-muted)", color: "var(--app-text-secondary)", fontFamily: LABEL, fontSize: "0.6rem", fontWeight: 700 }}
                        />
                    )}
                </Box>
                <Typography sx={{ fontFamily: HEADLINE, fontWeight: 700, fontSize: { xs: "1.75rem", md: "2.25rem" }, letterSpacing: "-0.03em", color: "var(--app-text-primary)" }}>
                    {corpus.name}
                </Typography>
                <Typography sx={{ fontFamily: LABEL, fontSize: "0.8rem", fontWeight: 600, color: "var(--app-text-faint)", mt: 0.5 }}>
                    {t("corpus_view.block_count", { count: total })}
                </Typography>
            </Box>

            {/* Blocks list */}
            <Paper elevation={0} sx={{ border: "1px solid var(--app-border)", borderRadius: 3, overflow: "hidden" }}>
                {blocks.map((text, i) => (
                    <Box
                        key={i}
                        sx={{
                            display: "flex", gap: 2, px: 3, py: 1.75,
                            borderBottom: i < blocks.length - 1 ? "1px solid var(--app-surface-muted)" : "none",
                            "&:hover": { bgcolor: "var(--app-surface-subtle)" },
                        }}
                    >
                        <Typography sx={{ fontFamily: LABEL, fontWeight: 700, fontSize: "0.75rem", color: ORANGE, flexShrink: 0, minWidth: 64, pt: 0.25 }}>
                            {i + 1} / {total}
                        </Typography>
                        <Typography sx={{ fontFamily: BODY, fontSize: "0.95rem", lineHeight: 1.6, color: "var(--app-text-body)" }}>
                            {text}
                        </Typography>
                    </Box>
                ))}
            </Paper>

            {/* Load more */}
            {blocks.length < total && (
                <Box sx={{ display: "flex", justifyContent: "center", pt: 3 }}>
                    <Button
                        variant="outlined"
                        onClick={fetchMore}
                        disabled={loadingMore}
                        startIcon={loadingMore ? <CircularProgress size={14} /> : undefined}
                        sx={{ borderColor: "var(--app-border)", color: "var(--app-text-secondary)", fontFamily: LABEL, fontWeight: 700, fontSize: "0.72rem", textTransform: "none", borderRadius: 2, px: 3 }}
                    >
                        {t("corpus_view.load_more")} ({blocks.length} / {total})
                    </Button>
                </Box>
            )}
        </Box>
    );
}
