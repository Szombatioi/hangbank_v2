"use client";

import {
    Button, CircularProgress, Dialog, DialogActions,
    DialogContent, DialogContentText, DialogTitle,
} from "@mui/material";
import { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { BODY, HEADLINE, LABEL } from "./style-constants";

interface ConfirmDialogProps {
    open: boolean;
    title: string;
    description: ReactNode;
    /** Label for the confirm button. Defaults to i18n "confirm_dialog.proceed". */
    proceedLabel?: string;
    /** Label for the cancel button. Defaults to i18n "confirm_dialog.cancel". */
    cancelLabel?: string;
    /** Shows a spinner on the proceed button and disables both buttons. */
    loading?: boolean;
    /** Renders the proceed button in red to signal a destructive action. */
    dangerous?: boolean;
    onProceed: () => void;
    onCancel: () => void;
}

export default function ConfirmDialog({
    open,
    title,
    description,
    proceedLabel,
    cancelLabel,
    loading = false,
    dangerous = false,
    onProceed,
    onCancel,
}: ConfirmDialogProps) {
    const { t } = useTranslation("common");

    return (
        <Dialog
            open={open}
            onClose={loading ? undefined : onCancel}
            maxWidth="xs"
            fullWidth
            PaperProps={{ sx: { borderRadius: 3 } }}
        >
            <DialogTitle sx={{
                fontFamily: HEADLINE, fontWeight: 700, fontSize: "1.1rem",
                color: "var(--app-text-primary)", pb: 1,
            }}>
                {title}
            </DialogTitle>

            <DialogContent>
                <DialogContentText sx={{ fontFamily: BODY, fontSize: "0.9rem", color: "var(--app-text-secondary)", lineHeight: 1.65 }}>
                    {description}
                </DialogContentText>
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
                <Button
                    onClick={onCancel}
                    disabled={loading}
                    sx={{
                        fontFamily: LABEL, fontWeight: 700, fontSize: "0.75rem",
                        color: "var(--app-text-muted)", textTransform: "none", borderRadius: 1.5,
                    }}
                >
                    {cancelLabel ?? t("confirm_dialog.cancel")}
                </Button>
                <Button
                    onClick={onProceed}
                    disabled={loading}
                    variant="contained"
                    startIcon={loading ? <CircularProgress size={14} sx={{ color: "inherit" }} /> : undefined}
                    sx={{
                        fontFamily: LABEL, fontWeight: 700, fontSize: "0.75rem",
                        textTransform: "none", borderRadius: 1.5,
                        bgcolor: dangerous ? "#dc2626" : "var(--app-btn)",
                        "&:hover": { bgcolor: dangerous ? "#b91c1c" : "var(--app-btn-hover)" },
                        "&.Mui-disabled": { bgcolor: "var(--app-border)", color: "var(--app-text-faint)" },
                    }}
                >
                    {proceedLabel ?? t("confirm_dialog.proceed")}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
