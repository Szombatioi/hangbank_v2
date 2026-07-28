"use client";
import {
    Box, Button, Link, Paper, TextField, Typography, InputAdornment, Avatar, Alert,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import AddAPhotoIcon from '@mui/icons-material/AddAPhoto';
import { ArrowForward } from "@mui/icons-material";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { register } from "../../axios";
import { COLORS, WAVEFORM_HEIGHTS } from "../login/page";

const HEADLINE_FONT = "'Space Grotesk', sans-serif";
const BODY_FONT = "'Inter', sans-serif";
const LABEL_FONT = "'Manrope', sans-serif";

export default function RegisterPage() {
    const { t } = useTranslation("common");
    const router = useRouter();

    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [verifyPassword, setVerifyPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password !== verifyPassword) {
            setError(t("error_passwords_mismatch"));
            return;
        }

        setLoading(true);
        try {
            await register({ email, password, username, firstName, lastName });
            router.push("/");
        } catch {
            setError(t("error_register_failed"));
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
            display: 'flex',
            alignItems: 'center',
            "&:before": { borderBottomColor: COLORS.borderColor },
            "&:after": { borderBottomColor: COLORS.primaryAccent },
            "& input": {
                padding: "12px",
                letterSpacing: "0.025em"
            },
        },
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: "var(--app-bg)",
                p: { xs: 0, sm: 2 }
            }}
        >
            <Paper
                elevation={6}
                sx={{
                    width: '100%',
                    maxWidth: "1100px",
                    display: 'flex',
                    minHeight: { xs: '100vh', sm: '700px' },
                    borderRadius: { xs: 0, sm: 2 },
                    overflow: 'hidden'
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

                {/* Right part: Registration form */}
                <Box
                    component="section"
                    sx={{
                        flex: 1,
                        bgcolor: "var(--app-card)",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        alignItems: "center",
                        px: { xs: 4, sm: 8, md: 10 },
                        py: 6,
                        position: "relative",
                    }}
                >
                    <Box sx={{ width: "100%" }}>
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
                                    mb: 1,
                                    letterSpacing: "-0.02em",
                                }}
                            >
                                {t("register_title")}
                            </Typography>
                        </header>

                        <Box component="form" onSubmit={handleRegister} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                            {error && (
                                <Alert severity="error" sx={{ borderRadius: "2px", fontFamily: BODY_FONT, fontSize: "0.8rem" }}>
                                    {error}
                                </Alert>
                            )}

                            {/* Profile Picture */}
                            {/* <Box>
                                <Typography sx={labelStyle}>{t("label_identity")}</Typography>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                                    <Avatar sx={{ bgcolor: COLORS.inputBg, width: 56, height: 56, border: `1px dashed ${COLORS.borderColor}` }}>
                                        <AddAPhotoIcon sx={{ color: COLORS.secondaryText }} />
                                    </Avatar>
                                    <Button variant="text" sx={{ fontSize: '10px', fontWeight: 800, fontFamily: LABEL_FONT }}>
                                        {t("button_upload_image")}
                                    </Button>
                                </Box>
                            </Box> */}

                            {/* Name Fields */}
                            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                                <Box>
                                    <Typography sx={labelStyle}>{t("label_first_name")}</Typography>
                                    <TextField
                                        fullWidth
                                        variant="filled"
                                        placeholder={t("placeholder_first_name")}
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        sx={inputSx}
                                        hiddenLabel
                                    />
                                </Box>
                                <Box>
                                    <Typography sx={labelStyle}>{t("label_last_name")}</Typography>
                                    <TextField
                                        fullWidth
                                        variant="filled"
                                        placeholder={t("placeholder_last_name")}
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        sx={inputSx}
                                        hiddenLabel
                                    />
                                </Box>
                            </Box>

                            {/* Username */}
                            <Box>
                                <Typography sx={labelStyle}>{t("label_username")}</Typography>
                                <TextField
                                    fullWidth
                                    variant="filled"
                                    placeholder={t("placeholder_username")}
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    sx={inputSx}
                                    InputProps={{
                                        disableUnderline: false,
                                        startAdornment: (
                                            <InputAdornment position="start" sx={{ mt: '0 !important', height: 'unset' }}>
                                                <Typography sx={{ fontFamily: HEADLINE_FONT, color: COLORS.borderColor }}>@</Typography>
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                            </Box>

                            {/* Email */}
                            <Box>
                                <Typography sx={labelStyle}>{t("label_email")}</Typography>
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

                            {/* Passwords */}
                            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                                <Box>
                                    <Typography sx={labelStyle}>{t("label_password")}</Typography>
                                    <TextField
                                        fullWidth
                                        type="password"
                                        variant="filled"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        sx={inputSx}
                                        hiddenLabel
                                    />
                                </Box>
                                <Box>
                                    <Typography sx={labelStyle}>{t("label_verify")}</Typography>
                                    <TextField
                                        fullWidth
                                        type="password"
                                        variant="filled"
                                        value={verifyPassword}
                                        onChange={(e) => setVerifyPassword(e.target.value)}
                                        sx={inputSx}
                                        hiddenLabel
                                    />
                                </Box>
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
                                    bgcolor: COLORS.primaryAccent,
                                    color: "white",
                                    py: 1.5,
                                    mt: 2,
                                    borderRadius: 0,
                                    fontFamily: HEADLINE_FONT,
                                    fontWeight: 700,
                                    textTransform: "uppercase",
                                    justifyContent: "space-between",
                                    "&:hover": { bgcolor: "black" },
                                    "& .arrow-icon": { transition: "0.2s" },
                                    "&:hover .arrow-icon": { transform: "translateX(5px)" }
                                }}
                            >
                                {t("button_register")}
                            </Button>

                            <Box sx={{ textAlign: "center", mt: 1 }}>
                                <Link href="/auth/login" sx={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", textDecoration: 'none', color: 'text.secondary', letterSpacing: '0.1em' }}>
                                    {t("link_login")}
                                </Link>
                            </Box>
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
