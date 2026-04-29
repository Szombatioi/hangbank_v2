"use client";
import { Box, Button, Grid, Typography } from "@mui/material";
import { usePathname, useRouter } from "next/navigation";
import ProjectCard from "./components/project-card";
import { useTranslation } from "react-i18next";

const CARD_HEIGHT = 220;
const FEATURED_HEIGHT = 220;

export default function ProjectsOverviewPage() {
    const router = useRouter();
    const pathname = usePathname();
    const {t} = useTranslation("common");

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

            {/* Grid */}
            <Grid container spacing={2}>

                {/* Row 1 — three equal cards */}
                <Grid size={{ xs: 12, sm: 4 }}>
                    <ProjectCard />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                    <ProjectCard />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                    <ProjectCard />
                </Grid>

                {/* Row 2 — small card + wide featured card */}
                <Grid size={{ xs: 12, sm: 4 }}>
                    <ProjectCard />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                    <ProjectCard />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                    <ProjectCard />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                    <ProjectCard />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                    <ProjectCard />
                </Grid>

            </Grid>
        </Box>
    );
}
