"use client";
import {
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  FormControlLabel,
  FormHelperText,
  MenuItem,
  Paper,
  Select,
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
import { computeAge } from "@/app/components/helpers/compute-age";
import {
  UserSearchAutocomplete,
  AccessUser,
  fullName,
} from "@/app/components/user-access-selector";
import { translateHttpError } from "@/app/components/helpers/http-error";
import { ProjectRole, PROJECT_ROLES, HEADLINE, LABEL, BODY } from "./constants";
import {
  captionSx,
  fieldLabelSx,
  paperSx,
  sectionTitleSx,
  textFieldSx,
} from "@/app/components/style-constants";
import LanguageSelect from "@/app/components/language-select";
import { LanguageDto } from "@/app/components/types/language.dto";
import { SamplingRateSelect } from "./components/sampling-rate-select";
import { AudioChecksSelect } from "./components/audio-checks-select";

const infoCardSx = {
  bgcolor: "var(--app-card)",
  borderRadius: 3,
  px: 2.5,
  py: 2,
} as const;

const infoValueSx = {
  fontFamily: LABEL,
  fontWeight: 700,
  fontSize: "1.25rem",
  color: "var(--app-text-primary)",
} as const;

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

  const [projectMembers, setProjectMembers] = useState<
    { user: AccessUser; role: ProjectRole }[]
  >([]);
  const [memberUser, setMemberUser] = useState<AccessUser | null>(null);
  const [memberRole, setMemberRole] = useState<ProjectRole>("VIEW");

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (user) setSpeaker((prev) => prev ?? user);
  }, [user]);

  const selectSpeaker = (next: AccessUser | null) => {
    setSpeaker(next);
    if (!next) return;
    setProjectMembers((prev) => prev.filter((m) => m.user.id !== next.id));
    if (memberUser?.id === next.id) setMemberUser(null);
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

  const addMember = () => {
    if (!memberUser) return;
    if (memberUser.id === speaker?.id) return;
    if (projectMembers.some((m) => m.user.id === memberUser.id)) return;
    setProjectMembers((prev) => [
      ...prev,
      { user: memberUser, role: memberRole },
    ]);
    setMemberUser(null);
    setMemberRole("VIEW");
  };

  const removeMember = (id: string) => {
    setProjectMembers((prev) => prev.filter((m) => m.user.id !== id));
  };

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
      showMessage(t("new_project.existing_files.success"), Severity.success);
      router.push("/projects");
    } catch (err) {
      showMessage(
        translateHttpError(err, t, t("new_project.existing_files.error_create")),
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
              {t("new_project.corpus_based.section_details")}
            </Typography>

            {/* Name */}
            <Box>
              <Typography variant="h6" sx={fieldLabelSx} color="primary">
                {t("new_project.corpus_based.label_name")}
              </Typography>
              <TextField
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("new_project.existing_files.placeholder_name")}
                fullWidth
                error={submitted && errors.name}
                helperText={
                  submitted && errors.name
                    ? t("new_project.corpus_based.error_name_required")
                    : undefined
                }
                sx={textFieldSx}
              />
            </Box>

            {/* Description */}
            <Box>
              <Typography variant="h6" sx={fieldLabelSx} color="primary">
                {t("new_project.corpus_based.label_description")}
              </Typography>
              <TextField
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t(
                  "new_project.corpus_based.placeholder_description"
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
                {t("new_project.corpus_based.recording_environment")}
              </Typography>
              <TextField
                value={recordingEnvironment}
                onChange={(e) => setRecordingEnvironment(e.target.value)}
                multiline
                rows={3}
                placeholder={t(
                  "new_project.corpus_based.recording_environment_placeholder"
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
                {t("new_project.existing_files.label_transcription_language")}
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
                        "new_project.existing_files.error_transcription_language_required"
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
                  "new_project.existing_files.label_automatic_transcription"
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
                t("new_project.corpus_based.create_button")
              )}
            </Button>
          </Box>
        </Box>

        {/* Right side */}
        <Box sx={{ flex: 1 }}>
          {/* Speaker info */}
          <Paper elevation={0} sx={{ ...paperSx, gap: 2.5 }}>
            <Typography variant="overline" sx={sectionTitleSx}>
              {t("new_project.corpus_based.section_speaker")}
            </Typography>

            <Box sx={infoCardSx}>
              <Typography sx={captionSx}>
                {t("new_project.corpus_based.label_speaker_name")}
              </Typography>
              <UserSearchAutocomplete
                value={speaker}
                onChange={selectSpeaker}
                includeSelf
                placeholder={t(
                  "new_project.existing_files.placeholder_speaker_search"
                )}
              />
              {submitted && errors.speaker && (
                <FormHelperText error sx={{ mx: "14px" }}>
                  {t("new_project.existing_files.error_speaker_required")}
                </FormHelperText>
              )}
            </Box>

            {/* Identity row */}
            <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
              <Box sx={{ ...infoCardSx, flex: "1 1 120px" }}>
                <Typography sx={captionSx}>
                  {t("new_project.corpus_based.label_age")}
                </Typography>
                <Typography sx={infoValueSx}>
                  {speaker?.birthDate ? computeAge(speaker.birthDate) : "—"}
                </Typography>
              </Box>

              <Box sx={{ ...infoCardSx, flex: "1 1 120px" }}>
                <Typography sx={captionSx}>
                  {t("new_project.corpus_based.label_gender")}
                </Typography>
                <Typography
                  sx={{ ...infoValueSx, textTransform: "capitalize" }}
                >
                  {speaker?.gender
                    ? t(`gender.${speaker.gender.toLowerCase()}`)
                    : "—"}
                </Typography>
              </Box>
            </Box>

            {/* Speech description */}
            <Box>
              <Typography variant="h6" sx={fieldLabelSx} color="primary">
                {t("new_project.corpus_based.label_speech_description")}
              </Typography>
              <TextField
                value={speechDescription}
                onChange={(e) => setSpeechDescription(e.target.value)}
                placeholder={t(
                  "new_project.existing_files.placeholder_speech_description"
                )}
                fullWidth
                multiline
                rows={3}
                sx={textFieldSx}
              />
            </Box>
          </Paper>

          {/* Roles */}
          <Paper elevation={0} sx={paperSx}>
            <Typography variant="overline" sx={{ ...sectionTitleSx, mb: 2 }}>
              {t("new_project.corpus_based.section_roles")}
            </Typography>

            {/* User search */}
            <Box sx={{ mb: 2, minWidth: 0 }}>
              <Typography variant="h6" sx={fieldLabelSx} color="primary">
                {t("new_project.corpus_based.label_user_name")}
              </Typography>
              <UserSearchAutocomplete
                value={memberUser}
                onChange={setMemberUser}
                excludeIds={[
                  ...projectMembers.map((m) => m.user.id),
                  ...(speaker ? [speaker.id] : []),
                ]}
              />
            </Box>

            {/* Role */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" sx={fieldLabelSx} color="primary">
                {t("new_project.corpus_based.label_user_role")}
              </Typography>
              <Select
                value={memberRole}
                onChange={(e) => setMemberRole(e.target.value as ProjectRole)}
                fullWidth
                sx={{ borderRadius: "8px", bgcolor: "var(--app-card)" }}
              >
                {PROJECT_ROLES.map((role) => (
                  <MenuItem key={role} value={role}>
                    {t(`project_roles.${role.toLowerCase()}`)}
                  </MenuItem>
                ))}
              </Select>
            </Box>

            {/* Add */}
            <Button
              variant="contained"
              onClick={addMember}
              disabled={!memberUser}
              sx={{
                bgcolor: "var(--app-btn)",
                borderRadius: 2,
                textTransform: "none",
                fontFamily: LABEL,
                fontWeight: 700,
                mt: 2,
                px: 2.5,
                py: 1.5,
                "&:hover": { bgcolor: "var(--app-btn-hover)" },
                "&.Mui-disabled": {
                  bgcolor: "var(--app-border)",
                  color: "var(--app-text-faint)",
                },
              }}
            >
              {t("new_project.corpus_based.add_member")}
            </Button>

            {(speakerIsEditor || projectMembers.length > 0) && (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 2 }}>
                {speakerIsEditor && (
                  <Chip
                    label={`${fullName(speaker!)} · ${t(
                      "project_roles.editor"
                    )} (${t("new_project.existing_files.speaker_tag")})`}
                  />
                )}
                {projectMembers.map((m) => (
                  <Chip
                    key={m.user.id}
                    label={`${fullName(m.user)} · ${t(
                      `project_roles.${m.role.toLowerCase()}`
                    )}`}
                    onDelete={() => removeMember(m.user.id)}
                  />
                ))}
              </Box>
            )}
            {speakerIsEditor && (
              <Typography
                sx={{ mt: 1, ml: 1 }}
                variant="subtitle2"
                color="var(--app-text-muted)"
              >
                {t("new_project.existing_files.speaker_editor_hint")}
              </Typography>
            )}
          </Paper>
        </Box>
      </Stack>
    </Box>
  );
}
