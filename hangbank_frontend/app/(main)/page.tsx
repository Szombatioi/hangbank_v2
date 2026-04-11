"use client";
import { LightMode, DarkMode } from "@mui/icons-material";
import { IconButton } from "@mui/material";
import { useAuth } from "../contexts/auth-context";
import { useTheme } from "../contexts/theme-context";

export default function Home() {
  const { mode, toggleTheme } = useTheme();

  return (
    <>
    <IconButton onClick={toggleTheme} color="inherit">
  {mode === "dark" ? <LightMode /> : <DarkMode />}
</IconButton>
    </>
  );
}
