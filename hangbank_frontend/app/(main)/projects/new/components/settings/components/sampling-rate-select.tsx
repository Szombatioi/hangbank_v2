"use client";
import {
  Box,
  FormHelperText,
  MenuItem,
  Select,
  SelectChangeEvent,
  Typography,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { LABEL, SAMPLING_RATES } from "../constants";

interface SamplingRateSelectProps {
  value: number | "";
  onChange: (value: number | "") => void;
  disabled?: boolean;
  error?: boolean;
  explanation?: string;
}

export function SamplingRateSelect({
  value,
  onChange,
  disabled,
  error,
  explanation,
}: SamplingRateSelectProps) {
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
        color={disabled ? "text.disabled" : "primary"}
      >
        {t("new_project.corpus_based.label_sampling_rate")}
      </Typography>
      <Select
        value={value}
        disabled={disabled}
        onChange={(e: SelectChangeEvent<number | "">) =>
          onChange(e.target.value as number | "")
        }
        fullWidth
        displayEmpty
        error={error}
        sx={{ borderRadius: "8px", bgcolor: "var(--app-card)" }}
        renderValue={(val) =>
          val === "" ? (
            <em style={{ color: "#aaa", fontStyle: "normal" }}>
              {t("new_project.corpus_based.placeholder_sampling_rate")}
            </em>
          ) : (
            SAMPLING_RATES.find((r) => r.value === val)?.label ?? String(val)
          )
        }
      >
        {SAMPLING_RATES.map((rate) => (
          <MenuItem key={rate.value} value={rate.value}>
            {rate.label}
            {rate.recommended && ` (${t("recommended")})`}
          </MenuItem>
        ))}
      </Select>
      {error ? (
        <FormHelperText error sx={{ mx: "14px" }}>
          {t("new_project.corpus_based.error_sampling_rate_required")}
        </FormHelperText>
      ) : (
        <Typography
          sx={{ mt: 1, ml: 1 }}
          variant="subtitle2"
          color="var(--app-text-muted)"
        >
          {explanation ?? t("sampling_rate_explanation")}
        </Typography>
      )}
    </Box>
  );
}
