"use client";

import { useEffect } from "react";
import api from "@/app/axios";
import { useAuth } from "@/app/contexts/auth-context";
import { useCustomTheme } from "@/app/contexts/theme-context";
import { useLanguage } from "./language-provider";

export interface UserSettingsDto {
  theme: "light" | "dark";
  languageCode: string | null;
  apiKeyPresent: boolean;
  //apiKey: string | null;
}

export default function UserSettingsSync() {
  const { user } = useAuth();
  const { setTheme } = useCustomTheme();
  const { setLanguage } = useLanguage();
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    let ignore = false;

    const loadSettings = async () => {
      try {
        const { data } = await api.get<UserSettingsDto>("/user-settings/me");
        if (ignore) return;
        setTheme(data.theme);
        if (data.languageCode) setLanguage(data.languageCode);
        localStorage.setItem("apiKeyPresent", data.apiKeyPresent ? "true" : "false");
      } catch {}
    };

    loadSettings();
    return () => {
      ignore = true;
    };
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
