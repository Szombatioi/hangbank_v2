"use client";
import {
  Box,
  FormHelperText,
  MenuItem,
  Select,
  SelectChangeEvent,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getMicrophones } from "@/app/components/helpers/get-mics";
import { fieldLabelSx } from "@/app/components/style-constants";
import { SAMPLING_RATES } from "../constants";

interface MicrophoneSelectProps {
  value: MediaDeviceInfo | null;
  onChange: (mic: MediaDeviceInfo) => void;
  error?: boolean;
  onRecommendedSamplingRate?: (rate: number) => void;
}

export function MicrophoneSelect({
  value,
  onChange,
  error = false,
  onRecommendedSamplingRate,
}: MicrophoneSelectProps) {
  const { t } = useTranslation("common");
  const [availableMics, setAvailableMics] = useState<MediaDeviceInfo[] | null>(
    null
  );

  useEffect(() => {
    async function getMics() {
      const mics = await getMicrophones();
      setAvailableMics(mics);

      if (mics.length > 0 && !value) {
        onChange(mics[0]);

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { deviceId: { exact: mics[0].deviceId } },
        });
        const nativeRate = stream.getAudioTracks()[0].getSettings().sampleRate;
        if (!nativeRate) return; //should not happen

        const recommendedRate = SAMPLING_RATES.slice()
          .reverse()
          .find((r) => r.value <= nativeRate);
        if (recommendedRate) {
          SAMPLING_RATES.find(
            (r) => r.value === recommendedRate.value
          )!.recommended = true;
          onRecommendedSamplingRate?.(recommendedRate.value);
        }
      }
    }

    getMics();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Box>
      <Typography variant="h6" sx={fieldLabelSx} color="primary">
        {t("new_project.common.label_microphone")}
      </Typography>
      <Select
        value={value?.deviceId || ""}
        onChange={(e: SelectChangeEvent<string>) => {
          const mic = availableMics?.find((m) => m.deviceId === e.target.value);
          if (mic) onChange(mic);
        }}
        fullWidth
        displayEmpty
        error={error}
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
        <MenuItem disabled value="">
          <em>{t("microphone_select.placeholder")}</em>
        </MenuItem>

        {availableMics?.map((mic) => (
          <MenuItem key={mic.deviceId} value={mic.deviceId}>
            {mic.label ||
              `${t("microphone_select.default_label")} ${mic.deviceId.substring(0, 5)}`}
          </MenuItem>
        ))}
      </Select>
      {error && (
        <FormHelperText error sx={{ mx: "14px" }}>
          {t("new_project.common.error_microphone_required")}
        </FormHelperText>
      )}
    </Box>
  );
}
