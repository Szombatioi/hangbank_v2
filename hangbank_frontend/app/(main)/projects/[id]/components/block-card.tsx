"use client";
import { HEADLINE, LABEL } from "@/app/components/style-constants";
import { Paper, Typography, Box, Chip, Button } from "@mui/material";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { BlockDto } from "../page";
import { FiberManualRecord } from "@mui/icons-material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";

export default function BlockCard({ block, projectId }: { block: BlockDto; projectId: string }) {
    const router = useRouter();
    const { t } = useTranslation("common");

    return (
        <Paper
            elevation={0}
            sx={{ border: "1px solid var(--app-border)", borderRadius: 2, p: 2, display: "flex", flexDirection: "column", gap: 1.5, height: "100%" }}
        >
            <Typography
                sx={{ 
                    fontFamily: HEADLINE, 
                    fontWeight: 700, 
                    fontSize: "0.9rem", 
                    color: "var(--app-text-primary)", 
                    cursor: block.audioFile ? "pointer" : "default" }}
                onClick={() => {
                    if (block.audioFile) router.push(`/projects/${projectId}/block/${block.audioFile.id}`)
                }}>
                {t("project_detail.block")} #{block.blockIndex + 1}
            </Typography>

            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                {block.isRecorded ? (
                    <Chip
                        label={t("project_detail.recorded")}
                        size="small"
                        sx={{ bgcolor: "var(--app-success-bg)", color: "var(--app-success-fg)", fontFamily: LABEL, fontWeight: 700, fontSize: "0.65rem" }}
                    />
                ) : (
                    <Chip
                        label={t("project_detail.pending")}
                        size="small"
                        sx={{ bgcolor: "var(--app-warn-bg)", color: "var(--app-warn-fg)", fontFamily: LABEL, fontWeight: 700, fontSize: "0.65rem" }}
                    />
                )}

                {/* Quality-check outcome (only once checks have run for this block) */}
                {block.hasQualityProblems ? (
                    <Chip
                        icon={<ErrorOutlineIcon sx={{ fontSize: "0.85rem !important", color: "var(--app-error-fg) !important" }} />}
                        label={t("project_detail.quality_issues")}
                        size="small"
                        sx={{ bgcolor: "var(--app-error-bg)", color: "var(--app-error-fg)", fontFamily: LABEL, fontWeight: 700, fontSize: "0.65rem", "& .MuiChip-icon": { ml: "4px" } }}
                    />
                ) : block.hasQualityChecks ? (
                    <Chip
                        icon={<CheckCircleIcon sx={{ fontSize: "0.85rem !important", color: "var(--app-success-fg) !important" }} />}
                        label={t("project_detail.quality_ok")}
                        size="small"
                        sx={{ bgcolor: "var(--app-success-bg)", color: "var(--app-success-fg)", fontFamily: LABEL, fontWeight: 700, fontSize: "0.65rem", "& .MuiChip-icon": { ml: "4px" } }}
                    />
                ) : null}
            </Box>

            <Button
                size="small"
                variant="contained"
                startIcon={<FiberManualRecord sx={{ fontSize: "0.8rem !important" }} />}
                sx={{
                    mt: "auto",
                    bgcolor: "var(--app-btn)",
                    borderRadius: 1.5,
                    textTransform: "none",
                    fontFamily: LABEL,
                    fontWeight: 700,
                    fontSize: "0.72rem",
                    "&:hover": { bgcolor: "var(--app-btn-hover)" },
                }}
                onClick={() => router.push(`/projects/${projectId}/record?startFrom=${block.blockIndex}`)}
            >
                {t("project_detail.start_recording")}
            </Button>
        </Paper>
    );
}