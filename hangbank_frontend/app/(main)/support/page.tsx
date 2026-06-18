"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Box, Dialog, DialogContent, DialogTitle, Grid, IconButton, Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { BODY, HEADLINE } from "@/app/components/style-constants";
import SupportCard, { SupportItem } from "./components/support-card";

// Mocked support items — replace with a real source later
const SUPPORT_ITEMS: SupportItem[] = [
    {
        title: "Getting started with recording",
        shortDescription: "Learn how to set up your microphone and record your first corpus block.",
        longDescription:
            "To start recording, open a corpus-based project and click “Start Recording” on any block. " +
            "Before recording, make sure the microphone configured for the project is connected and that you've " +
            "granted the browser permission to use it. Press the play button to begin, Space to save the current " +
            "take and move to the next block, Enter to stop and keep the take, and Escape to cancel without saving. " +
            "Once a take is finished you can play it back and re-record it if you're not satisfied.",
    },
    {
        title: "Managing corpora and projects",
        shortDescription: "Upload corpora, create projects from them, and track recording progress.",
        longDescription:
            "Corpora are reusable text sources. Upload one from the Library, where it is automatically split into " +
            "blocks you can preview. When you create a project from a corpus, those blocks are copied into the project " +
            "so each project tracks its own recording progress independently. You can delete a corpus only when no " +
            "project still references it, and only a project's owner can delete the project itself. Progress is shown " +
            "as the share of blocks that have a recording attached.",
    },
];

export default function SupportPage() {
    const { t } = useTranslation("common");
    const [selected, setSelected] = useState<SupportItem | null>(null);

    return (
        <Box sx={{ p: { xs: 3, md: 5 }, maxWidth: 1000, mx: "auto" }}>
            <Typography sx={{ fontFamily: HEADLINE, fontWeight: 700, fontSize: "1.5rem", color: "#0f172a", letterSpacing: "-0.02em" }}>
                {t("support.title")}
            </Typography>
            <Typography sx={{ fontFamily: BODY, fontSize: "0.95rem", color: "#64748b", mt: 0.5, mb: 4 }}>
                {t("support.subtitle")}
            </Typography>

            <Grid container spacing={3}>
                {SUPPORT_ITEMS.map((item) => (
                    <Grid key={item.title} size={{ xs: 12, sm: 6 }}>
                        <SupportCard item={item} onClick={() => setSelected(item)} />
                    </Grid>
                ))}
            </Grid>

            <Dialog
                open={!!selected}
                onClose={() => setSelected(null)}
                maxWidth="sm"
                fullWidth
                PaperProps={{ sx: { borderRadius: 3 } }}
            >
                <DialogTitle sx={{ fontFamily: HEADLINE, fontWeight: 700, fontSize: "1.25rem", color: "#0f172a", textAlign: "center", pt: 3, px: 5 }}>
                    {selected?.title}
                    <IconButton
                        onClick={() => setSelected(null)}
                        sx={{ position: "absolute", right: 12, top: 12, color: "#94a3b8" }}
                    >
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    <Typography sx={{ fontFamily: BODY, fontSize: "0.95rem", color: "#475569", lineHeight: 1.75, whiteSpace: "pre-line" }}>
                        {selected?.longDescription}
                    </Typography>
                </DialogContent>
            </Dialog>
        </Box>
    );
}
