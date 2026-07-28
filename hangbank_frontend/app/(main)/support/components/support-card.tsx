"use client";

import { Box, Paper, Typography } from "@mui/material";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { BODY, HEADLINE, ORANGE } from "@/app/components/style-constants";

export interface SupportItem {
    id: string; //we give a custom name to determine which support text this is (to have multiple languages for this)
    title: string;
    shortDescription: string;
    longDescription: string;
    language: string;
}

export default function SupportCard({ item, onClick }: { item: SupportItem; onClick: () => void }) {
    return (
        <Paper
            elevation={0}
            onClick={onClick}
            sx={{
                border: "1px solid var(--app-border)",
                borderRadius: 3,
                p: 3,
                cursor: "pointer",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                gap: 1.25,
                transition: "all 0.2s",
                "&:hover": { borderColor: ORANGE, boxShadow: "0 4px 20px rgba(0,0,0,0.06)" },
            }}
        >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                <HelpOutlineIcon sx={{ fontSize: "1.25rem", color: ORANGE }} />
                <Typography sx={{ fontFamily: HEADLINE, fontWeight: 700, fontSize: "1.05rem", color: "var(--app-text-primary)" }}>
                    {item.title}
                </Typography>
            </Box>
            <Typography sx={{ fontFamily: BODY, fontSize: "0.9rem", color: "var(--app-text-muted)", lineHeight: 1.6 }}>
                {item.shortDescription}
            </Typography>
        </Paper>
    );
}
