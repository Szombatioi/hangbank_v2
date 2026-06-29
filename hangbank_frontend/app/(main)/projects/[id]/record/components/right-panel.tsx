"use client";

import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { BODY, HEADLINE, LABEL } from "@/app/components/style-constants";
import { useColors } from "../helpers/colors";

interface RightPanelProps {
    samplingRate?: number;
    micLabel: string;
    transcription: string;
    onTranscriptionChange: (value: string) => void;
}

export default function RightPanel({
    samplingRate, micLabel, transcription, onTranscriptionChange,
}: RightPanelProps) {
    const { t } = useTranslation("common");
    const COLOR = useColors();

    return (
        <Box
            sx={{
                p: 6,
                display: "flex",
                flexDirection: "column",
                gap: 6,
                bgcolor: COLOR.surfaceContainerLow,
                borderLeft: `1px solid ${COLOR.outlineVariant}1A`,
                overflowY: "auto",
            }}
        >
            <Box
                sx={{
                    bgcolor: COLOR.surfaceContainerHighest,
                    p: 3,
                    borderRadius: 2,
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                }}
            >
                <Typography
                    sx={{
                        fontFamily: HEADLINE,
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        color: `${COLOR.onSurfaceVariant}B3`,
                    }}
                >
                    {t("record.session_details")}
                </Typography>
                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                    <Box>
                        <Typography sx={{ fontFamily: LABEL, fontSize: 10, textTransform: "uppercase", color: `${COLOR.onSurfaceVariant}99` }}>
                            {t("record.sample_rate")}
                        </Typography>
                        <Typography sx={{ fontFamily: HEADLINE, fontWeight: 700, fontSize: 13 }}>
                            {samplingRate ? `${(samplingRate / 1000).toFixed(1)} kHz` : "—"}
                        </Typography>
                    </Box>
                    <Box>
                        <Typography sx={{ fontFamily: LABEL, fontSize: 10, textTransform: "uppercase", color: `${COLOR.onSurfaceVariant}99` }}>
                            {t("record.bit_depth")}
                        </Typography>
                        {/* TODO: load bit depth from project settings once configurable */}
                        <Typography sx={{ fontFamily: HEADLINE, fontWeight: 700, fontSize: 13 }}>
                            16-bit PCM
                        </Typography>
                    </Box>
                    <Box>
                        <Typography sx={{ fontFamily: LABEL, fontSize: 10, textTransform: "uppercase", color: `${COLOR.onSurfaceVariant}99` }}>
                            {t("record.file_type")}
                        </Typography>
                        {/* TODO: load file type from project settings once configurable */}
                        <Typography sx={{ fontFamily: HEADLINE, fontWeight: 700, fontSize: 13 }}>
                            WAV
                        </Typography>
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontFamily: LABEL, fontSize: 10, textTransform: "uppercase", color: `${COLOR.onSurfaceVariant}99` }}>
                            {t("record.source")}
                        </Typography>
                        <Typography
                            sx={{
                                fontFamily: HEADLINE,
                                fontWeight: 700,
                                fontSize: 13,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                            }}
                            title={micLabel || "—"}
                        >
                            {micLabel || "—"}
                        </Typography>
                    </Box>
                </Box>
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                <Typography
                    sx={{
                        fontFamily: HEADLINE,
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        color: `${COLOR.onSurfaceVariant}B3`,
                    }}
                >
                    {t("record.transcription")}
                </Typography>
                <Box
                    component="textarea"
                    value={transcription}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onTranscriptionChange(e.target.value)}
                    placeholder={t("record.transcription_placeholder")}
                    sx={{
                        width: "100%",
                        minHeight: 96,
                        p: 2,
                        bgcolor: COLOR.surface,
                        borderRadius: 1,
                        border: "none",
                        outline: "none",
                        resize: "vertical",
                        fontFamily: BODY,
                        fontSize: 14,
                        fontStyle: "italic",
                        color: `${COLOR.onSurfaceVariant}CC`,
                        lineHeight: 1.6,
                        "&::placeholder": {
                            color: `${COLOR.onSurfaceVariant}99`,
                            fontStyle: "italic",
                        },
                    }}
                />
            </Box>
        </Box>
    );
}
