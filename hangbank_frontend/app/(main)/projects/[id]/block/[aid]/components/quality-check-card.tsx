"use client";

import { useState } from "react";
import { Box, Collapse, IconButton, Typography } from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { useTranslation } from "react-i18next";
import { BODY, LABEL } from "@/app/components/style-constants";
import {
    AudioQualityMeasure,
    QualityMetadata,
    matchRange,
    valuesHaveProblem,
} from "@/app/components/helpers/audio-quality";

export default function QualityCheckCard({
    measure,
    meta,
}: {
    measure: AudioQualityMeasure;
    meta: QualityMetadata;
}) {
    const { t } = useTranslation("common");
    const [open, setOpen] = useState(false);

    const hasProblem = valuesHaveProblem(measure.values, meta.ranges);

    return (
        <Box sx={{ border: "1px solid #e2e8f0", borderRadius: 2, overflow: "hidden" }}>
            {/* Header */}
            <Box
                onClick={() => setOpen((o) => !o)}
                sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    px: 2,
                    py: 1.25,
                    cursor: "pointer",
                    "&:hover": { bgcolor: "#f8fafc" },
                }}
            >
                {hasProblem ? (
                    <ErrorOutlineIcon sx={{ fontSize: 18, color: "#dc2626" }} />
                ) : (
                    <CheckCircleOutlineIcon sx={{ fontSize: 18, color: "#16a34a" }} />
                )}
                <Typography sx={{ fontFamily: LABEL, fontWeight: 700, fontSize: "0.85rem", color: "#0f172a", flex: 1 }}>
                    {t(meta.displayName)}
                </Typography>
                <KeyboardArrowDownIcon
                    sx={{
                        fontSize: 20,
                        color: "#94a3b8",
                        transition: "transform 0.2s",
                        transform: open ? "rotate(180deg)" : "none",
                    }}
                />
            </Box>

            {/* Details: each value + the matched range description */}
            <Collapse in={open}>
                <Box sx={{ px: 2, pb: 1.5, pt: 0.5, display: "flex", flexDirection: "column", gap: 1 }}>
                    {measure.values.map((value, i) => {
                        const range = matchRange(value, meta.ranges);
                        return (
                            <Box
                                key={i}
                                sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}
                            >
                                <Typography sx={{ fontFamily: BODY, fontSize: "0.85rem", color: "#475569", fontVariantNumeric: "tabular-nums" }}>
                                    {Number.isInteger(value) ? value : value.toFixed(2)}
                                </Typography>
                                <Typography
                                    sx={{
                                        fontFamily: LABEL,
                                        fontWeight: 700,
                                        fontSize: "0.72rem",
                                        color: range?.isProblem ? "#dc2626" : "#16a34a",
                                    }}
                                >
                                    {range ? t(range.displayName) : "—"}
                                </Typography>
                            </Box>
                        );
                    })}
                </Box>
            </Collapse>
        </Box>
    );
}
