"use client";
import { Box, Radio, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { CorpusVisibility } from "@/app/components/types/corpus.dto";

export function VisibilitySelector({
  value,
  onChange,
}: {
  value: CorpusVisibility;
  onChange: (v: CorpusVisibility) => void;
}) {
  const { t } = useTranslation("common");

  const options: { value: CorpusVisibility; label: string; description: string }[] = [
    {
      value: "private",
      label: t("upload_corpus_page.visibility.private"),
      description: t("upload_corpus_page.visibility.private_desc"),
    },
    {
      value: "public",
      label: t("upload_corpus_page.visibility.public"),
      description: t("upload_corpus_page.visibility.public_desc"),
    },
    {
      value: "protected",
      label: t("upload_corpus_page.visibility.protected"),
      description: t("upload_corpus_page.visibility.protected_desc"),
    },
  ];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      {options.map((option) => {
        const isSelected = value === option.value;
        return (
          <Box
            key={option.value}
            onClick={() => onChange(option.value)}
            sx={{
              display: "flex",
              alignItems: "flex-start",
              gap: 1.5,
              px: 2,
              py: 1.5,
              borderRadius: 3,
              cursor: "pointer",
              border: "1.5px solid",
              borderColor: isSelected ? "#b8c8e8" : "transparent",
              bgcolor: isSelected ? "var(--app-info-bg)" : "transparent",
              transition: "all 0.15s",
            }}
          >
            <Radio
              checked={isSelected}
              onChange={() => onChange(option.value)}
              size="small"
              sx={{ p: 0, mt: "2px", color: isSelected ? "var(--app-text-primary)" : "#aaa" }}
            />
            <Box>
              <Typography variant="body1" fontWeight={700} color="text.primary">
                {option.label}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {option.description}
              </Typography>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
