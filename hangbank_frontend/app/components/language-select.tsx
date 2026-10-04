"use client";
import { FormHelperText, MenuItem, Select, SelectChangeEvent } from "@mui/material";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "@/app/axios";
import { LanguageDto } from "./types/language.dto";
import { translateHttpError } from "./helpers/http-error";
import { Severity, useSnackbar } from "../providers/SnackbarProvider";

interface LanguageSelectProps {
  value: string | null; // language code, e.g. "hu-HU"
  onChange: (language: LanguageDto) => void;
  defaultCode?: string;
  error?: boolean;
  helperText?: string;
  background?: string;
}

export default function LanguageSelect({
  value,
  onChange,
  defaultCode,
  error = false,
  helperText,
  background,
}: LanguageSelectProps) {
  const { t } = useTranslation("common");
  const { showMessage } = useSnackbar();
  const [languages, setLanguages] = useState<LanguageDto[]>([]);

  useEffect(() => {
    let ignore = false;

    const loadLanguages = async () => {
      try {
        const { data } = await api.get<LanguageDto[]>("/language");
        if (ignore) return;
        setLanguages(data);
        const fallback = data.find((l) => l.code === defaultCode);
        if (!value && fallback) onChange(fallback);
      } catch (err) {
        if (!ignore) {
          showMessage(translateHttpError(err, t, t("error.language_load")), Severity.error);
        }
      }
    };

    void loadLanguages();
    return () => {
      ignore = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <Select
        value={value ?? ""}
        onChange={(e: SelectChangeEvent) => {
          const language = languages.find((l) => l.code === e.target.value);
          if (language) onChange(language);
        }}
        fullWidth
        displayEmpty
        error={error}
        sx={{ borderRadius: "8px", bgcolor: background }}
        renderValue={(selected) => {
          const language = languages.find((l) => l.code === selected);
          if (!language) {
            return (
              <em style={{ color: "#aaa", fontStyle: "normal" }}>
                {t("upload_corpus_page.select_language_placeholder")}
              </em>
            );
          }
          return t(`language.${language.name}`);
        }}
      >
        {languages.map((language) => (
          <MenuItem key={language.code} value={language.code}>
            {t(`language.${language.name}`)}
          </MenuItem>
        ))}
      </Select>
      {helperText && (
        <FormHelperText error={error} sx={{ mx: "14px" }}>
          {helperText}
        </FormHelperText>
      )}
    </>
  );
}
