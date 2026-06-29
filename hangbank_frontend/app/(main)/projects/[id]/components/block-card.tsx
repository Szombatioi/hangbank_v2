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
            sx={{ border: "1px solid #e2e8f0", borderRadius: 2, p: 2, display: "flex", flexDirection: "column", gap: 1.5, height: "100%" }}
        >
            <Typography
                sx={{ 
                    fontFamily: HEADLINE, 
                    fontWeight: 700, 
                    fontSize: "0.9rem", 
                    color: "#0f172a", 
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
                        sx={{ bgcolor: "#e8f5e9", color: "#2e7d32", fontFamily: LABEL, fontWeight: 700, fontSize: "0.65rem" }}
                    />
                ) : (
                    <Chip
                        label={t("project_detail.pending")}
                        size="small"
                        sx={{ bgcolor: "#fff3e0", color: "#ef6c00", fontFamily: LABEL, fontWeight: 700, fontSize: "0.65rem" }}
                    />
                )}

                {/* Quality-check outcome (only once checks have run for this block) */}
                {block.hasQualityProblems ? (
                    <Chip
                        icon={<ErrorOutlineIcon sx={{ fontSize: "0.85rem !important", color: "#c62828 !important" }} />}
                        label={t("project_detail.quality_issues")}
                        size="small"
                        sx={{ bgcolor: "#fdecea", color: "#c62828", fontFamily: LABEL, fontWeight: 700, fontSize: "0.65rem", "& .MuiChip-icon": { ml: "4px" } }}
                    />
                ) : block.hasQualityChecks ? (
                    <Chip
                        icon={<CheckCircleIcon sx={{ fontSize: "0.85rem !important", color: "#2e7d32 !important" }} />}
                        label={t("project_detail.quality_ok")}
                        size="small"
                        sx={{ bgcolor: "#e8f5e9", color: "#2e7d32", fontFamily: LABEL, fontWeight: 700, fontSize: "0.65rem", "& .MuiChip-icon": { ml: "4px" } }}
                    />
                ) : null}
            </Box>

            <Button
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
                onClick={() => router.push(`/projects/${projectId}/record?startFrom=${block.blockIndex}`)}
            >
                {t("project_detail.start_recording")}
            </Button>
        </Paper>
    );
}