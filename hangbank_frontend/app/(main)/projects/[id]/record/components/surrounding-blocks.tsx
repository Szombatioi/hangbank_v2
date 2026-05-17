"use client";

import { Box, Typography } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useTranslation } from "react-i18next";
import { BODY, LABEL, ORANGE } from "@/app/components/style-constants";
import { COLOR } from "../helpers/colors";
import { formatDuration } from "../helpers/format-duration";
import { BufferedRecording, RecordingBlockDto } from "../helpers/types";

const BLOCK_WINDOW = 2; // number of blocks shown before and after the current one

interface SurroundingBlocksProps {
    blocks: RecordingBlockDto[];
    currentIdx: number;
    bufferedRecordings: Map<string, BufferedRecording>;
}

export default function SurroundingBlocks({ blocks, currentIdx, bufferedRecordings }: SurroundingBlocksProps) {
    const { t } = useTranslation("common");
    const from = Math.max(0, currentIdx - BLOCK_WINDOW);
    const to = Math.min(blocks.length, currentIdx + BLOCK_WINDOW + 1);
    const window = blocks.slice(from, to);

    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 4, maxWidth: 640 }}>
            {window.map((block) => {
                const idx = blocks.indexOf(block);
                const isCurrent = idx === currentIdx;
                const buffered = bufferedRecordings.get(block.id);
                const isRecorded = idx < currentIdx || !!buffered || block.isRecorded;
                const text = block.text || `${t("record.block")} #${block.blockIndex + 1}`;
                const durationLabel = buffered ? formatDuration(buffered.durationSeconds) : "";

                if (isCurrent) {
                    return (
                        <Box key={block.id} sx={{ display: "flex", alignItems: "flex-start", gap: 4 }}>
                            <Typography
                                sx={{
                                    fontFamily: LABEL,
                                    fontSize: 10,
                                    fontWeight: 700,
                                    color: ORANGE,
                                    pt: 1,
                                    width: 48,
                                    textAlign: "right",
                                }}
                            >
                                {t("record.live").toUpperCase()}
                            </Typography>
                            <Box sx={{ position: "relative", flex: 1 }}>
                                <Typography
                                    sx={{
                                        fontFamily: BODY,
                                        fontSize: 20,
                                        lineHeight: 1.6,
                                        color: COLOR.onSurface,
                                        fontWeight: 500,
                                        fontStyle: "italic",
                                        borderLeft: `2px solid ${ORANGE}`,
                                        pl: 3,
                                        py: 1,
                                        bgcolor: "rgba(59,9,0,0.05)",
                                    }}
                                >
                                    {text}
                                </Typography>
                                <Box
                                    sx={{
                                        position: "absolute",
                                        right: -4,
                                        bottom: 4,
                                        width: 8,
                                        height: 20,
                                        bgcolor: ORANGE,
                                        animation: "blink 1s steps(2,start) infinite",
                                        "@keyframes blink": {
                                            to: { visibility: "hidden" },
                                        },
                                    }}
                                />
                            </Box>
                        </Box>
                    );
                }

                return (
                    <Box
                        key={block.id}
                        sx={{ display: "flex", alignItems: "flex-start", gap: 4, opacity: isRecorded ? 0.55 : 0.35 }}
                    >
                        <Typography
                            sx={{
                                fontFamily: LABEL,
                                fontSize: 10,
                                color: COLOR.onSurfaceVariant,
                                fontVariantNumeric: "tabular-nums",
                                pt: 1,
                                width: 48,
                                textAlign: "right",
                            }}
                        >
                            {durationLabel}
                        </Typography>
                        <Typography sx={{ fontFamily: BODY, fontSize: 20, lineHeight: 1.6, flex: 1 }}>
                            {isRecorded && (
                                <Box
                                    component="span"
                                    sx={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 0.5,
                                        mr: 1.25,
                                        px: 0.75,
                                        py: 0.25,
                                        bgcolor: COLOR.emeraldBg,
                                        color: COLOR.emeraldText,
                                        borderRadius: 0.5,
                                        fontSize: 9,
                                        fontWeight: 700,
                                        textTransform: "uppercase",
                                        letterSpacing: "-0.02em",
                                        fontFamily: LABEL,
                                        verticalAlign: "middle",
                                    }}
                                >
                                    <CheckCircleIcon sx={{ fontSize: 12 }} />
                                    {t("project_detail.recorded").toUpperCase()}
                                </Box>
                            )}
                            {text}
                        </Typography>
                    </Box>
                );
            })}
        </Box>
    );
}
