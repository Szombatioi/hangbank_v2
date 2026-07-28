"use client";

import { Box, Typography } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useTranslation } from "react-i18next";
import { HEADLINE, LABEL } from "@/app/components/style-constants";
import { useColors } from "../helpers/colors";

interface PromptHeaderProps {
    countLabel: string;
    promptText: string;
    isRecorded?: boolean; // a previously saved recording exists for this block
    isBuffered?: boolean; // an unsaved take is buffered for this block
}

export default function PromptHeader({ countLabel, promptText, isRecorded, isBuffered }: PromptHeaderProps) {
    const { t } = useTranslation("common");
    const COLOR = useColors();

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

            {/* Status badges for the current block (recorded / buffered) */}
            {(isRecorded || isBuffered) && (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
                    {isRecorded && (
                        <Box
                            component="span"
                            sx={{
                                display: "inline-flex", alignItems: "center", gap: 0.5,
                                px: 1, py: 0.4, borderRadius: 0.75,
                                bgcolor: COLOR.emeraldBg, color: COLOR.emeraldText,
                                fontFamily: LABEL, fontWeight: 700, fontSize: 10,
                                textTransform: "uppercase", letterSpacing: "0.04em",
                            }}
                        >
                            <CheckCircleIcon sx={{ fontSize: 12 }} />
                            {t("project_detail.recorded")}
                        </Box>
                    )}
                    {isBuffered && (
                        <Box
                            component="span"
                            sx={{
                                display: "inline-flex", alignItems: "center",
                                px: 1, py: 0.4, borderRadius: 0.75,
                                bgcolor: "#dbeafe", color: "#1d4ed8",
                                fontFamily: LABEL, fontWeight: 700, fontSize: 10,
                                textTransform: "uppercase", letterSpacing: "0.04em",
                            }}
                        >
                            {t("record.buffered")}
                        </Box>
                    )}
                </Box>
            )}

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
