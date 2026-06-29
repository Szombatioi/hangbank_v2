"use client";

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Box, Button, Dialog, DialogContent, DialogTitle, FormControl,
    Grid, IconButton, MenuItem, Select, Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { BODY, HEADLINE } from "@/app/components/style-constants";
import { useLanguage } from "@/app/providers/language-provider";
import SupportCard, { SupportItem } from "./components/support-card";

// Mocked support items — replace with a real source later. Each logical text shares
// one `id` across languages; `language` distinguishes the translations.
const SUPPORT_ITEMS: SupportItem[] = [
    {
        id: "getting_started_with_recording",
        title: "Getting started with recording",
        shortDescription: "Learn how to set up your microphone and record your first corpus block.",
        longDescription:
            "To start recording, open a corpus-based project and click “Start Recording” on any block. " +
            "Before recording, make sure the microphone configured for the project is connected and that you've " +
            "granted the browser permission to use it. Press the play button to begin, Space to save the current " +
            "take and move to the next block, Enter to stop and keep the take, and Escape to cancel without saving. " +
            "Once a take is finished you can play it back and re-record it if you're not satisfied. Also, you can edit the recorded transcription in case the engine made a mistake in transcribing the audio.\n\n" +
            "To save your progress, click on the Save button, which saves all recordings that have been recorded in that session.",
        language: "en-US",
    },
    {
        id: "getting_started_with_recording",
        title: "A felvétel első lépései",
        shortDescription: "Ismerd meg, hogyan állítsd be a mikrofonodat, és vedd fel az első korpuszblokkot.",
        longDescription:
            "A felvétel megkezdéséhez nyiss meg egy korpuszalapú projektet, és kattints bármelyik blokknál a „Felvétel indítása” gombra. " +
            "Felvétel előtt győződj meg róla, hogy a projekthez beállított mikrofon csatlakoztatva van, és hogy engedélyezted a böngészőnek a használatát. " +
            "A lejátszás gombbal indíthatod a felvételt, a Szóköz menti az aktuális felvételt és a következő blokkra lép, az Enter leállítja és megtartja a felvételt, " +
            "az Escape pedig mentés nélkül megszakítja. Ha egy felvétel elkészült, visszahallgathatod, és újra felveheted, ha nem vagy elégedett vele. " +
            "Az átiratot is szerkesztheted, ha a rendszer hibázott a hang átírásakor.\n\n" +
            "A haladásod mentéséhez kattints a Mentés gombra, amely az adott munkamenetben készült összes felvételt elmenti.",
        language: "hu-HU",
    },
    {
        id: "manage_corpora_and_projects",
        title: "Managing corpora and projects",
        shortDescription: "Upload corpora, create projects from them, and track recording progress.",
        longDescription:
            "Corpora are reusable text sources. Upload one from the Library, where it is automatically split into " +
            "blocks you can preview. When you create a project from a corpus, those blocks are copied into the project " +
            "so each project tracks its own recording progress independently. You can delete a corpus only when no " +
            "project still references it, and only a project's owner can delete the project itself. Progress is shown " +
            "as the share of blocks that have a recording attached.",
        language: "en-US",
    },
    {
        id: "manage_corpora_and_projects",
        title: "Korpuszok és projektek kezelése",
        shortDescription: "Tölts fel korpuszokat, hozz létre belőlük projekteket, és kövesd a felvétel előrehaladását.",
        longDescription:
            "A korpuszok újrafelhasználható szöveges források. Tölts fel egyet a Könyvtárból, ahol a rendszer automatikusan blokkokra bontja, " +
            "amelyeket előnézetben megtekinthetsz. Amikor projektet hozol létre egy korpuszból, ezek a blokkok átmásolódnak a projektbe, " +
            "így minden projekt önállóan követi a saját felvételi előrehaladását. Egy korpuszt csak akkor törölhetsz, ha már egyetlen projekt sem hivatkozik rá, " +
            "és magát a projektet csak a tulajdonosa törölheti. Az előrehaladás azt mutatja, hogy a blokkok mekkora hányadához tartozik már felvétel.",
        language: "hu-HU",
    },
    {
        id: "visibility_options",
        title: "Visibility options",
        shortDescription: "Learn about visibility options for corpora and projects",
        longDescription:
            "For the current demo, only Private visibility is available for corpora and projects. " +
            "This means, that you can only see and use your own corpora and projects.",
        language: "en-US",
    },
    {
        id: "visibility_options",
        title: "Láthatósági beállítások",
        shortDescription: "Ismerd meg a korpuszok és projektek láthatósági beállításait.",
        longDescription:
            "A jelenlegi demóban a korpuszokhoz és projektekhez csak a Privát láthatóság érhető el. " +
            "Ez azt jelenti, hogy csak a saját korpuszaidat és projektjeidet látod és használhatod.",
        language: "hu-HU",
    },
    {
        id: "project_modes",
        title: "Project modes",
        shortDescription: "Learn about what type of project modes are available",
        longDescription:
            "For the current demo, only Corpus-based recording is supported,\n" +
            "which uses a pre-uploaded text-corpus that serves as a guide about what the user has to read out loud while recording.\n" +
            "The Corpus-based recording has quality checks for signal-to-noise (SNR) ratio, volume level, speaker check (same speaker speaks on all audio files) and for transcription (the speaker reads the given text properly).",
        language: "en-US",
    },
    {
        id: "project_modes",
        title: "Projekttípusok",
        shortDescription: "Ismerd meg, milyen projekttípusok érhetők el.",
        longDescription:
            "A jelenlegi demóban csak a korpuszalapú felvétel támogatott,\n" +
            "ez egy előre feltöltött szövegkorpuszt használ, amely útmutatóként szolgál arról, mit kell a felhasználónak felolvasnia a felvétel közben.\n" +
            "A korpuszalapú felvételhez minőségellenőrzések tartoznak: jel-zaj viszony (SNR), hangerőszint, beszélő-ellenőrzés (minden hangfájlon ugyanaz a beszélő hallható) és átirat-ellenőrzés (a beszélő pontosan felolvassa a megadott szöveget).",
        language: "hu-HU",
    },
    {
        id: "export_project",
        title: "Export a project",
        shortDescription: "Exporting a dataset for a given export format",
        longDescription:
            "On the Export page, you can export your datasets to the most common dataset formats.\n" +
            "For this current demo, only LJSpeech format is supported.\n\n" +
            "To export, select the project you would like to export, select the audio files that you would like to export, then click on Initiate Export.",
        language: "en-US",
    },
    {
        id: "export_project",
        title: "Projekt exportálása",
        shortDescription: "Adatkészlet exportálása a kiválasztott formátumba.",
        longDescription:
            "Az Exportálás oldalon a kiválasztott formátumba exportálhatod az adatkészleteidet a legelterjedtebb formátumok közül.\n" +
            "A jelenlegi demóban csak az LJSpeech formátum támogatott.\n\n" +
            "Az exportáláshoz válaszd ki az exportálni kívánt projektet, jelöld ki az exportálandó hangfájlokat, majd kattints az Exportálás indítása gombra.",
        language: "hu-HU",
    },
];

export default function SupportPage() {
    const { t } = useTranslation("common");
    const { language } = useLanguage();
    const baseLang = (language || "en").split("-")[0];

    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [dialogLang, setDialogLang] = useState<string>("");

    // Group items by their shared id, preserving first-seen order.
    const groups = useMemo(() => {
        const map = new Map<string, SupportItem[]>();
        for (const item of SUPPORT_ITEMS) {
            const arr = map.get(item.id) ?? [];
            arr.push(item);
            map.set(item.id, arr);
        }
        return map;
    }, []);

    // One card per support text, shown in the current UI language (falling back to
    // the first available translation if there's none for the active language).
    const cards = useMemo(() => {
        const result: SupportItem[] = [];
        for (const items of groups.values()) {
            result.push(items.find((i) => i.language.split("-")[0] === baseLang) ?? items[0]);
        }
        return result;
    }, [groups, baseLang]);

    const openItem = (item: SupportItem) => {
        setSelectedId(item.id);
        setDialogLang(item.language);
    };

    const dialogItems = selectedId ? groups.get(selectedId) ?? [] : [];
    const dialogItem =
        dialogItems.find((i) => i.language === dialogLang) ?? dialogItems[0] ?? null;

    return (
        <Box sx={{ p: { xs: 3, md: 5 }, maxWidth: 1000, mx: "auto" }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box>
                    <Typography sx={{ fontFamily: HEADLINE, fontWeight: 700, fontSize: "1.5rem", color: "#0f172a", letterSpacing: "-0.02em" }}>
                        {t("support.title")}
                    </Typography>
                    <Typography sx={{ fontFamily: BODY, fontSize: "0.95rem", color: "#64748b", mt: 0.5, mb: 4 }}>
                        {t("support.subtitle")}
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    onClick={() => {
                        if (process.env.NEXT_PUBLIC_SUBMIT_URL) open(process.env.NEXT_PUBLIC_SUBMIT_URL, "_blank");
                    }}>
                    {t("support.submit_button")}
                </Button>
            </Box>

            <Grid container spacing={3}>
                {cards.map((item) => (
                    <Grid key={item.id} size={{ xs: 12, sm: 6 }}>
                        <SupportCard item={item} onClick={() => openItem(item)} />
                    </Grid>
                ))}
            </Grid>

            <Dialog
                open={!!dialogItem}
                onClose={() => setSelectedId(null)}
                maxWidth="sm"
                fullWidth
                PaperProps={{ sx: { borderRadius: 3 } }}
            >
                <DialogTitle sx={{ fontFamily: HEADLINE, fontWeight: 700, fontSize: "1.25rem", color: "#0f172a", textAlign: "center", pt: 3, px: 5 }}>
                    {dialogItem?.title}
                    <IconButton
                        onClick={() => setSelectedId(null)}
                        sx={{ position: "absolute", right: 12, top: 12, color: "#94a3b8" }}
                    >
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    {/* Language switcher for this support text */}
                    {dialogItems.length > 1 && (
                        <FormControl size="small" sx={{ mb: 2, minWidth: 180 }}>
                            <Select
                                value={dialogLang}
                                onChange={(e) => setDialogLang(e.target.value)}
                                sx={{ borderRadius: "8px", fontFamily: BODY, fontSize: "0.875rem" }}
                            >
                                {dialogItems.map((i) => (
                                    <MenuItem key={i.language} value={i.language}>
                                        {t(`language.lang_${i.language}`)}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}
                    <Typography sx={{ fontFamily: BODY, fontSize: "0.95rem", color: "#475569", lineHeight: 1.75, whiteSpace: "pre-line" }}>
                        {dialogItem?.longDescription}
                    </Typography>
                </DialogContent>
            </Dialog>
        </Box>
    );
}
