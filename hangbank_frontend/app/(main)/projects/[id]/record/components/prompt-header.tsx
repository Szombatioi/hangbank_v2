"use client";

import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { HEADLINE, LABEL } from "@/app/components/style-constants";
import { COLOR } from "../helpers/colors";

interface PromptHeaderProps {
    countLabel: string;
    promptText: string;
}

export default function PromptHeader({ countLabel, promptText }: PromptHeaderProps) {
    const { t } = useTranslation("common");

    return (
        <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
                <Typography
                    sx={{
                        fontFamily: LABEL,
                        fontSize: 11,
                        fontWeight: 500,
                        textTransform: "uppercase",
                        letterSpacing: "0.15em",
                        color: `${COLOR.onSurfaceVariant}80`,
                        flexShrink: 0,
                    }}
                >
                    {t("record.current_prompt")}
                </Typography>
                <Box sx={{ flex: 1, height: "1px", bgcolor: `${COLOR.outlineVariant}55` }} />
                <Typography
                    sx={{
                        fontFamily: LABEL,
                        fontSize: 11,
                        fontWeight: 700,
                        color: COLOR.onSurfaceVariant,
                        flexShrink: 0,
                    }}
                >
                    {countLabel}
                </Typography>
            </Box>

            <Typography
                sx={{
                    fontFamily: HEADLINE,
                    fontWeight: 700,
                    fontSize: { xs: "2rem", md: "2.75rem" },
                    lineHeight: 1.1,
                    color: COLOR.onSurface,
                    letterSpacing: "-0.025em",
                    maxWidth: "48rem",
                }}
            >
                {promptText}
            </Typography>
        </Box>
    );
}
