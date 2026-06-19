"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Box, CircularProgress, Typography } from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import api from "@/app/axios";
import Recorder, { RecorderAudioFile } from "@/app/components/recorder";
import { BODY, HEADLINE, LABEL } from "@/app/components/style-constants";

//TODO: 
// prompt for recorder if we want to re-record an existing audio file
// save button if the new recording is different from the existing one (and overwrite the old)
// list of AQC elements
// data of file (length, format, date, name etc.)

export default function ViewRecording() {
    const { t } = useTranslation("common");
    const params = useParams();
    const aid = params.aid as string;

    const [audioFile, setAudioFile] = useState<RecorderAudioFile | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        api.get<RecorderAudioFile>(`/project/audio-file/${aid}`)
            .then((r) => setAudioFile(r.data))
            .catch(() => setNotFound(true))
            .finally(() => setLoading(false));
    }, [aid]);

    if (loading) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 12 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (notFound || !audioFile) {
        return (
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, mt: 12 }}>
                <WarningAmberIcon sx={{ fontSize: 48, color: "warning.main" }} />
                <Typography sx={{ fontFamily: BODY, fontWeight: 600, color: "#0f172a", textAlign: "center", maxWidth: 420 }}>
                    {t("view_recording.not_found")}
                </Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ p: { xs: 3, md: 5 }, maxWidth: 760, mx: "auto" }}>
            <Typography sx={{ fontFamily: HEADLINE, fontWeight: 700, fontSize: "1.5rem", color: "#0f172a", letterSpacing: "-0.02em", mb: 1 }}>
                {t("view_recording.title")}
            </Typography>

            {audioFile.transcription && (
                <Typography sx={{ fontFamily: LABEL, fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#94a3b8", mb: 0.5 }}>
                    {t("view_recording.transcription")}
                </Typography>
            )}
            <Typography sx={{ fontFamily: BODY, fontSize: "1rem", color: "#1e293b", lineHeight: 1.6, mb: 3 }}>
                {t("view_recording.transcription_label")}: {audioFile.transcription || "—"}
            </Typography>

            <Recorder
                deviceId=""
                onAudioBlob={() => { /* TODO: implement re-recording functionality */ }}
                recordedAudio={audioFile}
            />
        </Box>
    );
}
