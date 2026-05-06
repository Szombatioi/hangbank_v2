"use client";

import GetProjectIcon from "@/app/components/helpers/get-project-icon";
import { Box, Chip, Container, LinearProgress, Paper, Typography } from "@mui/material";
import PeopleOutlineIcon from "@mui/icons-material/PeopleOutline";
import LanguageIcon from "@mui/icons-material/Language";
import { ProjectType } from "../new/components/project-type-selector";
import { useTranslation } from "react-i18next";
import GetColorFromProgress, { ProjectProgress } from "@/app/components/helpers/get-color-from-progress";
import { ProjectDto } from "@/app/components/types/project.dto";
import { formatUpdatedAt } from "@/app/components/helpers/format-update-date";
import { MenuBook } from "@mui/icons-material";
import { useRouter } from "next/navigation";

const LABEL = "'Manrope', sans-serif";
const HEADLINE = "'Space Grotesk', sans-serif";
const BODY = "'Inter', sans-serif";

export interface ProjectCardProps {
    project: ProjectDto;
    featured?: boolean;
}

export default function ProjectCard({ project, featured = false }: ProjectCardProps) {
    const { t } = useTranslation("common");
    const router = useRouter();

    //TODO: remove these mock values
    const type = project.type ?? ProjectType.CORPUS;
    const name = project.name ?? "Untitled Project";
    const description = project.description ?? "Test description";
    const corpusProgress = project.corpusProgress ?? 12;
    const corpusName = project.corpusName ?? "Test Corpus";
    const language = project.language ?? "en-US";
    const speakerCount = project.speakerCount ?? 1;
    const updatedAt = formatUpdatedAt(project.updatedAt ?? project.createdAt);

    const progress = corpusProgress > 0 ?
        corpusProgress === 100 ? ProjectProgress.FINISHED : ProjectProgress.IN_PROGRESS :
        ProjectProgress.NEW;

    const colors = GetColorFromProgress(progress);

    return (
        <Paper
            elevation={0}
            onClick={() => { router.push(`/projects/${project.id}`) }}
            sx={{
                width: "100%",
                minHeight: 300,
                bgcolor: featured ? "#191c1d" : "#fff",
                border: featured ? "none" : "1px solid #e2e8f0",
                borderRadius: 3,
                display: "flex",
                flexDirection: "column",
                p: 2.5,
                gap: 1.5,
                cursor: "pointer",
                overflow: "hidden",
                position: "relative",
                transition: "box-shadow 0.2s, border-color 0.2s",
                ...(featured
                    ? { background: "linear-gradient(135deg, #1e2a3a 0%, #0f172a 100%)" }
                    : { "&:hover": { boxShadow: "0 4px 20px rgba(0,0,0,0.07)", borderColor: "#cbd5e1" } }),
            }}
        >
            {/* Top row: icon + chip + timestamp */}
            <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <Box
                    sx={{
                        p: 1.25,
                        bgcolor: featured ? "rgba(255,255,255,0.08)" : "#f1f5f9",
                        borderRadius: 2,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: featured ? "#94a3b8" : "#475569",
                    }}
                >
                    {GetProjectIcon(type)}
                </Box>

                <Chip
                    label={featured ? "Featured" : t(progress)}
                    size="small"
                    sx={{
                        borderColor: featured ? "#ed4a14" : colors.text,
                        color: featured ? "#ed4a14" : colors.text,
                        bgcolor: featured ? "rgba(237,74,20,0.12)" : colors.background,
                        borderRadius: "999px",
                        fontFamily: LABEL,
                        fontWeight: 700,
                        fontSize: "0.65rem",
                        letterSpacing: "0.08em",
                        px: 0.5,
                        border: "1.5px solid",
                    }}
                />
            </Box>

            <Box sx={{ display: "flex", justifyContent: "space-between", flex: 1 }}>
                <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "space-evenly" }}>
                    {/* Name */}
                    <Typography
                        sx={{
                            fontFamily: HEADLINE,
                            fontWeight: 700,
                            fontSize: "1.125rem",
                            color: featured ? "#f8fafc" : "#0f172a",
                            lineHeight: 1.3,
                            mt: 0.5,
                        }}
                    >
                        {name}
                    </Typography>

                    {/* Description */}
                    {description && (
                        <Typography
                            sx={{
                                fontFamily: BODY,
                                fontSize: "0.8125rem",
                                color: featured ? "#94a3b8" : "#64748b",
                                lineHeight: 1.55,
                                display: "-webkit-box",
                                WebkitLineClamp: 3,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                                flex: 1,
                            }}
                        >
                            {description}
                        </Typography>
                    )}

                    {/* Metadata row: speakers + language */}
                    {(speakerCount !== undefined || language) && (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
                            {speakerCount !== undefined && (
                                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                    <PeopleOutlineIcon sx={{ fontSize: "0.9rem", color: featured ? "#475569" : "#94a3b8" }} />
                                    <Typography sx={{ fontFamily: LABEL, fontSize: "0.72rem", fontWeight: 600, color: "#64748b" }}>
                                        {speakerCount} {t(speakerCount === 1 ? "project_card.speaker" : "project_card.speakers")}
                                    </Typography>
                                </Box>
                            )}
                            {language && (
                                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                    <LanguageIcon sx={{ fontSize: "0.9rem", color: featured ? "#475569" : "#94a3b8" }} />
                                    <Typography sx={{ fontFamily: LABEL, fontSize: "0.72rem", fontWeight: 600, color: "#64748b" }}>
                                        {language}
                                    </Typography>
                                </Box>
                            )}
                        </Box>
                    )}

                    {/* Corpus name badge */}
                    {corpusName && (
                        <Box sx={{ mt: 0.5, display: "flex", justifyContent: "start", alignItems: "center", gap: 1 }}>
                            <MenuBook sx={{ fontSize: "0.9rem", color: featured ? "#475569" : "#94a3b8" }} />
                            <Typography
                                sx={{
                                    fontFamily: LABEL,
                                    fontSize: "0.7rem",
                                    fontWeight: 600,
                                    color: featured ? "#475569" : "#94a3b8",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.1em",
                                }}
                            >
                                {corpusName}
                            </Typography>
                        </Box>
                    )}
                </Box>
                <Box sx={{ display: "flex", flexShrink: 0, alignItems: "end" }}>
                    {updatedAt && (
                        <Typography sx={{fontFamily: LABEL, fontSize: "0.65rem", fontWeight: 600, color: featured ? "#475569" : "#94a3b8", textAlign: "right", mb: 0.5 }}>
                            {updatedAt}
                        </Typography>
                    )}
                </Box>
            </Box>

            {/* Progress bar */}
            <Box sx={{ mt: "auto", pt: 0 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.75 }}>
                    <Typography
                        sx={{ fontFamily: LABEL, fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: featured ? "#475569" : "#94a3b8" }}
                    >
                        {t("project_card.corpus_progress")}
                    </Typography>
                    <Typography sx={{ fontFamily: LABEL, fontWeight: 700, fontSize: "0.8rem", color: featured ? "#e2e8f0" : "#334155" }}>
                        {corpusProgress}%
                    </Typography>
                </Box>
                <LinearProgress
                    variant="determinate"
                    value={corpusProgress}
                    sx={{
                        height: 4,
                        borderRadius: 2,
                        bgcolor: featured ? "#1e293b" : "#f1f5f9",
                        "& .MuiLinearProgress-bar": { bgcolor: featured ? "#ed4a14" : "#191c1d" },
                    }}
                />
            </Box>
        </Paper>
    );
}
