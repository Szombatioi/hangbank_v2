"use client";
//TODO: add bitdepth settings
//TODO: recommend max OS sample rate for mic
import {
  Box,
  Button,
  CircularProgress,
  FormHelperText,
  IconButton,
  Paper,
  Stack,
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
import { CorpusPickerDialog } from "./components/corpus-picker-dialog";
import { useAuth } from "@/app/contexts/auth-context";
import { translateHttpError } from "@/app/components/helpers/http-error";
import { SamplingRateSelect } from "./components/sampling-rate-select";
import { AudioChecksSelect } from "./components/audio-checks-select";
import { MicrophoneSelect } from "./components/microphone-select";
import { SpeakerInfoPaper } from "./components/speaker-info-paper";
import {
  ProjectMember,
  ProjectMembersPaper,
} from "./components/project-members-paper";
import {
  ProjectRole,
  PROJECT_ROLES,
  HEADLINE,
  LABEL,
  BODY,
  SAMPLING_RATES,
} from "./constants";

export type { ProjectRole };
export { PROJECT_ROLES, HEADLINE, LABEL, BODY, SAMPLING_RATES };

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

  const [selectedMic, setSelectedMic] = useState<MediaDeviceInfo | null>(null);

  const [recordingEnvorinment, setRecordingEnvironment] = useState<
    string | null
  >(null);

  const [audioChecks, setAudioChecks] = useState<string[]>([]);

  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);

  const errors = {
    name: !name.trim(),
    samplingRate: samplingRate === "",
    microphone: !selectedMic,
    corpus: !selectedCorpusId,
  };
  const hasErrors = Object.values(errors).some(Boolean);

  useEffect(() => {
    const loadCorpora = async () => {
      try {
        const res = await api.get<CorpusDto[]>("/corpus");
        setCorpora(res.data);
      } catch (err) {
        showMessage(
          translateHttpError(err, t, t("new_project.corpus_based.error_load_corpora")),
          Severity.error,
        );
      } finally {
        setCorporaLoading(false);
      }
    };
    loadCorpora();
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
        audioChecks: audioChecks,
        members: projectMembers.map((m) => ({ userId: m.user.id, role: m.role })),
      });
      showMessage(t("new_project.common.success"), Severity.success);

      //TODO: redirect to the new project!
      console.log(res.data.id);
      router.push("/projects");
    } catch (err) {
      showMessage(
        translateHttpError(err, t, t("new_project.common.error_create")),
        Severity.error,
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: "95%",
        mx: "auto",
        px: { xs: 2 },
        py: 4,
        overflowY: "auto",
        maxHeight: "100vh",
      }}
    >
      {/* Header */}
      <Box sx={{ mb: 4, px: 2 }}>
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
        <Typography
          sx={{
            fontFamily: BODY,
            fontSize: "1rem",
            color: "var(--app-text-muted)",
            mt: 0.5,
          }}
        >
          {t("new_project.corpus_based.subtitle")}
        </Typography>
      </Box>

      <Stack spacing={2} direction={{ xs: "column", md: "row" }}>
        {/* Left side: main area */}
        <Box>
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
              sx={{
                fontFamily: LABEL,
                fontWeight: 700,
                letterSpacing: "0.12em",
                color: "text.secondary",
              }}
            >
              {t("new_project.common.section_details")}
            </Typography>

            {/* Name */}
            <Box>
              <Typography
                variant="h6"
                sx={{
                  fontFamily: LABEL,
                  textTransform: "capitalize",
                  mb: 0.75,
                }}
                color="primary"
              >
                {t("new_project.common.label_name")}
              </Typography>
              <TextField
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("new_project.corpus_based.placeholder_name")}
                fullWidth
                error={submitted && errors.name}
                helperText={
                  submitted && errors.name
                    ? t("new_project.common.error_name_required")
                    : undefined
                }
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "8px",
                    bgcolor: "var(--app-card)",
                  },
                }}
              />
            </Box>

            {/* Description */}
            <Box>
              <Typography
                variant="h6"
                sx={{
                  fontFamily: LABEL,
                  textTransform: "capitalize",
                  mb: 0.75,
                }}
                color="primary"
              >
                {t("new_project.common.label_description")}
              </Typography>
              <TextField
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t(
                  "new_project.common.placeholder_description"
                )}
                fullWidth
                multiline
                rows={3}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "8px",
                    bgcolor: "var(--app-card)",
                  },
                }}
              />
            </Box>

            {/* Microphone */}
            <MicrophoneSelect
              value={selectedMic}
              onChange={setSelectedMic}
              error={submitted && errors.microphone}
              onRecommendedSamplingRate={setSamplingRate}
            />
            {/* Sampling rate */}
            <SamplingRateSelect
              value={samplingRate}
              onChange={setSamplingRate}
              disabled={selectedMic === null}
              error={submitted && errors.samplingRate}
            />

            {/* Recording environment */}
            <Box>
              <Typography
                variant="h6"
                sx={{
                  fontFamily: LABEL,
                  textTransform: "capitalize",
                  mb: 0.75,
                }}
                color="primary"
              >
                {t("new_project.common.recording_environment")}
              </Typography>
              <TextField
                value={recordingEnvorinment ?? ""}
                onChange={(e) => setRecordingEnvironment(e.target.value)}
                multiline
                rows={3}
                placeholder={t(
                  "new_project.common.recording_environment_placeholder"
                )}
                fullWidth
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "8px",
                    bgcolor: "var(--app-card)",
                  },
                }}
              />
            </Box>

            {/* Audio checks */}
            <AudioChecksSelect value={audioChecks} onChange={setAudioChecks} />
          </Paper>

          {/* TODO Speaker info */}

          {/* Corpus selection */}
          <Paper
            elevation={0}
            sx={{
              bgcolor: "var(--app-surface-muted)",
              borderRadius: 4,
              py: 4,
              px: 4,
              mb: submitted && errors.corpus ? 0.5 : 4,
              outline:
                submitted && errors.corpus
                  ? "2px solid var(--app-error-fg)"
                  : "none",
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
                  sx={{
                    fontFamily: LABEL,
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    color: "text.secondary",
                  }}
                >
                  {t("new_project.corpus_based.section_corpus")}
                </Typography>
                {!selectedCorpus && (
                  <Typography
                    sx={{
                      fontFamily: BODY,
                      fontSize: "0.875rem",
                      color: "var(--app-text-muted)",
                      mt: 0.25,
                    }}
                  >
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
                  "&:hover": {
                    borderColor: "var(--app-text-primary)",
                    color: "var(--app-text-primary)",
                    bgcolor: "transparent",
                  },
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
                  <Typography
                    sx={{
                      fontFamily: LABEL,
                      fontWeight: 700,
                      fontSize: "0.875rem",
                      color: "var(--app-text-primary)",
                    }}
                  >
                    {selectedCorpus.name}
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: BODY,
                      fontSize: "0.75rem",
                      color: "var(--app-text-muted)",
                    }}
                  >
                    {t(`language.${selectedCorpus.language.name}`)}
                    {selectedCorpus.domain
                      ? ` · ${selectedCorpus.domain.name}`
                      : ""}
                  </Typography>
                </Box>
                <IconButton
                  size="small"
                  onClick={() => setSelectedCorpusId(null)}
                  sx={{
                    color: "var(--app-text-faint)",
                    "&:hover": { color: "var(--app-error-fg)" },
                  }}
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
                "&:disabled": {
                  bgcolor: "var(--app-border)",
                  color: "var(--app-text-faint)",
                },
              }}
            >
              {submitting ? (
                <CircularProgress size={20} sx={{ color: "#fff" }} />
              ) : (
                t("new_project.common.create_button")
              )}
            </Button>
          </Box>
        </Box>

        {/* Right side: visibility */}
        <Box width={"60%"}>
          <SpeakerInfoPaper
            speaker={user}
            speechDescription={speechDescription}
            onSpeechDescriptionChange={setSpeechDescription}
          />

          <ProjectMembersPaper
            members={projectMembers}
            onChange={setProjectMembers}
          />
        </Box>
      </Stack>

      {/* Corpus picker dialog */}
      <CorpusPickerDialog
        open={dialogOpen}
        corpora={corpora}
        loading={corporaLoading}
        selectedCorpusId={selectedCorpusId}
        onSelect={(id) => setSelectedCorpusId(id)}
        onClose={() => setDialogOpen(false)}
        onUpload={() => {
          setDialogOpen(false);
          router.push("/library/upload");
        }}
        t={t}
      />
    </Box>
  );
}
