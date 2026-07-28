"use client";
//TODO: add bitdepth settings
//TODO: recommend max OS sample rate for mic
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  FormHelperText,
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
import LibraryMusicOutlinedIcon from "@mui/icons-material/LibraryMusicOutlined";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "@/app/axios";
import { CorpusDto } from "@/app/components/types/corpus.dto";
import { useRouter } from "next/navigation";
import { useSnackbar, Severity } from "@/app/providers/SnackbarProvider";
import { getMicrophones, MicrophoneDetail } from "@/app/components/helpers/get-mics";
import { CorpusRow } from "./components/corpus-row";
import { CorpusPickerDialog } from "./components/corpus-picker-dialog";
import { useAuth } from "@/app/contexts/auth-context";
import { computeAge } from "@/app/components/helpers/compute-age";

export const HEADLINE = "'Space Grotesk', sans-serif";
export const LABEL = "'Manrope', sans-serif";
export const BODY = "'Inter', sans-serif";

const SAMPLING_RATES: { value: number; label: string, recommended: boolean }[] = [
  { value: 8000, label: "8,000 Hz", recommended: false },
  { value: 16000, label: "16,000 Hz", recommended: false },
  { value: 24000, label: "24,000 Hz", recommended: false },
  { value: 32000, label: "32,000 Hz", recommended: false },
  { value: 44100, label: "44,100 Hz", recommended: false },
  { value: 48000, label: "48,000 Hz", recommended: true },
];

export default function CorpusBasedSettings() {
  const { t } = useTranslation("common");
  const { showMessage } = useSnackbar();
  const router = useRouter();
  const { user } = useAuth();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [samplingRate, setSamplingRate] = useState<number | "">("");
  const [speechDescription, setSpeechDescription] = useState("");

  const [corpora, setCorpora] = useState<CorpusDto[]>([]);
  const [corporaLoading, setCorporaLoading] = useState(true);
  const [selectedCorpusId, setSelectedCorpusId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const selectedCorpus = corpora.find((c) => c.id === selectedCorpusId) ?? null;

  const [availableMics, setAvailableMics] = useState<MediaDeviceInfo[] | null>(null);
  const [selectedMic, setSelectedMic] = useState<MediaDeviceInfo | null>(null);

  const [recordingEnvorinment, setRecordingEnvironment] = useState<string | null>(null);

  const errors = {
    name: !name.trim(),
    samplingRate: samplingRate === "",
    microphone: !selectedMic,
    corpus: !selectedCorpusId,
  };
  const hasErrors = Object.values(errors).some(Boolean);

  useEffect(() => {
    async function getMics() {
      const mics = await getMicrophones();
      setAvailableMics(mics); // console.log(availableMics);

      if (mics.length > 0 && !selectedMic) {
        setSelectedMic(mics[0]);

        //Set recommended sample rate (max of this OS/Mic)
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { deviceId: { exact: mics[0].deviceId } }
        });
        const nativeRate = stream.getAudioTracks()[0].getSettings().sampleRate;
        if(!nativeRate) return; //should not happen, but just in case

        const recommendedRate = SAMPLING_RATES.slice().reverse().find(r => r.value <= nativeRate);
        if(recommendedRate) {
          SAMPLING_RATES.find(r => r.value === recommendedRate.value)!.recommended = true;
          setSamplingRate(recommendedRate.value);
        }
      }
    }

    getMics();
  }, []);

  useEffect(() => {
    api
      .get<CorpusDto[]>("/corpus")
      .then((res) => setCorpora(res.data))
      .catch(() => showMessage(t("new_project.corpus_based.error_load_corpora"), Severity.error))
      .finally(() => setCorporaLoading(false));
  }, []);

  const handleCreate = async () => {
    setSubmitted(true);
    if (hasErrors) return;
    setSubmitting(true);
    try {
      const res = await api.post("/project", {
        projectName: name.trim(),
        description: description.trim() || undefined,
        samplingRate: samplingRate as number,
        recordingEnvironment: recordingEnvorinment?.trim() || undefined,
        corpusId: selectedCorpusId,
        speaker: {
          speechCharacteristics: speechDescription.trim() || undefined,
        },
        microphoneLabel: selectedMic?.label,
      });
      showMessage(t("new_project.corpus_based.success"), Severity.success);
      
      //TODO: redirect to the new project!
      console.log(res.data.id);
      router.push("/projects");
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
            color: "var(--app-text-primary)",
          }}
        >
          {t("new_project.corpus_based.title")}
        </Typography>
        <Typography sx={{ fontFamily: BODY, fontSize: "1rem", color: "var(--app-text-muted)", mt: 0.5 }}>
          {t("new_project.corpus_based.subtitle")}
        </Typography>
      </Box>

      {/* Project details */}
      <Paper
        elevation={0}
        sx={{
          bgcolor: "var(--app-surface-muted)",
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
            error={submitted && errors.name}
            helperText={submitted && errors.name ? t("new_project.corpus_based.error_name_required") : undefined}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px", bgcolor: "var(--app-card)" } }}
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
            rows={3}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px", bgcolor: "var(--app-card)" } }}
          />
        </Box>

        {/* Mics */}
        <Box>
          <Typography variant="h6" sx={{ fontFamily: LABEL, textTransform: "capitalize", mb: 0.75 }} color="primary">
            {t("new_project.corpus_based.label_microphone")}
          </Typography>
          <Select
            value={selectedMic?.deviceId || ""}
            onChange={(e: SelectChangeEvent<string>) => {
              const mic = availableMics?.find((m) => m.deviceId === e.target.value);
              if (mic) setSelectedMic(mic);
            }}
            fullWidth
            displayEmpty
            error={submitted && errors.microphone}
            sx={{ borderRadius: "8px", bgcolor: "var(--app-card)" }}
            renderValue={(selectedId) => {
              if (!selectedId) {
                return (
                  <em style={{ color: "#aaa", fontStyle: "normal" }}>
                    {t("microphone_select.placeholder")}
                  </em>
                );
              }
              const mic = availableMics?.find((m) => m.deviceId === selectedId);
              return mic?.label || t("microphone_select.unknown_device");
            }}
          >
            {/* Disabled placeholder option */}
            <MenuItem disabled value="">
              <em>{t("microphone_select.placeholder")}</em>
            </MenuItem>

            {/* Mic List */}
            {availableMics?.map((mic) => (
              <MenuItem key={mic.deviceId} value={mic.deviceId}>
                {mic.label || `${t("microphone_select.default_label")} ${mic.deviceId.substring(0, 5)}`}
              </MenuItem>
            ))}
          </Select>
          {submitted && errors.microphone && (
            <FormHelperText error sx={{ mx: "14px" }}>{t("new_project.corpus_based.error_microphone_required")}</FormHelperText>
          )}
        </Box>
        {/* Sampling rate */}
        <Box>
          <Typography variant="h6" sx={{ fontFamily: LABEL, textTransform: "capitalize", mb: 0.75 }} color="primary">
            {t("new_project.corpus_based.label_sampling_rate")}
          </Typography>
          <Select
            value={samplingRate}
            disabled={selectedMic === null}
            onChange={(e: SelectChangeEvent<number | "">) =>
              setSamplingRate(e.target.value as number | "")
            }
            fullWidth
            displayEmpty
            error={submitted && errors.samplingRate}
            sx={{ borderRadius: "8px", bgcolor: "var(--app-card)" }}
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
                {rate.label}{rate.recommended && ` (${t("recommended")})`}
              </MenuItem>
            ))}
          </Select>
          {submitted && errors.samplingRate
            ? <FormHelperText error sx={{ mx: "14px" }}>{t("new_project.corpus_based.error_sampling_rate_required")}</FormHelperText>
            : <Typography sx={{ mt: 1, ml: 1 }} variant="subtitle2" color="var(--app-text-muted)">{t("sampling_rate_explanation")}</Typography>
          }
        </Box>

        {/* Recording environment */}
        <Box>
          <Typography variant="h6" sx={{ fontFamily: LABEL, textTransform: "capitalize", mb: 0.75 }} color="primary">
            {t("new_project.corpus_based.recording_environment")}
          </Typography>
          <TextField
            value={recordingEnvorinment ?? ""}
            onChange={(e) => setRecordingEnvironment(e.target.value)}
            multiline
            rows={3}
            placeholder={t("new_project.corpus_based.recording_environment_placeholder")}
            fullWidth
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px", bgcolor: "var(--app-card)" } }}
          />
        </Box>

      </Paper>

      {/* Speaker info */}
      <Paper
        elevation={0}
        sx={{
          bgcolor: "var(--app-surface-muted)",
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
          {t("new_project.corpus_based.section_speaker")}
        </Typography>

        <Box sx={{
          flex: "1 1",
          bgcolor: "var(--app-card)",
          borderRadius: 3,
          px: 2.5,
          py: 2,
        }}>
          <Typography
            sx={{ fontFamily: LABEL, fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--app-text-faint)", mb: 0.5 }}
          >
            {t("new_project.corpus_based.label_speaker_name")}
          </Typography>
          <Typography sx={{ fontFamily: LABEL, fontWeight: 700, fontSize: "1.25rem", color: "var(--app-text-primary)" }}>
            {user ? `${user.firstName} ${user.lastName} (${t("you")})` : "—"}
          </Typography>
        </Box>

        {/* Identity row */}
        <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
          {/* Age */}
          <Box
            sx={{
              flex: "1 1 120px",
              bgcolor: "var(--app-card)",
              borderRadius: 3,
              px: 2.5,
              py: 2,
            }}
          >
            <Typography
              sx={{ fontFamily: LABEL, fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--app-text-faint)", mb: 0.5 }}
            >
              {t("new_project.corpus_based.label_age")}
            </Typography>
            <Typography sx={{ fontFamily: LABEL, fontWeight: 700, fontSize: "1.25rem", color: "var(--app-text-primary)" }}>
              {user?.birthDate ? computeAge(user.birthDate) : "—"}
            </Typography>
          </Box>

          {/* Gender */}
          <Box
            sx={{
              flex: "1 1 120px",
              bgcolor: "var(--app-card)",
              borderRadius: 3,
              px: 2.5,
              py: 2,
            }}
          >
            <Typography
              sx={{ fontFamily: LABEL, fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--app-text-faint)", mb: 0.5 }}
            >
              {t("new_project.corpus_based.label_gender")}
            </Typography>
            <Typography sx={{ fontFamily: LABEL, fontWeight: 700, fontSize: "1.25rem", color: "var(--app-text-primary)", textTransform: "capitalize" }}>
              {user?.gender
                ? t(`gender.${user.gender.toLowerCase()}`)
                : "—"}
            </Typography>
          </Box>
        </Box>

        {/* Speech description */}
        <Box>
          <Typography variant="h6" sx={{ fontFamily: LABEL, textTransform: "capitalize", mb: 0.75 }} color="primary">
            {t("new_project.corpus_based.label_speech_description")}
          </Typography>
          <TextField
            value={speechDescription}
            onChange={(e) => setSpeechDescription(e.target.value)}
            placeholder={t("new_project.corpus_based.placeholder_speech_description")}
            fullWidth
            multiline
            rows={3}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px", bgcolor: "var(--app-card)" } }}
          />
        </Box>
      </Paper>

      {/* Corpus selection */}
      <Paper
        elevation={0}
        sx={{
          bgcolor: "var(--app-surface-muted)",
          borderRadius: 4,
          py: 4,
          px: 4,
          mb: submitted && errors.corpus ? 0.5 : 4,
          outline: submitted && errors.corpus ? "2px solid var(--app-error-fg)" : "none",
          outlineOffset: "0px",
        }}
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
              <Typography sx={{ fontFamily: BODY, fontSize: "0.875rem", color: "var(--app-text-muted)", mt: 0.25 }}>
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
              borderColor: "var(--app-border-strong)",
              color: "var(--app-text-body)",
              "&:hover": { borderColor: "var(--app-text-primary)", color: "var(--app-text-primary)", bgcolor: "transparent" },
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
              border: "1.5px solid var(--app-text-primary)",
              bgcolor: "var(--app-bg)",
            }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                bgcolor: "var(--app-btn)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <AlbumIcon sx={{ fontSize: "1.2rem", color: "#fff" }} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontFamily: LABEL, fontWeight: 700, fontSize: "0.875rem", color: "var(--app-text-primary)" }}>
                {selectedCorpus.name}
              </Typography>
              <Typography sx={{ fontFamily: BODY, fontSize: "0.75rem", color: "var(--app-text-muted)" }}>
                {t(`language.${selectedCorpus.language.name}`)}
                {selectedCorpus.domain ? ` · ${selectedCorpus.domain.name}` : ""}
              </Typography>
            </Box>
            <IconButton
              size="small"
              onClick={() => setSelectedCorpusId(null)}
              sx={{ color: "var(--app-text-faint)", "&:hover": { color: "var(--app-error-fg)" } }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        )}
      </Paper>
      {submitted && errors.corpus && (
        <FormHelperText error sx={{ mx: "14px", mb: 3 }}>
          {t("new_project.corpus_based.error_corpus_required")}
        </FormHelperText>
      )}

      {/* Submit */}
      <Box sx={{ display: "flex", justifyContent: "center" }}>
        <Button
          variant="contained"
          disabled={submitting}
          onClick={handleCreate}
          sx={{
            bgcolor: "var(--app-btn)",
            color: "#fff",
            borderRadius: 3,
            py: 1.5,
            px: 6,
            fontFamily: LABEL,
            fontWeight: 700,
            fontSize: "0.95rem",
            textTransform: "none",
            "&:hover": { bgcolor: "var(--app-btn-hover)" },
            "&:disabled": { bgcolor: "var(--app-border)", color: "var(--app-text-faint)" },
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
      />
    </Box>
  );
}
