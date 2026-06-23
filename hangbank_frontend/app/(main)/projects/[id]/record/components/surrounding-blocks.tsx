"use client";

import { Box, Typography } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { BODY, LABEL } from "@/app/components/style-constants";
import { COLOR } from "../helpers/colors";
import { formatDuration } from "../helpers/format-duration";
import { BufferedRecording, RecordingBlockDto } from "../helpers/types";

const UPCOMING_COUNT = 6; // how many upcoming blocks to preview below the current one

interface SurroundingBlocksProps {
    blocks: RecordingBlockDto[];
    currentIdx: number;
    bufferedRecordings: Map<string, BufferedRecording>;
}

function BlockChip({ label, bg, color, icon }: { label: string; bg: string; color: string; icon?: ReactNode }) {
    return (
        <Box
            component="span"
            sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.5,
                px: 0.75,
                py: 0.25,
                bgcolor: bg,
                color,
                borderRadius: 0.5,
                fontSize: 9,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "-0.02em",
                fontFamily: LABEL,
            }}
        >
            {icon}
            {label.toUpperCase()}
        </Box>
    );
}

// The current block is rendered prominently in the PromptHeader; this list shows
// only the blocks that come *after* it, so the speaker can read ahead.
export default function SurroundingBlocks({ blocks, currentIdx, bufferedRecordings }: SurroundingBlocksProps) {
    const { t } = useTranslation("common");
    const upcoming = blocks.slice(currentIdx + 1, currentIdx + 1 + UPCOMING_COUNT);

    if (upcoming.length === 0) return null;

    return (
        <Box sx={{ display: "flex", flexDirection: "column", maxWidth: 640 }}>
            <Typography
                sx={{
                    fontFamily: LABEL,
                    fontSize: 11,
                    fontWeight: 500,
                    textTransform: "uppercase",
                    letterSpacing: "0.15em",
                    color: `${COLOR.onSurfaceVariant}80`,
                    mb: 3,
                }}
            >
                {t("record.upcoming")}
            </Typography>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {upcoming.map((block) => {
                    const buffered = bufferedRecordings.get(block.id);
                    const isRecorded = block.isRecorded; // a previously recorded (saved) audio file
                    const text = block.text || `${t("record.block")} #${block.blockIndex + 1}`;
                    const durationLabel = buffered ? formatDuration(buffered.durationSeconds) : "";
                    const hasChip = isRecorded || !!buffered;

                    return (
                        <Box
                            key={block.id}
                            sx={{
                                display: "flex",
                                alignItems: "flex-start",
                                gap: 4,
                                opacity: isRecorded || buffered ? 0.55 : 0.35,
                            }}
                        >
                            <Typography
                                sx={{
                                    fontFamily: LABEL,
                                    fontSize: 10,
                                    fontWeight: 400,
                                    color: COLOR.onSurfaceVariant,
                                    fontVariantNumeric: "tabular-nums",
                                    pt: 1,
                                    width: 48,
                                    textAlign: "right",
                                }}
                            >
                                {durationLabel}
                            </Typography>

                            <Box sx={{ flex: 1 }}>
                                {/* Independent state chips — any combination may show */}
                                {hasChip && (
                                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mb: 1 }}>
                                        {isRecorded && (
                                            <BlockChip
                                                label={t("project_detail.recorded")}
                                                bg={COLOR.emeraldBg}
                                                color={COLOR.emeraldText}
                                                icon={<CheckCircleIcon sx={{ fontSize: 12 }} />}
                                            />
                                        )}
                                        {buffered && (
                                            <BlockChip
                                                label={t("record.buffered")}
                                                bg="#dbeafe"
                                                color="#1d4ed8"
                                            />
                                        )}
                                    </Box>
                                )}

                                <Typography
                                    sx={{
                                        fontFamily: BODY,
                                        fontSize: 20,
                                        lineHeight: 1.6,
                                    }}
                                >
                                    {text}
                                </Typography>
                            </Box>
                        </Box>
                    );
                })}
            </Box>
        </Box>
    );
}
