"use client";
import { Box, Button, CircularProgress, Grid, Typography } from "@mui/material";
import { usePathname, useRouter } from "next/navigation";
import ProjectCard from "./components/project-card";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { ProjectDto } from "@/app/components/types/project.dto";
import { motion } from "framer-motion";
import api from "@/app/axios";

const CARD_HEIGHT = 220;
const FEATURED_HEIGHT = 220;

export default function ProjectsOverviewPage() {
    const router = useRouter();
    const pathname = usePathname();
    const { t } = useTranslation("common");

    const [projects, setProjects] = useState<ProjectDto[] | null>(null);

    useEffect(() => {
        async function getActiveProjects() {
            try {
                const { data } = await api.get<ProjectDto[]>("/project");
                setProjects(data);
            } catch (err) {
                console.error("Failed to load projects", err);
                setProjects([]);
            }
        }

        getActiveProjects();
    }, []);

    return (
        <Box sx={{ p: { xs: 3, md: 5 }, maxWidth: 1400, mx: "auto" }}>

            {/* Header */}
            <Box sx={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", mb: 4 }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: "-0.03em", color: "#0f172a" }}>
                        {t("projects.active_projects")}
                    </Typography>
                    <Typography variant="caption" sx={{ textTransform: "uppercase", letterSpacing: "0.15em", color: "#94a3b8", fontWeight: 700 }}>
                        {t("projects.subtitle")}
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    sx={{
                        bgcolor: "#191c1d",
                        borderRadius: 2,
                        px: 3,
                        textTransform: "none",
                        fontWeight: 700,
                        "&:hover": { bgcolor: "#0f172a" },
                    }}
                    onClick={() => router.push(`${pathname}/new`)}
                >
                    + {t("button_new_project")}
                </Button>
            </Box>

            {/* TODO: add statistics from design image (e.g. total hours recorded) */}

            {!projects ?
                (
                    <>
                        <Box sx={{ display: "flex", justifyContent: "center" }}>
                            <CircularProgress />
                        </Box>
                    </>
                ) :
                (
                    <>
                        {/* Grid */}
                        <motion.div
                            initial={{ opacity: 0, y: 100 }} // Start below
                            animate={{ opacity: 1, y: 0 }} // Swim upward
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="flex flex-col items-center justify-center h-screen w-screen"
                            style={{
                                width: "100%",
                            }}
                        >
                            <Grid container spacing={2}>
                                {projects.map((p) => (
                                    <Grid key={p.id} size={{ xs: 12, sm: 4 }}>
                                        <ProjectCard project={p} />
                                    </Grid>
                                ))}
                            </Grid>
                        </motion.div>
                    </>
                )}
        </Box>
    );
}
