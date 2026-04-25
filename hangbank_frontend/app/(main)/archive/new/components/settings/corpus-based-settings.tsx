"use client";

import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  TextField,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AlbumIcon from "@mui/icons-material/Album";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import LibraryMusicOutlinedIcon from "@mui/icons-material/LibraryMusicOutlined";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "@/app/axios";
import { CorpusDto } from "@/app/components/types/corpus.dto";
import { useRouter } from "next/navigation";
import { useSnackbar, Severity } from "@/app/contexts/SnackbarProvider";

const HEADLINE = "'Space Grotesk', sans-serif";
const LABEL = "'Manrope', sans-serif";
const BODY = "'Inter', sans-serif";

const SAMPLING_RATES: { value: number; label: string }[] = [
  { value: 8000,  label: "8,000 Hz" },
  { value: 16000, label: "16,000 Hz" },
  { value: 24000, label: "24,000 Hz" },
  { value: 32000, label: "32,000 Hz" },
  { value: 44100, label: "44,100 Hz" },
  { value: 48000, label: "48,000 Hz" },
];

// ── Corpus dialog row ─────────────────────────────────────────────────────────

function CorpusRow({
  corpus,
  selected,
  onSelect,
  onPreview,
  t,
}: {
  corpus: CorpusDto;
  selected: boolean;
  onSelect: () => void;
  onPreview: () => void;
  t: (k: string) => string;
}) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 2,
        px: 2,
        py: 1.75,
        borderRadius: 3,
        border: "1.5px solid",
        borderColor: selected ? "#191c1d" : "transparent",
        bgcolor: selected ? "#f0f0f0" : "transparent",
        transition: "all 0.15s",
        "&:hover": { bgcolor: selected ? "#f0f0f0" : "#f4f4f5" },
      }}
    >
      {/* Icon */}
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: 2,
          bgcolor: selected ? "#191c1d" : "#e7e8e9",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          transition: "background-color 0.15s",
        }}
      >
        <AlbumIcon sx={{ fontSize: "1.2rem", color: selected ? "#fff" : "#94a3b8" }} />
      </Box>

      {/* Info */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          sx={{
            fontFamily: LABEL,
            fontWeight: 700,
            fontSize: "0.875rem",
            color: "#0f172a",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {corpus.name}
        </Typography>
        <Typography sx={{ fontFamily: BODY, fontSize: "0.75rem", color: "#64748b" }}>
          {t(`language.${corpus.language.name}`)}
          {corpus.domain ? ` · ${corpus.domain.name}` : ""}
        </Typography>
      </Box>

      {/* Actions */}
      <Box sx={{ display: "flex", gap: 1, flexShrink: 0 }}>
        <Button
          size="small"
          variant="text"
          startIcon={<OpenInNewIcon sx={{ fontSize: "0.875rem !important" }} />}
          onClick={(e) => { e.stopPropagation(); onPreview(); }}
          sx={{
            fontFamily: LABEL,
            fontWeight: 600,
            fontSize: "0.75rem",
            textTransform: "none",
            color: "#64748b",
            "&:hover": { color: "#0f172a", bgcolor: "transparent" },
          }}
        >
          {t("new_project.corpus_based.dialog_preview")}
        </Button>

        <Button
          size="small"
          variant={selected ? "contained" : "outlined"}
          startIcon={selected ? <CheckCircleOutlineIcon sx={{ fontSize: "0.875rem !important" }} /> : undefined}
          onClick={(e) => { e.stopPropagation(); onSelect(); }}
          sx={
            selected
              ? {
                  fontFamily: LABEL,
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  textTransform: "none",
                  bgcolor: "#191c1d",
                  color: "#fff",
                  borderRadius: 2,
                  "&:hover": { bgcolor: "#0f172a" },
                }
              : {
                  fontFamily: LABEL,
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  textTransform: "none",
                  borderColor: "#cbd5e1",
                  color: "#334155",
                  borderRadius: 2,
                  "&:hover": { borderColor: "#191c1d", color: "#191c1d", bgcolor: "transparent" },
                }
          }
        >
          {selected
            ? t("new_project.corpus_based.dialog_selected")
            : t("new_project.corpus_based.dialog_select")}
        </Button>
      </Box>
    </Box>
  );
}

// ── Corpus picker dialog ──────────────────────────────────────────────────────

function CorpusPickerDialog({
  open,
  corpora,
  loading,
  selectedCorpusId,
  onSelect,
  onClose,
  onUpload,
  t,
  router,
}: {
  open: boolean;
  corpora: CorpusDto[];
  loading: boolean;
  selectedCorpusId: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
  onUpload: () => void;
  t: (k: string) => string;
  router: ReturnType<typeof useRouter>;
}) {
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
                onPreview={() => router.push(`/library/${corpus.id}`)}
                t={t}
              />
            ))}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CorpusBasedSettings() {
  const { t } = useTranslation("common");
  const { showMessage } = useSnackbar();
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [samplingRate, setSamplingRate] = useState<number | "">("");

  const [corpora, setCorpora] = useState<CorpusDto[]>([]);
  const [corporaLoading, setCorporaLoading] = useState(true);
  const [selectedCorpusId, setSelectedCorpusId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const selectedCorpus = corpora.find((c) => c.id === selectedCorpusId) ?? null;

  useEffect(() => {
    api
      .get<CorpusDto[]>("/corpus")
      .then((res) => setCorpora(res.data))
      .catch(() => showMessage(t("new_project.corpus_based.error_load_corpora"), Severity.error))
      .finally(() => setCorporaLoading(false));
  }, []);

  const handleCreate = async () => {
    if (!name.trim() || !selectedCorpusId) return;
    setSubmitting(true);
    try {
      await api.post("/project", {
        name: name.trim(),
        description: description.trim(),
        samplingRate: samplingRate || undefined,
        corpusId: selectedCorpusId,
        type: "corpus",
      });
      showMessage(t("new_project.corpus_based.success"), Severity.success);
      router.push("/archive");
    } catch {
      showMessage(t("new_project.corpus_based.error_create"), Severity.error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: 860,
        mx: "auto",
        px: { xs: 2, md: 4 },
        py: 4,
        overflowY: "auto",
        maxHeight: "100vh",
      }}
    >
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography
          sx={{
            fontFamily: HEADLINE,
            fontSize: { xs: "1.75rem", md: "2.25rem" },
            fontWeight: 700,
            letterSpacing: "-0.03em",
            color: "#0f172a",
          }}
        >
          {t("new_project.corpus_based.title")}
        </Typography>
        <Typography sx={{ fontFamily: BODY, fontSize: "1rem", color: "#47607e", mt: 0.5 }}>
          {t("new_project.corpus_based.subtitle")}
        </Typography>
      </Box>

      {/* Project details */}
      <Paper
        elevation={0}
        sx={{
          bgcolor: "#f3f4f5",
          borderRadius: 4,
          py: 4,
          px: 4,
          mb: 3,
          display: "flex",
          flexDirection: "column",
          gap: 2.5,
        }}
      >
        <Typography
          variant="overline"
          sx={{ fontFamily: LABEL, fontWeight: 700, letterSpacing: "0.12em", color: "text.secondary" }}
        >
          {t("new_project.corpus_based.section_details")}
        </Typography>

        {/* Name */}
        <Box>
          <Typography variant="h6" sx={{ fontFamily: LABEL, textTransform: "capitalize", mb: 0.75 }} color="primary">
            {t("new_project.corpus_based.label_name")}
          </Typography>
          <TextField
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("new_project.corpus_based.placeholder_name")}
            fullWidth
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px", bgcolor: "#fff" } }}
          />
        </Box>

        {/* Description */}
        <Box>
          <Typography variant="h6" sx={{ fontFamily: LABEL, textTransform: "capitalize", mb: 0.75 }} color="primary">
            {t("new_project.corpus_based.label_description")}
          </Typography>
          <TextField
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("new_project.corpus_based.placeholder_description")}
            fullWidth
            multiline
            minRows={3}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px", bgcolor: "#fff" } }}
          />
        </Box>

        {/* Sampling rate */}
        <Box>
          <Typography variant="h6" sx={{ fontFamily: LABEL, textTransform: "capitalize", mb: 0.75 }} color="primary">
            {t("new_project.corpus_based.label_sampling_rate")}
          </Typography>
          <Select
            value={samplingRate}
            onChange={(e: SelectChangeEvent<number | "">) =>
              setSamplingRate(e.target.value as number | "")
            }
            fullWidth
            displayEmpty
            sx={{ borderRadius: "8px", bgcolor: "#fff" }}
            renderValue={(val) =>
              val === ""
                ? <em style={{ color: "#aaa", fontStyle: "normal" }}>
                    {t("new_project.corpus_based.placeholder_sampling_rate")}
                  </em>
                : SAMPLING_RATES.find((r) => r.value === val)?.label ?? String(val)
            }
          >
            {SAMPLING_RATES.map((rate) => (
              <MenuItem key={rate.value} value={rate.value}>
                {rate.label}
              </MenuItem>
            ))}
          </Select>
        </Box>
      </Paper>

      {/* Corpus selection */}
      <Paper
        elevation={0}
        sx={{ bgcolor: "#f3f4f5", borderRadius: 4, py: 4, px: 4, mb: 4 }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: selectedCorpus ? 2 : 0,
          }}
        >
          <Box>
            <Typography
              variant="overline"
              sx={{ fontFamily: LABEL, fontWeight: 700, letterSpacing: "0.12em", color: "text.secondary" }}
            >
              {t("new_project.corpus_based.section_corpus")}
            </Typography>
            {!selectedCorpus && (
              <Typography sx={{ fontFamily: BODY, fontSize: "0.875rem", color: "#64748b", mt: 0.25 }}>
                {t("new_project.corpus_based.corpus_hint")}
              </Typography>
            )}
          </Box>

          <Button
            variant="outlined"
            startIcon={<LibraryMusicOutlinedIcon />}
            onClick={() => setDialogOpen(true)}
            sx={{
              fontFamily: LABEL,
              fontWeight: 700,
              fontSize: "0.8rem",
              textTransform: "none",
              borderRadius: 2,
              borderColor: "#cbd5e1",
              color: "#334155",
              "&:hover": { borderColor: "#191c1d", color: "#191c1d", bgcolor: "transparent" },
            }}
          >
            {selectedCorpus
              ? t("new_project.corpus_based.change_corpus")
              : t("new_project.corpus_based.browse_corpus")}
          </Button>
        </Box>

        {/* Selected corpus preview */}
        {selectedCorpus && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              p: 2,
              borderRadius: 3,
              border: "1.5px solid #191c1d",
              bgcolor: "#f0f0f0",
            }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                bgcolor: "#191c1d",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <AlbumIcon sx={{ fontSize: "1.2rem", color: "#fff" }} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontFamily: LABEL, fontWeight: 700, fontSize: "0.875rem", color: "#0f172a" }}>
                {selectedCorpus.name}
              </Typography>
              <Typography sx={{ fontFamily: BODY, fontSize: "0.75rem", color: "#64748b" }}>
                {t(`language.${selectedCorpus.language.name}`)}
                {selectedCorpus.domain ? ` · ${selectedCorpus.domain.name}` : ""}
              </Typography>
            </Box>
            <IconButton
              size="small"
              onClick={() => setSelectedCorpusId(null)}
              sx={{ color: "#94a3b8", "&:hover": { color: "#ef4444" } }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        )}
      </Paper>

      {/* Submit */}
      <Box sx={{ display: "flex", justifyContent: "center" }}>
        <Button
          variant="contained"
          disabled={!name.trim() || !selectedCorpusId || submitting}
          onClick={handleCreate}
          sx={{
            bgcolor: "#191c1d",
            color: "#fff",
            borderRadius: 3,
            py: 1.5,
            px: 6,
            fontFamily: LABEL,
            fontWeight: 700,
            fontSize: "0.95rem",
            textTransform: "none",
            "&:hover": { bgcolor: "#0f172a" },
            "&:disabled": { bgcolor: "#e2e8f0", color: "#94a3b8" },
          }}
        >
          {submitting ? (
            <CircularProgress size={20} sx={{ color: "#fff" }} />
          ) : (
            t("new_project.corpus_based.create_button")
          )}
        </Button>
      </Box>

      {/* Corpus picker dialog */}
      <CorpusPickerDialog
        open={dialogOpen}
        corpora={corpora}
        loading={corporaLoading}
        selectedCorpusId={selectedCorpusId}
        onSelect={(id) => setSelectedCorpusId(id)}
        onClose={() => setDialogOpen(false)}
        onUpload={() => { setDialogOpen(false); router.push("/library/upload"); }}
        t={t}
        router={router}
      />
    </Box>
  );
}
