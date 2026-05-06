"use client";
//TODO: add edit project functionality
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Accordion, AccordionDetails, AccordionSummary,
    Alert, Box, Button, Chip, CircularProgress,
    Grid, Paper, Snackbar, Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import api from "@/app/axios";
import { ProjectDto } from "@/app/components/types/project.dto";
import { BODY, HEADLINE, LABEL, ORANGE } from "@/app/components/style-constants";
import SectionHeader from "./components/section-header";
import BlockCard from "./components/block-card";
import FiberManualRecord from "@mui/icons-material/FiberManualRecord";



export interface BlockDto {
    id: string;
    blockIndex: number;
    isRecorded: boolean;
}



function InfoField({ label, value }: { label: string; value?: string | number | null }) {
    return (
        <Box>
            <Typography sx={{ fontFamily: LABEL, fontWeight: 700, fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "#94a3b8", mb: 0.5 }}>
                {label}
            </Typography>
            <Typography sx={{ fontFamily: BODY, fontSize: "0.925rem", fontWeight: 500, color: "#0f172a" }}>
                {value ?? "—"}
            </Typography>
        </Box>
    );
}

export default function ProjectDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const { t } = useTranslation("common");

    const BLOCKS_PAGE_SIZE = 50;

    const [project, setProject] = useState<ProjectDto | null>(null);
    const [blocks, setBlocks] = useState<BlockDto[]>([]);
    const [blocksTotal, setBlocksTotal] = useState(0);
    const [blocksInitialized, setBlocksInitialized] = useState(false);
    const [loading, setLoading] = useState(true);
    const [blocksLoading, setBlocksLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        api.get<ProjectDto>(`/project/${id}`)
            .then(r => setProject(r.data))
            .catch(() => setError(t("project_detail.error_load")))
            .finally(() => setLoading(false));
    }, [id]);

    const fetchBlocks = async (from: number, isLoadMore: boolean = false) => {
        isLoadMore ? setLoadingMore(true) : setBlocksLoading(true);
        try {
            const r = await api.get<{ data: BlockDto[]; total: number }>(`/project/${id}/blocks`, {
                params: { from, to: from + BLOCKS_PAGE_SIZE },
            });
            setBlocks(prev => [...prev, ...r.data.data]);
            setBlocksTotal(r.data.total);
        } catch {
            setError(t("project_detail.error_load_blocks"));
        } finally {
            isLoadMore ? setLoadingMore(false) : setBlocksLoading(false);
        }
    };

    const handleBlocksToggle = async (_: React.SyntheticEvent, expanded: boolean) => {
        if (expanded && !blocksInitialized) {
            setBlocksInitialized(true);
            await fetchBlocks(0);
        }
    };

    const handleLoadMore = () => fetchBlocks(blocks.length, true);

    return (
        <Box sx={{ p: { xs: 3, md: 5 }, maxWidth: 1200, mx: "auto" }}>
            <Typography sx={{ fontFamily: HEADLINE, fontWeight: 700, fontSize: "1.5rem", color: "#0f172a", letterSpacing: "-0.02em", mb: 4 }}>
                {t("project_detail.title")}
            </Typography>

            {loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
                    <CircularProgress />
                </Box>
            ) : project && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>

                    {/* Paper 1: Basic Info */}
                    <Paper elevation={0} sx={{ border: "1px solid #e2e8f0", borderRadius: 3, p: 3 }}>
                        <SectionHeader label={t("project_detail.basic_info")} />
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
                            <InfoField label={t("project_detail.project_title")} value={project.name} />
                            <InfoField label={t("project_detail.description")} value={project.description} />
                            <Grid container spacing={2.5}>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <InfoField label={t("project_detail.corpus_name")} value={project.corpusName} />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <InfoField label={t("project_detail.language")} value={t(`language.${project.language}`)} />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <InfoField label={t("project_detail.speaker_count")} value={project.speakerCount} />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <InfoField
                                        label={t("project_detail.updated_at")}
                                        value={project.updatedAt ? new Date(project.updatedAt).toLocaleDateString() : undefined}
                                    />
                                </Grid>
                            </Grid>
                        </Box>
                    </Paper>

                    {/* Paper 2: Technical Info */}
                    <Paper elevation={0} sx={{ border: "1px solid #e2e8f0", borderRadius: 3, p: 3 }}>
                        <SectionHeader label={t("project_detail.technical_info")} />
                        <Grid container spacing={2.5}>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <InfoField
                                    label={t("project_detail.sampling_rate")}
                                    value={project.samplingRate ? `${project.samplingRate} Hz` : undefined}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <InfoField label={t("project_detail.type")} value={t(`project_types.${project.type}`)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <InfoField
                                    label={t("project_detail.created_at")}
                                    value={new Date(project.createdAt).toLocaleDateString()}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <InfoField
                                    label={t("project_detail.progress")}
                                    value={`${project.corpusProgress ?? 0}%`}
                                />
                            </Grid>
                        </Grid>
                    </Paper>

                    {/* Blocks accordion — lazy loaded on first expand */}
                    <Accordion
                        elevation={0}
                        onChange={handleBlocksToggle}
                        sx={{
                            border: "1px solid #e2e8f0",
                            borderRadius: "12px !important",
                            "&:before": { display: "none" },
                        }}
                    >
                        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 3, py: 1.5 }}>
                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                                    <Box sx={{ width: 4, height: 20, bgcolor: ORANGE, borderRadius: "2px" }} />
                                    <Typography sx={{ fontFamily: LABEL, fontWeight: 700, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.15em", color: "#475569" }}>
                                        {t("project_detail.blocks")}
                                    </Typography>
                                </Box>
                                <Box sx={{mx: 2}}>
                                    <Button
                                    component="div"         // renders as <div> instead of <button>
                                        role="button"
                                        size="small"
                                        variant="contained"
                                        startIcon={<FiberManualRecord sx={{ fontSize: "0.8rem !important" }} />}
                                        sx={{
                                            mt: "auto",
                                            bgcolor: "#191c1d",
                                            borderRadius: 1.5,
                                            textTransform: "none",
                                            fontFamily: LABEL,
                                            fontWeight: 700,
                                            fontSize: "0.72rem",
                                            "&:hover": { bgcolor: "#0f172a" },
                                        }}
                                        onClick={(e) => {
                                            e.stopPropagation(); // prevent accordion toggle
                                            router.push(`/projects/${project.id}/record`);
                                        }}
                                    >
                                        {t("project_detail.start_recording")}
                                    </Button>
                                </Box>
                            </Box>
                        </AccordionSummary>
                        <AccordionDetails sx={{ px: 3, pb: 3 }}>
                            {blocksLoading ? (
                                <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                                    <CircularProgress size={32} />
                                </Box>
                            ) : (
                                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                    <Grid container spacing={2}>
                                        {blocks.map(block => (
                                            <Grid key={block.id} size={{ xs: 12, sm: 4 }}>
                                                <BlockCard block={block} projectId={id} />
                                            </Grid>
                                        ))}
                                    </Grid>
                                    {blocks.length < blocksTotal && (
                                        <Box sx={{ display: "flex", justifyContent: "center", pt: 1 }}>
                                            <Button
                                                variant="outlined"
                                                onClick={handleLoadMore}
                                                disabled={loadingMore}
                                                startIcon={loadingMore ? <CircularProgress size={14} /> : undefined}
                                                sx={{ borderColor: "#e2e8f0", color: "#475569", fontFamily: LABEL, fontWeight: 700, fontSize: "0.72rem", textTransform: "none", borderRadius: 2 }}
                                            >
                                                {t("project_detail.load_more")} ({blocks.length} / {blocksTotal})
                                            </Button>
                                        </Box>
                                    )}
                                </Box>
                            )}
                        </AccordionDetails>
                    </Accordion>

                </Box>
            )}

            <Snackbar
                open={!!error}
                autoHideDuration={4000}
                onClose={() => setError(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert severity="error" onClose={() => setError(null)} sx={{ fontFamily: BODY }}>
                    {error}
                </Alert>
            </Snackbar>
        </Box>
    );
}
