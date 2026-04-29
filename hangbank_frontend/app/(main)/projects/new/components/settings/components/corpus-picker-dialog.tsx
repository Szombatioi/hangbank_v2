"use client";

import { CorpusDto } from "@/app/components/types/corpus.dto";
import { Dialog, DialogTitle, IconButton, Divider, DialogContent, Box, CircularProgress, Typography, Button } from "@mui/material";
import { HEADLINE, BODY, LABEL } from "../corpus-based-settings";
import { CorpusRow } from "./corpus-row";
import CloseIcon from "@mui/icons-material/Close";
import AlbumIcon from "@mui/icons-material/Album";
import { useRouter } from "next/navigation";

export function CorpusPickerDialog({
  open,
  corpora,
  loading,
  selectedCorpusId,
  onSelect,
  onClose,
  onUpload,
  t,
}: {
  open: boolean;
  corpora: CorpusDto[];
  loading: boolean;
  selectedCorpusId: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
  onUpload: () => void;
  t: (k: string) => string;
}) {

  const router = useRouter();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{ sx: { borderRadius: 4, overflow: "hidden" } }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          py: 2.5,
          px: 3,
          fontFamily: HEADLINE,
          fontWeight: 700,
          fontSize: "1.125rem",
          color: "#0f172a",
        }}
      >
        {t("new_project.corpus_based.dialog_title")}
        <IconButton onClick={onClose} size="small" sx={{ color: "#94a3b8" }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ px: 3, py: 2.5 }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress size={28} />
          </Box>
        ) : corpora.length === 0 ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1.5,
              py: 6,
              border: "2px dashed #e2e8f0",
              borderRadius: 3,
            }}
          >
            <AlbumIcon sx={{ fontSize: "2.5rem", color: "#cbd5e1" }} />
            <Typography sx={{ fontFamily: BODY, fontSize: "0.875rem", color: "#94a3b8" }}>
              {t("new_project.corpus_based.no_corpora")}
            </Typography>
            <Button
              size="small"
              variant="text"
              onClick={onUpload}
              sx={{ fontFamily: LABEL, fontWeight: 700, fontSize: "0.75rem", textTransform: "none", color: "#191c1d" }}
            >
              {t("new_project.corpus_based.upload_corpus_link")}
            </Button>
          </Box>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            {corpora.map((corpus) => (
              <CorpusRow
                key={corpus.id}
                corpus={corpus}
                selected={selectedCorpusId === corpus.id}
                onSelect={() => {
                  onSelect(corpus.id);
                  onClose();
                }}
                onPreview={() => window.open(`/library/${corpus.id}`, '_blank')}
                t={t}
              />
            ))}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}