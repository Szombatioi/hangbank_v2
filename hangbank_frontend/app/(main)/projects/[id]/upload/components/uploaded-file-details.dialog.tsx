"use client";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  captionSx,
  fieldLabelSx,
  HEADLINE,
  LABEL,
  textFieldSx,
} from "@/app/components/style-constants";
import { Severity, useSnackbar } from "@/app/providers/SnackbarProvider";

export interface AudioFileDetailsView {
  filename: string;
  type: string;
  originalSamplingRate?: number | null;
  isMasterPrompt?: boolean;
  transcription: string;
  emotion: string;
}

interface UploadedFileDetailsDialogProps {
  file: AudioFileDetailsView | null;
  canTranscribe: boolean;
  transcriptionRequested: boolean;
  onTranscribe: () => void;
  onSave: (changes: { transcription: string; emotion: string }) => void;
  onClose: () => void;
}


const metaValueSx = {
  fontFamily: LABEL,
  fontWeight: 700,
  color: "var(--app-text-primary)",
} as const;



const buttonSx = {
  fontFamily: LABEL,
  fontWeight: 700,
  fontSize: "0.75rem",
  textTransform: "none",
  borderRadius: 1.5,
} as const;

export default function UploadedFileDetailsDialog({
  file,
  canTranscribe,
  transcriptionRequested,
  onTranscribe,
  onSave,
  onClose,
}: UploadedFileDetailsDialogProps) {
  const { t } = useTranslation("common");
  const { showMessage } = useSnackbar();

  const [transcription, setTranscription] = useState(file?.transcription ?? "");
  const [emotion, setEmotion] = useState(file?.emotion ?? "");

  const handleTranscribe = () => {
    if (!file) return;
    //TODO: call the transcription endpoint once it exists
    onTranscribe();
    showMessage(t("uploaded_file_details.transcribe_sent"), Severity.info);
  };

  const handleSave = () => {
    if (!file) return;
    const changed =
      transcription !== file.transcription || emotion !== file.emotion;
    if (changed) onSave({ transcription, emotion });
    onClose();
  };

  return (
    <Dialog
      open={!!file}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle
        sx={{
          fontFamily: HEADLINE,
          fontWeight: 700,
          fontSize: "1.1rem",
          color: "var(--app-text-primary)",
          wordBreak: "break-all",
          display: "flex",
          alignItems: "center",
          gap: 1.5,
        }}
      >
        {file?.filename}
        {file?.isMasterPrompt && (
          <Chip
            size="small"
            label={t("uploaded_file.master_tooltip")}
            sx={{
              fontFamily: LABEL,
              fontWeight: 700,
              fontSize: "0.65rem",
              bgcolor: "#fdf5e7",
              color: "#603e11",
            }}
          />
        )}
      </DialogTitle>

      <DialogContent
        sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 1 }}
      >
        {/* Existing details */}
        <Box sx={{ display: "flex", gap: 4 }}>
          <Box>
            <Typography sx={captionSx}>
              {t("uploaded_file_details.label_type")}
            </Typography>
            <Typography sx={{ ...metaValueSx, textTransform: "uppercase" }}>
              {file?.type}
            </Typography>
          </Box>
          {file?.originalSamplingRate != null && (
            <Box>
              <Typography sx={captionSx}>
                {t("uploaded_file_details.label_sampling_rate")}
              </Typography>
              <Typography sx={metaValueSx}>
                {`${file.originalSamplingRate / 1000} kHz`}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Transcription */}
        <Box>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Typography variant="h6" sx={fieldLabelSx} color="primary">
              {t("uploaded_file_details.label_transcription")}
            </Typography>
            <Tooltip
              title={
                canTranscribe
                  ? ""
                  : t("uploaded_file_details.transcribe_after_save")
              }
            >
              <span>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleTranscribe}
                  disabled={!canTranscribe || transcriptionRequested}
                  sx={{ ...buttonSx, mb: 0.75 }}
                >
                  {t("uploaded_file_details.transcribe")}
                </Button>
              </span>
            </Tooltip>
          </Box>
          <TextField
            value={transcription}
            onChange={(e) => setTranscription(e.target.value)}
            placeholder={t("uploaded_file_details.placeholder_transcription")}
            fullWidth
            multiline
            minRows={4}
            sx={textFieldSx}
          />
        </Box>

        {/* Emotion */}
        <Box>
          <Typography variant="h6" sx={fieldLabelSx} color="primary">
            {t("uploaded_file_details.label_emotion")}
          </Typography>
          <TextField
            value={emotion}
            onChange={(e) => setEmotion(e.target.value)}
            fullWidth
            sx={textFieldSx}
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button
          onClick={onClose}
          sx={{ ...buttonSx, color: "var(--app-text-muted)" }}
        >
          {t("confirm_dialog.cancel")}
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          sx={{
            ...buttonSx,
            bgcolor: "var(--app-btn)",
            "&:hover": { bgcolor: "var(--app-btn-hover)" },
          }}
        >
          {t("uploaded_file_details.save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
