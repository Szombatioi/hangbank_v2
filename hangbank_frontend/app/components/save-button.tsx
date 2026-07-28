"use client";

import { Button, CircularProgress } from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import { useTranslation } from "react-i18next";
import { LABEL } from "./style-constants";

interface SaveButtonProps {
    onClick: () => void;
    saving?: boolean;
    disabled?: boolean;
    /** Optional count suffix shown after the label, e.g. "Save (3)" */
    count?: number;
}

export default function SaveButton({ onClick, saving = false, disabled = false, count }: SaveButtonProps) {
    const { t } = useTranslation("common");
    const suffix = count && count > 0 ? ` (${count})` : "";

    return (
        <Button
            variant="contained"
            startIcon={saving
                ? <CircularProgress size={14} sx={{ color: "inherit" }} />
                : <SaveIcon sx={{ fontSize: "0.85rem !important" }} />}
            onClick={onClick}
            disabled={disabled || saving}
            sx={{
                bgcolor: "var(--app-btn)",
                borderRadius: 1.5,
                textTransform: "none",
                fontFamily: LABEL,
                fontWeight: 700,
                fontSize: "0.75rem",
                px: 2.5,
                "&:hover": { bgcolor: "var(--app-btn-hover)" },
                "&.Mui-disabled": { bgcolor: "var(--app-surface-strong)", color: "#44474c80" },
            }}
        >
            {saving ? t("record.saving") : `${t("record.save")}${suffix}`}
        </Button>
    );
}
