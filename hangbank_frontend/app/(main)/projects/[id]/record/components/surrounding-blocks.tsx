"use client";

import { Box, Typography } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import { ReactNode } from "react";
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
                const isRecorded = block.isRecorded; // a previously recorded (saved) audio file
                const text = block.text || `${t("record.block")} #${block.blockIndex + 1}`;
                const durationLabel = buffered ? formatDuration(buffered.durationSeconds) : "";
                const hasChip = isCurrent || isRecorded || !!buffered;

                return (
                    <Box
                        key={block.id}
                        sx={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 4,
                            opacity: isCurrent ? 1 : isRecorded || buffered ? 0.55 : 0.35,
                        }}
                    >
                        <Typography
                            sx={{
                                fontFamily: LABEL,
                                fontSize: 10,
                                fontWeight: isCurrent ? 700 : 400,
                                color: isCurrent ? ORANGE : COLOR.onSurfaceVariant,
                                fontVariantNumeric: "tabular-nums",
                                pt: 1,
                                width: 48,
                                textAlign: "right",
                            }}
                        >
                            {durationLabel}
                        </Typography>

                        <Box sx={{ position: "relative", flex: 1 }}>
                            {/* Independent state chips — any combination may show */}
                            {hasChip && (
                                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mb: 1 }}>
                                    {isCurrent && (
                                        <BlockChip
                                            label={t("record.live")}
                                            bg="rgba(237,74,20,0.12)"
                                            color={ORANGE}
                                            icon={<FiberManualRecordIcon sx={{ fontSize: 10 }} />}
                                        />
                                    )}
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
                                    flex: 1,
                                    ...(isCurrent && {
                                        color: COLOR.onSurface,
                                        fontWeight: 500,
                                        fontStyle: "italic",
                                        borderLeft: `2px solid ${ORANGE}`,
                                        pl: 3,
                                        py: 1,
                                        bgcolor: "rgba(59,9,0,0.05)",
                                    }),
                                }}
                            >
                                {text}
                            </Typography>

                            {isCurrent && (
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
                            )}
                        </Box>
                    </Box>
                );
            })}
        </Box>
    );
}
