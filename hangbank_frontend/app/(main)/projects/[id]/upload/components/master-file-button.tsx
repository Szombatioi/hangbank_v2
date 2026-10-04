"use client";
import { IconButton, Tooltip } from "@mui/material";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import ConfirmDialog from "@/app/components/confirm-dialog";
import { LABEL } from "@/app/components/style-constants";

interface MasterFileButtonProps {
  isMasterPrompt: boolean;
  disabled?: boolean;
  onConfirm: () => void;
}

export default function MasterFileButton({
  isMasterPrompt,
  disabled = false,
  onConfirm,
}: MasterFileButtonProps) {
  const { t } = useTranslation("common");
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <Tooltip
        title={
          isMasterPrompt
            ? t("uploaded_file.master_tooltip")
            : t("uploaded_file.set_master_tooltip")
        }
      >
        <span>
          <IconButton
            onClick={() => setConfirmOpen(true)}
            disabled={isMasterPrompt || disabled}
            sx={{
              width: 40,
              height: 40,
              fontFamily: LABEL,
              fontWeight: 700,
              fontSize: "1rem",
              "&.Mui-disabled": isMasterPrompt
                ? { bgcolor: "#fdf5e7", color: "#603e11" }
                : undefined,
            }}
          >
            M
          </IconButton>
        </span>
      </Tooltip>

      <ConfirmDialog
        open={confirmOpen}
        title={t("uploaded_file.set_master_title")}
        description={t("uploaded_file.set_master_description")}
        proceedLabel={t("uploaded_file.set_master_confirm")}
        onProceed={() => {
          setConfirmOpen(false);
          onConfirm();
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
