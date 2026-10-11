"use client";
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "@/app/axios";
import { useRouter } from "next/navigation";
import { useSnackbar, Severity } from "@/app/providers/SnackbarProvider";
import { useAuth } from "@/app/contexts/auth-context";
import { AccessUser } from "@/app/components/user-access-selector";
import { translateHttpError } from "@/app/components/helpers/http-error";
import { HEADLINE, LABEL, BODY } from "./constants";
import {
  fieldLabelSx,
  paperSx,
  sectionTitleSx,
  textFieldSx,
} from "@/app/components/style-constants";
import LanguageSelect from "@/app/components/language-select";
import { LanguageDto } from "@/app/components/types/language.dto";
import { SamplingRateSelect } from "./components/sampling-rate-select";
import { AudioChecksSelect } from "./components/audio-checks-select";
import { SpeakerInfoPaper } from "./components/speaker-info-paper";
import {
  ProjectMember,
  ProjectMembersPaper,
} from "./components/project-members-paper";

export default function ExistingFilesSettings() {
  const { t } = useTranslation("common");
  const { showMessage } = useSnackbar();
  const router = useRouter();
  const { user } = useAuth();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [useAutomaticTranscription, setUseAutomaticTranscription] =
    useState(false);
  const [transcriptionLanguage, setTranscriptionLanguage] =
    useState<LanguageDto | null>(null);
  const [resample, setResample] = useState(false);
  const [samplingRate, setSamplingRate] = useState<number | "">("");
  const [recordingEnvironment, setRecordingEnvironment] = useState("");
  const [audioChecks, setAudioChecks] = useState<string[]>([]);

  const [speaker, setSpeaker] = useState<AccessUser | null>(null);
  const [speechDescription, setSpeechDescription] = useState("");

  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (user) setSpeaker((prev) => prev ?? user);
  }, [user]);

  const selectSpeaker = (next: AccessUser | null) => {
    setSpeaker(next);
    if (!next) return;
    setProjectMembers((prev) => prev.filter((m) => m.user.id !== next.id));
  };

  
  const speakerId = speaker?.id;
  const speakerNeedsProfile = !!speaker && speaker.birthDate === undefined && speaker.gender === undefined;
  useEffect(() => {
    if (!speakerId || !speakerNeedsProfile) return;
    let ignore = false;

    const loadSpeakerProfile = async () => {
      try {
        const { data } = await api.get<AccessUser>(
          `/user/${speakerId}/speaker-profile`
        );
        if (ignore) return;
        setSpeaker((prev) =>
          prev?.id === speakerId
            ? {
                ...prev,
                gender: data.gender ?? null,
                birthDate: data.birthDate ?? null,
              }
            : prev
        );
      } catch {
        if (ignore) return;
        setSpeaker((prev) =>
          prev?.id === speakerId
            ? { ...prev, gender: null, birthDate: null }
            : prev
        );
      }
    };

    void loadSpeakerProfile();
    return () => {
      ignore = true;
    };
  }, [speakerId, speakerNeedsProfile]);

  const errors = {
    name: !name.trim(),
    samplingRate: resample && samplingRate === "",
    speaker: !speaker,
    transcriptionLanguage: !transcriptionLanguage,
  };
  const hasErrors = Object.values(errors).some(Boolean);

  // The creator is the Owner, so the Editor chip only applies to someone else.
  const speakerIsEditor = !!speaker && speaker.id !== user?.id;

  const handleCreate = async () => {
    setSubmitted(true);
    if (hasErrors) return;
    setSubmitting(true);
    try {
      await api.post("/existing-audio-project/project", {
        projectName: name.trim(),
        description: description.trim() || undefined,
        samplingRate: resample ? (samplingRate as number) : undefined,
        recordingEnvironment: recordingEnvironment.trim() || undefined,
        audioChecks,
        useAutomaticTranscription,
        transcriptionLanguageCode: transcriptionLanguage!.code,
        speaker: {
          userId: speaker!.id,
          speechCharacteristics: speechDescription.trim() || undefined,
        },
        members: projectMembers.map((m) => ({
          userId: m.user.id,
          role: m.role,
        })),
      });
      showMessage(t("new_project.common.success"), Severity.success);
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
          {t("new_project.existing_files.title")}
        </Typography>
        <Typography
          sx={{
            fontFamily: BODY,
            fontSize: "1rem",
            color: "var(--app-text-muted)",
            mt: 0.5,
          }}
        >
          {t("new_project.existing_files.subtitle")}
        </Typography>
      </Box>

      <Stack spacing={2} direction={{ xs: "column", md: "row" }}>
        {/* Left side: project details */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Paper elevation={0} sx={{ ...paperSx, gap: 2.5 }}>
            <Typography variant="overline" sx={sectionTitleSx}>
              {t("new_project.common.section_details")}
            </Typography>

            {/* Name */}
            <Box>
              <Typography variant="h6" sx={fieldLabelSx} color="primary">
                {t("new_project.common.label_name")}
              </Typography>
              <TextField
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("new_project.existing_files.placeholder_name")}
                fullWidth
                error={submitted && errors.name}
                helperText={
                  submitted && errors.name
                    ? t("new_project.common.error_name_required")
                    : undefined
                }
                sx={textFieldSx}
              />
            </Box>

            {/* Description */}
            <Box>
              <Typography variant="h6" sx={fieldLabelSx} color="primary">
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
                sx={textFieldSx}
              />
            </Box>

            {/* Sampling rate */}
            <Box>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={resample}
                    onChange={(e) => setResample(e.target.checked)}
                  />
                }
                label={t("new_project.existing_files.label_resample")}
                sx={{
                  mb: 1,
                  "& .MuiFormControlLabel-label": { fontFamily: LABEL },
                }}
              />
              <SamplingRateSelect
                value={samplingRate}
                onChange={setSamplingRate}
                disabled={!resample}
                error={submitted && errors.samplingRate}
                explanation={t(
                  "new_project.existing_files.sampling_rate_explanation"
                )}
              />
            </Box>

            {/* Recording environment */}
            <Box>
              <Typography variant="h6" sx={fieldLabelSx} color="primary">
                {t("new_project.common.recording_environment")}
              </Typography>
              <TextField
                value={recordingEnvironment}
                onChange={(e) => setRecordingEnvironment(e.target.value)}
                multiline
                rows={3}
                placeholder={t(
                  "new_project.common.recording_environment_placeholder"
                )}
                fullWidth
                sx={textFieldSx}
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
                label={t(
                  "new_project.common.label_automatic_transcription"
                )}
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

        {/* Right side */}
        <Box sx={{ flex: 1 }}>
          <SpeakerInfoPaper
            speaker={speaker}
            onSpeakerChange={selectSpeaker}
            speakerError={submitted && errors.speaker}
            speechDescription={speechDescription}
            onSpeechDescriptionChange={setSpeechDescription}
          />

          <ProjectMembersPaper
            members={projectMembers}
            onChange={setProjectMembers}
            excludeUserIds={speaker ? [speaker.id] : []}
            fixedMembers={
              speakerIsEditor
                ? [
                    {
                      user: speaker!,
                      role: "EDITOR",
                      tag: t("new_project.common.speaker_tag"),
                    },
                  ]
                : []
            }
            hint={
              speakerIsEditor
                ? t("new_project.common.speaker_editor_hint")
                : undefined
            }
          />
        </Box>
      </Stack>
    </Box>
  );
}
