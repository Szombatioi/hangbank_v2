"use client";

import { useState } from "react";
import { Box, Checkbox, Chip, Collapse, IconButton, Typography } from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { useTranslation } from "react-i18next";
import { BODY, LABEL } from "@/app/components/style-constants";

export interface ExportableAudioFile {
    audioFileId: string;
    name: string;
    durationSeconds: number;
    transcription: string;
    blockIndex: number;
    hasQualityProblems: boolean;
}

function formatDuration(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds < 0) return "—";
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
}

export default function AudioFileCard({
    file,
    selected,
    onToggle,
}: {
    file: ExportableAudioFile;
    selected: boolean;
    onToggle: () => void;
}) {
    const { t } = useTranslation("common");
    const [open, setOpen] = useState(false);

    return (
        <Box sx={{ border: "1px solid var(--app-border)", borderRadius: 2, overflow: "hidden", bgcolor: "var(--app-card)" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 1.5, py: 1.25 }}>
                <Checkbox
                    checked={selected}
                    onChange={onToggle}
                    size="small"
                    sx={{ color: "var(--app-border-strong)", "&.Mui-checked": { color: "var(--app-text-primary)" }, p: 0.5 }}
                />

                <Typography
                    sx={{ fontFamily: LABEL, fontWeight: 700, fontSize: "0.85rem", color: "var(--app-text-primary)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    title={file.name}
                >
                    {file.name}
                </Typography>

                <Typography sx={{ fontFamily: BODY, fontSize: "0.8rem", color: "var(--app-text-muted)", fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
                    {formatDuration(file.durationSeconds)}
                </Typography>

                {file.hasQualityProblems && (
                    <Chip
                        icon={<ErrorOutlineIcon sx={{ fontSize: "0.85rem !important", color: "var(--app-error-fg) !important" }} />}
                        label={t("export_page.has_errors")}
                        size="small"
                        sx={{ bgcolor: "var(--app-error-bg)", color: "var(--app-error-fg)", fontFamily: LABEL, fontWeight: 700, fontSize: "0.62rem", flexShrink: 0, "& .MuiChip-icon": { ml: "4px" } }}
                    />
                )}

                <IconButton onClick={() => setOpen((o) => !o)} size="small" sx={{ flexShrink: 0 }} aria-label={t("export_page.expand")}>
                    <KeyboardArrowDownIcon
                        sx={{ fontSize: 20, color: "var(--app-text-faint)", transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "none" }}
                    />
                </IconButton>
            </Box>

            <Collapse in={open}>
                <Box sx={{ px: 2, pb: 1.75, pt: 0.5, display: "flex", flexDirection: "column", gap: 1.5, borderTop: "1px solid var(--app-surface-muted)" }}>
                    <Box sx={{ pt: 1.5 }}>
                        <Typography sx={{ fontFamily: LABEL, fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--app-text-faint)", mb: 0.5 }}>
                            {t("export_page.block_index")}
                        </Typography>
                        <Typography sx={{ fontFamily: BODY, fontSize: "0.85rem", color: "var(--app-text-primary)" }}>
                            #{file.blockIndex + 1}
                        </Typography>
                    </Box>
                    <Box>
                        <Typography sx={{ fontFamily: LABEL, fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--app-text-faint)", mb: 0.5 }}>
                            {t("export_page.transcription")}
                        </Typography>
                        <Typography sx={{ fontFamily: BODY, fontSize: "0.85rem", color: "var(--app-text-secondary)", lineHeight: 1.6 }}>
                            {file.transcription || "—"}
                        </Typography>
                    </Box>
                </Box>
            </Collapse>
        </Box>
    );
}
