"use client";
import { Autocomplete, Box, Chip, TextField, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { LABEL } from "../constants";

export const AVAILABLE_AUDIO_CHECKS = ["VOLUME", "NOISE", "SPEAKER"];

interface AudioChecksSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  availableChecks?: string[];
}

export function AudioChecksSelect({
  value,
  onChange,
  availableChecks = AVAILABLE_AUDIO_CHECKS,
}: AudioChecksSelectProps) {
  const { t } = useTranslation("common");

  return (
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
        {t("new_project.corpus_based.label_audio_checks")}
      </Typography>
      <Autocomplete
        options={availableChecks.filter((c) => !value.includes(c))}
        value={null}
        blurOnSelect
        clearOnBlur
        getOptionLabel={(option) => t(`audio_checks.${option.toLowerCase()}`)}
        onChange={(_, newValue) => {
          if (newValue && !value.includes(newValue)) {
            onChange([...value, newValue]);
          }
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder={t("new_project.corpus_based.placeholder_audio_checks")}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "8px",
                bgcolor: "var(--app-card)",
              },
            }}
          />
        )}
      />
      {value.length > 0 && (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1.5 }}>
          {value.map((check) => (
            <Chip
              key={check}
              label={t(`audio_checks.${check.toLowerCase()}`)}
              onDelete={() => onChange(value.filter((c) => c !== check))}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}
