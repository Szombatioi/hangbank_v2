import api from "@/app/axios";
import { translateHttpError } from "@/app/components/helpers/http-error";
import { useAuth } from "@/app/contexts/auth-context";
import { useSnackbar, Severity } from "@/app/providers/SnackbarProvider";
import {
  Box,
  Typography,
  Stack,
  Paper,
  TextField,
  Button,
  CircularProgress,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AudioChecksSelect } from "./components/audio-checks-select";
import { MicrophoneSelect } from "./components/microphone-select";
import { SpeakerInfoPaper } from "./components/speaker-info-paper";
import {
  ProjectMember,
  ProjectMembersPaper,
} from "./components/project-members-paper";
import { SamplingRateSelect } from "./components/sampling-rate-select";
import { HEADLINE, BODY, LABEL } from "./constants";
import { LanguageDto } from "@/app/components/types/language.dto";
import LanguageSelect from "@/app/components/language-select";
import { fieldLabelSx } from "@/app/components/style-constants";
import { lockfileTryAcquire } from "next/dist/build/swc/generated-native";

export default function AIChatSettings() {
  const { t } = useTranslation("common");
  const { showMessage } = useSnackbar();
  const router = useRouter();
  const { user } = useAuth();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [samplingRate, setSamplingRate] = useState<number | "">("");
  const [speechDescription, setSpeechDescription] = useState("");

  const [useAutomaticTranscription, setUseAutomaticTranscription] =
    useState(true);
  const [transcriptionLanguage, setTranscriptionLanguage] =
    useState<LanguageDto | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [selectedMic, setSelectedMic] = useState<MediaDeviceInfo | null>(null);

  const [recordingEnvorinment, setRecordingEnvironment] = useState<
    string | null
  >(null);

  const [audioChecks, setAudioChecks] = useState<string[]>([]);

  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);

  const [apiKeyPresent, setApiKeyPresent] = useState(false);

  //Check if API Key present
  useEffect(() => {
    setApiKeyPresent(localStorage.getItem("apiKeyPresent") === "true");
  }, []);

  const errors = {
    name: !name.trim(),
    samplingRate: samplingRate === "",
    microphone: !selectedMic,
    transcriptionLanguage: !transcriptionLanguage,
  };
  const hasErrors = Object.values(errors).some(Boolean);

  const handleCreate = async () => {
    setSubmitted(true);
    if (hasErrors) return;
    setSubmitting(true);
    try {
      const res = await api.post("/ai-chat-project/project", {
        projectName: name.trim(),
        description: description.trim() || undefined,
        samplingRate: samplingRate as number,
        recordingEnvironment: recordingEnvorinment?.trim() || undefined,
        speaker: {
          speechCharacteristics: speechDescription.trim() || undefined,
        },
        microphoneLabel: selectedMic!.label,
        audioChecks: audioChecks,
        members: projectMembers.map((m) => ({
          userId: m.user.id,
          role: m.role,
        })),
      });
      showMessage(t("new_project.common.success"), Severity.success);

      //TODO: redirect to the new project!
      console.log(res.data.id);
      router.push("/projects");
    } catch (err) {
      showMessage(
        translateHttpError(err, t, t("new_project.common.error_create")),
        Severity.error
      );
    } finally {
      setSubmitting(false);
    }
  };

  if(!apiKeyPresent){
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
        <Typography
          sx={{
            fontFamily: HEADLINE,
            fontSize: { xs: "1.75rem", md: "2.25rem" },
            fontWeight: 700,
            letterSpacing: "-0.03em",
            textAlign: "center",
            color: "var(--app-text-primary)",
          }}
        >
          {t("new_project.ai_chat.error_no_api_key")}
        </Typography>
      </Box>
    );
  }

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
          {t("new_project.ai_chat.title")}
        </Typography>
        <Typography
          sx={{
            fontFamily: BODY,
            fontSize: "1rem",
            color: "var(--app-text-muted)",
            mt: 0.5,
          }}
        >
          {t("new_project.ai_chat.subtitle")}
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
                placeholder={t("new_project.ai_chat.placeholder_name")}
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
                placeholder={t("new_project.common.placeholder_description")}
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

            {/* Transcription language */}
            <Box>
              <Typography variant="h6" sx={fieldLabelSx} color="primary">
                {t("new_project.common.label_transcription_language")}
              </Typography>
              <LanguageSelect
                value={transcriptionLanguage?.code ?? null}
                onChange={setTranscriptionLanguage}
                defaultCode="en-US"
                background="var(--app-card)"
                error={submitted && errors.transcriptionLanguage}
                helperText={
                  submitted && errors.transcriptionLanguage
                    ? t(
                        "new_project.common.error_transcription_language_required"
                      )
                    : undefined
                }
              />
            </Box>

            {/* Automatic transcription */}
            <Box>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={useAutomaticTranscription}
                    onChange={(e) =>
                      setUseAutomaticTranscription(e.target.checked)
                    }
                  />
                }
                label={t("new_project.common.label_automatic_transcription")}
                sx={{
                  mb: 1,
                  "& .MuiFormControlLabel-label": { fontFamily: LABEL },
                }}
              />
            </Box>
          </Paper>

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
    </Box>
  );
}
