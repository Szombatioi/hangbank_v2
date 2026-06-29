"use client";

import { Box, Typography } from "@mui/material";
import { LABEL } from "@/app/components/style-constants";
import { COLOR } from "../helpers/colors";

interface StatusPillProps {
    label: string;
}

export default function StatusPill({ label }: StatusPillProps) {
    return (
        <Box
            sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 1,
                bgcolor: COLOR.primaryContainer,
                color: COLOR.onPrimaryContainer,
                py: 1, px: 2,
                borderRadius: 999,
                border: `1px solid ${COLOR.outlineVariant}1A`,
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
            }}
        >
            <Box
                sx={{
                    width: 8, height: 8, borderRadius: "50%",
                    bgcolor: COLOR.onPrimaryFixedVariant,
                    animation: "pulse 2s cubic-bezier(0.4,0,0.6,1) infinite",
                    "@keyframes pulse": {
                        "0%, 100%": { opacity: 1, transform: "scale(1)" },
                        "50%": { opacity: 0.6, transform: "scale(1.15)" },
                    },
                }}
            />
            <Typography
                sx={{
                    fontFamily: LABEL,
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.15em",
                }}
            >
                {label}
            </Typography>
        </Box>
    );
}
