"use client";
import {
    Box, Button, Link, Paper, TextField, Typography, InputAdornment, Avatar,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import AddAPhotoIcon from '@mui/icons-material/AddAPhoto';
import { ArrowForward } from "@mui/icons-material";

const HEADLINE_FONT = "'Space Grotesk', sans-serif";
const BODY_FONT = "'Inter', sans-serif";
const LABEL_FONT = "'Manrope', sans-serif";

const COLORS = {
    primaryAccent: "#ed4a14",
    secondaryText: "#47607e",
    inputBg: "#f3f4f5",
    borderColor: "#c4c6cc",
    darkBg: "#1B263B",
};

export default function LoginPage() {
    const { t } = useTranslation("common");

    const labelStyle = {
        fontFamily: LABEL_FONT,
        fontSize: "10px",
        fontWeight: 800,
        color: COLORS.secondaryText,
        textTransform: "uppercase",
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
                // textTransform: "uppercase",
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
                backgroundColor: "#f0f2f5",
                p: 2
            }}
        >
            <Paper
                elevation={6}
                sx={{
                    width: '100%',
                    maxWidth: "1100px",
                    display: 'flex',
                    minHeight: '700px',
                    borderRadius: 2,
                    overflow: 'hidden'
                }}
            >
                {/* Left part: Sidebar */}
                <Box
                    sx={{
                        width: { xs: '0%', md: '25%' },
                        display: { xs: 'none', md: 'flex' },
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        backgroundColor: COLORS.darkBg,
                        color: 'white',
                        p: 6
                    }}
                >
                    <Box>
                        <Typography variant="h4" sx={{ fontFamily: HEADLINE_FONT, fontWeight: 700, mb: 2 }}>
                            {t("brand_name")}
                        </Typography>
                        <Typography variant="body1" sx={{ opacity: 0.7, fontFamily: BODY_FONT }}>
                            {t("register_subtitle")}
                        </Typography>
                    </Box>
                </Box>

                {/* Right part: Registration form */}
                <Box
                    component="section"
                    sx={{
                        flex: 1,
                        bgcolor: "#ffffff",
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
                            {/* <Typography sx={{ fontFamily: BODY_FONT, color: "text.secondary", fontSize: "0.85rem" }}>
                                {t("register_description")}
                            </Typography> */}
                        </header>

                        <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                            {/* Profile Picture */}
                            <Box>
                                <Typography sx={labelStyle}>{t("label_identity")}</Typography>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                                    <Avatar sx={{ bgcolor: COLORS.inputBg, width: 56, height: 56, border: `1px dashed ${COLORS.borderColor}` }}>
                                        <AddAPhotoIcon sx={{ color: COLORS.secondaryText }} />
                                    </Avatar>
                                    <Button variant="text" sx={{ fontSize: '10px', fontWeight: 800, fontFamily: LABEL_FONT }}>
                                        {t("button_upload_image")}
                                    </Button>
                                </Box>
                            </Box>

                            {/* Name Fields */}
                            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                                <Box>
                                    <Typography sx={labelStyle}>{t("label_first_name")}</Typography>
                                    <TextField fullWidth variant="filled" placeholder={t("placeholder_first_name")} sx={inputSx} hiddenLabel />
                                </Box>
                                <Box>
                                    <Typography sx={labelStyle}>{t("label_last_name")}</Typography>
                                    <TextField fullWidth variant="filled" placeholder={t("placeholder_last_name")} sx={inputSx} hiddenLabel />
                                </Box>
                            </Box>

                            {/* Username with centered @ adornment */}
                            <Box>
                                <Typography sx={labelStyle}>{t("label_username")}</Typography>
                                <TextField
                                    fullWidth
                                    variant="filled"
                                    placeholder={t("placeholder_username")}
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
                                    placeholder={t("placeholder_email")} 
                                    sx={{ ...inputSx, "& input": { textTransform: "none" } }} 
                                />
                            </Box>

                            {/* Passwords */}
                            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                                <Box>
                                    <Typography sx={labelStyle}>{t("label_password")}</Typography>
                                    <TextField fullWidth type="password" variant="filled" sx={inputSx} />
                                </Box>
                                <Box>
                                    <Typography sx={labelStyle}>{t("label_verify")}</Typography>
                                    <TextField fullWidth type="password" variant="filled" sx={inputSx} />
                                </Box>
                            </Box>

                            {/* Submit */}
                            <Button
                                fullWidth
                                variant="contained"
                                disableElevation
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