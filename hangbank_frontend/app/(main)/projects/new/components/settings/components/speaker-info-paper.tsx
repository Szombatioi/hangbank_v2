"use client";
import {
  Box,
  FormHelperText,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/app/contexts/auth-context";
import { computeAge } from "@/app/components/helpers/compute-age";
import {
  AccessUser,
  UserSearchAutocomplete,
  fullName,
} from "@/app/components/user-access-selector";
import {
  captionSx,
  fieldLabelSx,
  LABEL,
  paperSx,
  sectionTitleSx,
  textFieldSx,
} from "@/app/components/style-constants";

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

interface SpeakerInfoPaperProps {
  speaker: AccessUser | null;
  onSpeakerChange?: (speaker: AccessUser | null) => void;
  speakerError?: boolean;
  speechDescription: string;
  onSpeechDescriptionChange: (value: string) => void;
}

export function SpeakerInfoPaper({
  speaker,
  onSpeakerChange,
  speakerError = false,
  speechDescription,
  onSpeechDescriptionChange,
}: SpeakerInfoPaperProps) {
  const { t } = useTranslation("common");
  const { user } = useAuth();
  const selectable = !!onSpeakerChange;

  return (
    <Paper elevation={0} sx={{ ...paperSx, gap: 2.5 }}>
      <Typography variant="overline" sx={sectionTitleSx}>
        {t("new_project.common.section_speaker")}
      </Typography>

      <Box sx={infoCardSx}>
        <Typography sx={captionSx}>
          {t("new_project.common.label_speaker_name")}
        </Typography>
        {selectable ? (
          <>
            <UserSearchAutocomplete
              value={speaker}
              onChange={onSpeakerChange}
              includeSelf
              placeholder={t("new_project.common.placeholder_speaker_search")}
            />
            {speakerError && (
              <FormHelperText error sx={{ mx: "14px" }}>
                {t("new_project.common.error_speaker_required")}
              </FormHelperText>
            )}
          </>
        ) : (
          <Typography sx={infoValueSx}>
            {speaker
              ? `${fullName(speaker)}${speaker.id === user?.id ? ` (${t("you")})` : ""}`
              : "—"}
          </Typography>
        )}
      </Box>

      {/* Identity row */}
      <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
        <Box sx={{ ...infoCardSx, flex: "1 1 120px" }}>
          <Typography sx={captionSx}>
            {t("new_project.common.label_age")}
          </Typography>
          <Typography sx={infoValueSx}>
            {speaker?.birthDate ? computeAge(speaker.birthDate) : "—"}
          </Typography>
        </Box>

        <Box sx={{ ...infoCardSx, flex: "1 1 120px" }}>
          <Typography sx={captionSx}>
            {t("new_project.common.label_gender")}
          </Typography>
          <Typography sx={{ ...infoValueSx, textTransform: "capitalize" }}>
            {speaker?.gender ? t(`gender.${speaker.gender.toLowerCase()}`) : "—"}
          </Typography>
        </Box>
      </Box>

      {/* Speech description */}
      <Box>
        <Typography variant="h6" sx={fieldLabelSx} color="primary">
          {t("new_project.common.label_speech_description")}
        </Typography>
        <TextField
          value={speechDescription}
          onChange={(e) => onSpeechDescriptionChange(e.target.value)}
          placeholder={t(
            selectable
              ? "new_project.common.placeholder_speech_description_speaker"
              : "new_project.common.placeholder_speech_description"
          )}
          fullWidth
          multiline
          rows={3}
          sx={textFieldSx}
        />
      </Box>
    </Paper>
  );
}
