"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Box, Button, CircularProgress, FormControlLabel,
    MenuItem, Paper, Select, Switch, TextField, Typography,
} from "@mui/material";
import { AxiosError } from "axios";
import api from "@/app/axios";
import { useAuth } from "@/app/contexts/auth-context";
import { useCustomTheme } from "@/app/contexts/theme-context";
import { useLanguage } from "@/app/providers/language-provider";
import { useSnackbar, Severity } from "@/app/providers/SnackbarProvider";
import { BODY, HEADLINE, LABEL, ORANGE } from "@/app/components/style-constants";

// A UI-selectable language fetched from the backend (only the translated ones).
interface UiLanguage {
    code: string; // BCP-47, e.g. "en-US"
    name: string; // i18n key under "language.", e.g. "lang_en-US"
    isTranslated: boolean;
}

//TODO: read from DB
const GENDERS = ["MALE", "FEMALE", "OTHER"];

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <Paper elevation={0} sx={{ border: "1px solid var(--app-border)", borderRadius: 3, p: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2.5 }}>
                <Box sx={{ width: 4, height: 20, bgcolor: ORANGE, borderRadius: "2px" }} />
                <Typography sx={{ fontFamily: LABEL, fontWeight: 700, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--app-text-secondary)" }}>
                    {title}
                </Typography>
            </Box>
            {children}
        </Paper>
    );
}

function FieldLabel({ label }: { label: string }) {
    return (
        <Typography sx={{ fontFamily: LABEL, fontWeight: 700, fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--app-text-faint)", mb: 0.75 }}>
            {label}
        </Typography>
    );
}

const fieldSx = { "& .MuiOutlinedInput-root": { borderRadius: "8px" } };

export default function SettingsPage() {
    const { t } = useTranslation("common");
    const { showMessage } = useSnackbar();
    const { user, loading } = useAuth();
    const { mode, toggleTheme } = useCustomTheme();
    const { language, setLanguage } = useLanguage();

    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [username, setUsername] = useState("");
    const [gender, setGender] = useState("");
    const [savingProfile, setSavingProfile] = useState(false);

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [savingPassword, setSavingPassword] = useState(false);

    // Interface languages — only those with a complete UI translation (isTranslated = true)
    const [languages, setLanguages] = useState<UiLanguage[]>([]);

    // Seed the profile form once the authenticated user is available
    useEffect(() => {
        if (!user) return;
        setFirstName(user.firstName ?? "");
        setLastName(user.lastName ?? "");
        setUsername(user.username ?? "");
        setGender(user.gender ?? "");
    }, [user]);

    // Fetch the translated languages offered as interface options
    useEffect(() => {
        let ignore = false;
        api.get<UiLanguage[]>("/language/translated")
            .then(({ data }) => { if (!ignore) setLanguages(data); })
            .catch(() => { /* leave empty — language picker just won't list options */ });
        return () => { ignore = true; };
    }, []);

    // The active i18n locale may be a short code ("en") while DB codes are BCP-47
    // ("en-US"); match on the base subtag so the right option stays selected.
    const selectedLanguageCode =
        languages.find((l) => l.code === language)?.code ??
        languages.find((l) => l.code.split("-")[0] === language.split("-")[0])?.code ??
        "";

    const handleSaveProfile = async () => {
        setSavingProfile(true);
        try {
            await api.patch("/user/me", {
                firstName: firstName.trim() || undefined,
                lastName: lastName.trim() || undefined,
                username: username.trim() || undefined,
                gender: gender || undefined,
            });
            showMessage(t("settings.profile_saved"), Severity.success);
        } catch (err) {
            const msg = (err as AxiosError<{ message?: string }>).response?.data?.message;
            showMessage(msg ?? t("settings.profile_error"), Severity.error);
        } finally {
            setSavingProfile(false);
        }
    };

    const handleSavePassword = async () => {
        if (!currentPassword) {
            showMessage(t("settings.current_password_required"), Severity.error);
            return;
        }
        if (newPassword.length < 6) {
            showMessage(t("settings.password_too_short"), Severity.error);
            return;
        }
        if (newPassword !== confirmPassword) {
            showMessage(t("settings.password_mismatch"), Severity.error);
            return;
        }
        setSavingPassword(true);
        try {
            await api.patch("/user/me", { currentPassword, password: newPassword });
            showMessage(t("settings.password_saved"), Severity.success);
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (err) {
            const status = (err as AxiosError).response?.status;
            showMessage(status === 401 ? t("settings.password_incorrect") : t("settings.password_error"), Severity.error);
        } finally {
            setSavingPassword(false);
        }
    };

    return (
        <Box sx={{ p: { xs: 3, md: 5 }, maxWidth: 760, mx: "auto" }}>
            <Typography sx={{ fontFamily: HEADLINE, fontWeight: 700, fontSize: "1.5rem", color: "var(--app-text-primary)", letterSpacing: "-0.02em" }}>
                {t("settings.title")}
            </Typography>
            <Typography sx={{ fontFamily: BODY, fontSize: "0.95rem", color: "var(--app-text-muted)", mt: 0.5, mb: 4 }}>
                {t("settings.subtitle")}
            </Typography>

            {loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>

                    {/* Appearance */}
                    <SectionCard title={t("settings.appearance")}>
                        <FormControlLabel
                            control={<Switch checked={mode === "dark"} onChange={() => toggleTheme()} />}
                            label={
                                <Box>
                                    <Typography sx={{ fontFamily: BODY, fontSize: "0.925rem", fontWeight: 600, color: "var(--app-text-primary)" }}>
                                        {t("settings.dark_mode")}
                                    </Typography>
                                    <Typography sx={{ fontFamily: BODY, fontSize: "0.8rem", color: "var(--app-text-faint)" }}>
                                        {t("settings.dark_mode_desc")}
                                    </Typography>
                                </Box>
                            }
                            sx={{ ml: 0, gap: 1.5 }}
                        />
                    </SectionCard>

                    {/* Language */}
                    <SectionCard title={t("settings.language")}>
                        <FieldLabel label={t("settings.language_label")} />
                        {languages.length === 0 ? (
                            <Box sx={{ display: "flex", justifyContent: "center", py: 1 }}>
                                <CircularProgress size={20} />
                            </Box>
                        ) : (
                            <Select
                                value={selectedLanguageCode}
                                onChange={(e) => setLanguage(e.target.value)}
                                fullWidth
                                sx={{ borderRadius: "8px" }}
                            >
                                {languages.map((l) => (
                                    <MenuItem key={l.code} value={l.code}>
                                        {t(`language.${l.name}`)}
                                    </MenuItem>
                                ))}
                            </Select>
                        )}
                    </SectionCard>

                    {/* Profile */}
                    <SectionCard title={t("settings.profile")}>
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
                            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                                <Box>
                                    <FieldLabel label={t("settings.first_name")} />
                                    <TextField value={firstName} onChange={(e) => setFirstName(e.target.value)} fullWidth sx={fieldSx} />
                                </Box>
                                <Box>
                                    <FieldLabel label={t("settings.last_name")} />
                                    <TextField value={lastName} onChange={(e) => setLastName(e.target.value)} fullWidth sx={fieldSx} />
                                </Box>
                            </Box>
                            <Box>
                                <FieldLabel label={t("settings.username")} />
                                <TextField value={username} onChange={(e) => setUsername(e.target.value)} fullWidth sx={fieldSx} />
                            </Box>
                            <Box>
                                <FieldLabel label={t("settings.gender")} />
                                <Select value={gender} onChange={(e) => setGender(e.target.value)} fullWidth displayEmpty sx={{ borderRadius: "8px" }}>
                                    <MenuItem value=""><em>—</em></MenuItem>
                                    {GENDERS.map((g) => (
                                        <MenuItem key={g} value={g}>{t(`gender.${g.toLowerCase()}`)}</MenuItem>
                                    ))}
                                </Select>
                            </Box>
                            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                                <Button
                                    variant="contained"
                                    onClick={handleSaveProfile}
                                    disabled={savingProfile}
                                    startIcon={savingProfile ? <CircularProgress size={14} sx={{ color: "inherit" }} /> : undefined}
                                    sx={{ bgcolor: "var(--app-btn)", borderRadius: 1.5, textTransform: "none", fontFamily: LABEL, fontWeight: 700, fontSize: "0.78rem", px: 2.5, "&:hover": { bgcolor: "var(--app-btn-hover)" } }}
                                >
                                    {t("settings.save")}
                                </Button>
                            </Box>
                        </Box>
                    </SectionCard>

                    {/* Password */}
                    <SectionCard title={t("settings.password")}>
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
                            <Box>
                                <FieldLabel label={t("settings.current_password")} />
                                <TextField type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} fullWidth sx={fieldSx} />
                            </Box>
                            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                                <Box>
                                    <FieldLabel label={t("settings.new_password")} />
                                    <TextField type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} fullWidth sx={fieldSx} />
                                </Box>
                                <Box>
                                    <FieldLabel label={t("settings.confirm_password")} />
                                    <TextField type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} fullWidth sx={fieldSx} />
                                </Box>
                            </Box>
                            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                                <Button
                                    variant="contained"
                                    onClick={handleSavePassword}
                                    disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
                                    startIcon={savingPassword ? <CircularProgress size={14} sx={{ color: "inherit" }} /> : undefined}
                                    sx={{ bgcolor: "var(--app-btn)", borderRadius: 1.5, textTransform: "none", fontFamily: LABEL, fontWeight: 700, fontSize: "0.78rem", px: 2.5, "&:hover": { bgcolor: "var(--app-btn-hover)" }, "&.Mui-disabled": { bgcolor: "var(--app-border)", color: "var(--app-text-faint)" } }}
                                >
                                    {t("settings.update_password")}
                                </Button>
                            </Box>
                        </Box>
                    </SectionCard>
                </Box>
            )}
        </Box>
    );
}
