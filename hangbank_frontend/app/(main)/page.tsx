"use client";
import { LightMode, DarkMode } from "@mui/icons-material";
import { Box, IconButton, Typography } from "@mui/material";
import { useAuth } from "../contexts/auth-context";
import { useCustomTheme } from "../contexts/theme-context";
import { useTranslation } from "react-i18next";
import Link from "next/link";

export default function Home() {
  const { t } = useTranslation("common");

  return (
    <Box sx={{p: 2}}>
      <Typography variant="h3" sx={{ mb: 2 }}>{t("home.welcome_title")}</Typography>
      <Typography variant="body1" fontSize={"large"}>{t("home.welcome_description")}</Typography>
      <Typography variant="body1" fontSize={"large"}>{t("home.thesis_description")}</Typography>

      <Typography variant="body1" fontSize={"large"} sx={{ mt: 2 }}>
        {t("home.library_description")} <Link href="/library">{t("home.library_description_link")}</Link>.
      </Typography>
      <Typography variant="body1" fontSize={"large"}>
        {t("home.project_description")} <Link href="/projects">{t("home.project_description_link")}</Link>.
      </Typography>
      <Typography variant="body1" fontSize={"large"}>
        {t("home.export_description")} <Link href="/export">{t("home.export_description_link")}</Link>.
      </Typography>
      <Typography variant="body1" fontSize={"large"}>
        {t("home.settings_description")} <Link href="/settings">{t("home.settings_description_link")}</Link>.
      </Typography>
      <Typography variant="body1" fontSize={"large"} sx={{mt: 2}}>
        {t("home.support_description")} <Link href="/support">{t("home.support_description_link")}</Link> {t("home.support_description_lead")}.
      </Typography>
      <Typography variant="body1" fontSize={"large"}>
        {t("home.report_description")} <Link href="/support">{t("home.report_description_link")}</Link>.
      </Typography>
    </Box>
  );
}
