"use client";
import {
    Box, Button, Link, Paper, TextField, Typography, Alert,
} from "@mui/material";
import { Security, Fingerprint, ArrowForward } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "../../axios";

const HEADLINE_FONT = "'Space Grotesk', sans-serif";
const BODY_FONT = "'Inter', sans-serif";
const LABEL_FONT = "'Manrope', sans-serif";

export const COLORS = {
    primaryAccent: "#ed4a14",
    secondaryText: "#47607e",
    inputBg: "#e7e8e9",
    borderColor: "#c4c6cc",
    darkBg: "#101b30",
    formBg: "#f3f4f5",
    waveBar: "#79849d",
};

export const WAVEFORM_HEIGHTS = [25, 50, 75, 100, 66, 50, 33, 80, 100, 50, 25];

export default function LoginPage() {
    const { t } = useTranslation("common");
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            await login(email, password);
            router.push("/");
        } catch {
            setError(t("error_invalid_credentials"));
        } finally {
            setLoading(false);
        }
    };

    const labelStyle = {
        fontFamily: LABEL_FONT,
        fontSize: "10px",
        fontWeight: 800,
        color: COLORS.secondaryText,
        textTransform: "uppercase" as const,
        letterSpacing: "0.15em",
        mb: 1,
        display: "block",
    };

    const inputSx = {
        "& .MuiInputBase-root": {
            backgroundColor: COLORS.inputBg,
            borderRadius: "2px 2px 0 0",
            fontFamily: HEADLINE_FONT,
            fontSize: "0.875rem",
            display: "flex",
            alignItems: "center",
            "&:before": { borderBottomColor: COLORS.borderColor },
            "&:after": { borderBottomColor: COLORS.secondaryText },
            "& input": {
                padding: "12px",
                letterSpacing: "0.025em",
            },
        },
    };

    return (
        <Box
            sx={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#f8f9fa",
                p: { xs: 0, sm: 2 },
            }}
        >
            <Paper
                elevation={6}
                sx={{
                    width: "100%",
                    maxWidth: "1100px",
                    display: "flex",
                    minHeight: { xs: "100vh", sm: "700px" },
                    borderRadius: { xs: 0, sm: 2 },
                    overflow: "hidden",
                }}
            >
                {/* Left Panel: Brand & Identity */}
                <Box
                    sx={{
                        width: { xs: "0%", md: "45%" },
                        display: { xs: "none", md: "flex" },
                        flexDirection: "column",
                        justifyContent: "space-between",
                        backgroundColor: COLORS.darkBg,
                        color: "white",
                        p: 6,
                        position: "relative",
                        overflow: "hidden",
                    }}
                >
                    {/* Decorative waveform background */}
                    <Box
                        sx={{
                            position: "absolute",
                            inset: 0,
                            opacity: 0.08,
                            pointerEvents: "none",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <Box sx={{ display: "flex", alignItems: "flex-end", gap: "4px", height: "220px" }}>
                            {WAVEFORM_HEIGHTS.map((h, i) => (
                                <Box key={i} sx={{ width: "4px", height: `${h}%`, bgcolor: COLORS.waveBar }} />
                            ))}
                        </Box>
                    </Box>

                    {/* Top: Brand */}
                    <Box sx={{ zIndex: 1 }}>
                        <Typography
                            sx={{
                                fontFamily: HEADLINE_FONT,
                                fontWeight: 700,
                                fontSize: "1.25rem",
                                textTransform: "uppercase",
                                letterSpacing: "-0.02em",
                                mb: 0.5,
                            }}
                        >
                            {t("brand_name")}
                        </Typography>
                        <Typography
                            sx={{
                                fontFamily: LABEL_FONT,
                                fontSize: "9px",
                                textTransform: "uppercase",
                                letterSpacing: "0.2em",
                                opacity: 0.7,
                                color: COLORS.waveBar,
                            }}
                        >
                            {t("register_subtitle")}
                        </Typography>
                    </Box>

                    {/* Middle: Tagline + Stats */}
                    <Box sx={{ zIndex: 1 }}>
                        <Typography
                            variant="h3"
                            sx={{
                                fontFamily: HEADLINE_FONT,
                                fontWeight: 700,
                                fontSize: "2.8rem",
                                lineHeight: 1.1,
                                letterSpacing: "-0.03em",
                                mb: 2,
                                whiteSpace: "pre-line",
                            }}
                        >
                            {t("login_hero")}
                        </Typography>
                        <Typography
                            sx={{
                                fontFamily: BODY_FONT,
                                color: COLORS.waveBar,
                                fontSize: "1rem",
                                fontWeight: 300,
                                lineHeight: 1.6,
                                mb: 4,
                                maxWidth: "300px",
                            }}
                        >
                            {t("login_hero_sub")}
                        </Typography>
                        {/* <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                            {[
                                { val: "24.8k", label: t("stat_archived_nodes") },
                                { val: "0.02ms", label: t("stat_signal_latency") },
                            ].map(({ val, label }) => (
                                <Box
                                    key={val}
                                    sx={{
                                        p: 2,
                                        borderRadius: "4px",
                                        border: "1px solid rgba(255,255,255,0.08)",
                                        bgcolor: "rgba(255,255,255,0.03)",
                                    }}
                                >
                                    <Typography sx={{ fontFamily: HEADLINE_FONT, fontWeight: 700, fontSize: "1.25rem", color: "white" }}>
                                        {val}
                                    </Typography>
                                    <Typography sx={{ fontFamily: LABEL_FONT, fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.15em", color: COLORS.waveBar }}>
                                        {label}
                                    </Typography>
                                </Box>
                            ))}
                        </Box> */}
                    </Box>

                    {/* Bottom: Footer meta */}
                    <Box sx={{ zIndex: 1, pt: 3, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                        {/* <Typography
                            sx={{
                                fontFamily: LABEL_FONT,
                                fontSize: "9px",
                                textTransform: "uppercase",
                                letterSpacing: "0.15em",
                                color: COLORS.waveBar,
                            }}
                        >
                            {t("login_footer_meta")}
                        </Typography> */}
                    </Box>
                </Box>

                {/* Right Panel: Authentication Form */}
                <Box
                    component="section"
                    sx={{
                        flex: 1,
                        bgcolor: COLORS.formBg,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        alignItems: "center",
                        px: { xs: 3, sm: 8, md: 10 },
                        py: 6,
                        position: "relative",
                    }}
                >
                    <Box sx={{ width: "100%", maxWidth: "420px" }}>
                        {/* Mobile-only brand */}
                        <Box sx={{ display: { xs: "block", md: "none" }, mb: 4 }}>
                            <Typography
                                sx={{
                                    fontFamily: HEADLINE_FONT,
                                    fontWeight: 700,
                                    fontSize: "1.25rem",
                                    textTransform: "uppercase",
                                    letterSpacing: "-0.02em",
                                }}
                            >
                                {t("brand_name")}
                            </Typography>
                        </Box>

                        <header style={{ marginBottom: "40px" }}>
                            <Typography
                                variant="h3"
                                sx={{
                                    fontFamily: HEADLINE_FONT,
                                    fontWeight: 700,
                                    fontSize: "1.75rem",
                                    mb: 0.5,
                                    letterSpacing: "-0.02em",
                                }}
                            >
                                {t("login_title")}
                            </Typography>
                            <Typography sx={{ fontFamily: BODY_FONT, color: "text.secondary", fontSize: "0.85rem" }}>
                                {t("login_description")}
                            </Typography>
                        </header>

                        <Box
                            component="form"
                            onSubmit={handleLogin}
                            sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}
                        >
                            {error && (
                                <Alert severity="error" sx={{ borderRadius: "2px", fontFamily: BODY_FONT, fontSize: "0.8rem" }}>
                                    {error}
                                </Alert>
                            )}

                            {/* Email */}
                            <Box>
                                <Typography sx={labelStyle}>{t("label_email_identifier")}</Typography>
                                <TextField
                                    fullWidth
                                    variant="filled"
                                    type="email"
                                    placeholder={t("placeholder_email")}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    sx={{ ...inputSx, "& input": { textTransform: "none" } }}
                                    hiddenLabel
                                />
                            </Box>

                            {/* Password */}
                            <Box>
                                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", mb: 1 }}>
                                    <Typography sx={{ ...labelStyle, mb: 0 }}>{t("label_security_sequence")}</Typography>
                                    {/* <Link
                                        href="#"
                                        sx={{
                                            fontSize: "9px",
                                            fontWeight: 700,
                                            fontFamily: LABEL_FONT,
                                            textTransform: "uppercase",
                                            letterSpacing: "0.1em",
                                            textDecoration: "none",
                                            color: "text.secondary",
                                            "&:hover": { color: COLORS.secondaryText },
                                        }}
                                    >
                                        {t("link_forgot")}
                                    </Link> */}
                                </Box>
                                <TextField
                                    fullWidth
                                    variant="filled"
                                    type="password"
                                    placeholder="••••••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    sx={inputSx}
                                    hiddenLabel
                                />
                            </Box>

                            {/* Submit */}
                            <Button
                                fullWidth
                                type="submit"
                                variant="contained"
                                disableElevation
                                disabled={loading}
                                endIcon={<ArrowForward className="arrow-icon" />}
                                sx={{
                                    bgcolor: "black",
                                    color: "white",
                                    py: 1.5,
                                    mt: 2,
                                    borderRadius: 0,
                                    fontFamily: HEADLINE_FONT,
                                    fontWeight: 700,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.1em",
                                    justifyContent: "space-between",
                                    "&:hover": { bgcolor: COLORS.secondaryText },
                                    "& .arrow-icon": { transition: "transform 0.2s" },
                                    "&:hover .arrow-icon": { transform: "translateX(5px)" },
                                }}
                            >
                                {t("button_login")}
                            </Button>

                            <Box sx={{ textAlign: "center", mt: 1 }}>
                                <Link
                                    href="/auth/register"
                                    sx={{
                                        fontSize: "10px",
                                        fontWeight: 700,
                                        textTransform: "uppercase",
                                        textDecoration: "none",
                                        color: "text.secondary",
                                        letterSpacing: "0.1em",
                                    }}
                                >
                                    {t("link_register")}
                                </Link>
                            </Box>
                        </Box>

                        {/* Footer */}
                        <Box
                            sx={{
                                mt: 6,
                                pt: 3,
                                borderTop: "1px solid rgba(0,0,0,0.07)",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                            }}
                        >
                            {/* <Box sx={{ display: "flex", gap: 1.5 }}>
                                <Security sx={{ color: COLORS.borderColor, fontSize: "18px" }} />
                                <Fingerprint sx={{ color: COLORS.borderColor, fontSize: "18px" }} />
                            </Box>
                            <Typography
                                sx={{
                                    fontFamily: LABEL_FONT,
                                    fontSize: "9px",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.15em",
                                    color: COLORS.borderColor,
                                }}
                            >
                                {t("secure_terminal")}
                            </Typography> */}
                        </Box>
                    </Box>

                    {/* Corner accents */}
                    <Box sx={{ position: "absolute", top: 20, right: 20, width: 30, height: 30, borderTop: `1px solid ${COLORS.borderColor}`, borderRight: `1px solid ${COLORS.borderColor}`, opacity: 0.4 }} />
                    <Box sx={{ position: "absolute", bottom: 20, left: 20, width: 30, height: 30, borderBottom: `1px solid ${COLORS.borderColor}`, borderLeft: `1px solid ${COLORS.borderColor}`, opacity: 0.4 }} />
                </Box>
            </Paper>
        </Box>
    );
}
