"use client";
import { Grid, Paper, Typography, Box, Container } from "@mui/material";
import { useTranslation } from "react-i18next";

interface Card {
    title: string;
    disabled: boolean;
    onClick: () => void;
}

export enum ProjectType {
    CORPUS = "corpus",
    AI_CHAT = "ai chat",
    MULTI_SPEAKER = "multi-speaker",
    EXISTING_FILES= "existing files"
};

interface ProjectTypeSelectorProps{
    onSelect: (type: ProjectType) => void
}

export default function ProjectTypeSelector({onSelect}: ProjectTypeSelectorProps) {
    const { t } = useTranslation("common");

    const cards: Card[] = [
        { 
            title: t("new_project.corpus_based_title"), 
            disabled: false,
            onClick: () => {onSelect(ProjectType.CORPUS)}
        },
        { 
            title: t("new_project.ai_chat_title"), 
            disabled: true,
            onClick: () => {onSelect(ProjectType.AI_CHAT)}
        },
        { 
            title: t("new_project.multi_speaker_conversation_title"), 
            disabled: true,
            onClick: () => {onSelect(ProjectType.MULTI_SPEAKER)}
        },
        { 
            title: t("new_project.existing_files_title"), 
            disabled: true,
            onClick: () => {onSelect(ProjectType.EXISTING_FILES)}
        },
    ];

    return (
        <Container maxWidth="md" sx={{ py: 8 }}>
            <Grid container spacing={4}>
                {cards.map((card) => (
                    <Grid key={card.title} size={{ xs: 6 }}>
                        <Paper
                            elevation={0}
                            sx={{
                                position: "relative",
                                width: "100%",
                                paddingTop: "65%",
                                border: "3px solid",
                                borderColor: card.disabled ? "var(--app-border)" : "black",
                                borderRadius: 4,
                                transition: "transform 0.2s, border-color 0.2s",
                                pointerEvents: card.disabled ? "none" : "auto",
                                ...(!card.disabled && {
                                    "&:hover": {
                                        borderColor: "#ed4a14",
                                        cursor: "pointer",
                                        transform: "translateY(-2px)",
                                    },
                                }),
                            }}
                            onClick={card.onClick}
                        >
                            <Box
                                sx={{
                                    position: "absolute",
                                    top: 0,
                                    left: 0,
                                    width: "100%",
                                    height: "100%",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    p: 3,
                                }}
                            >
                                <Typography
                                    variant="button"
                                    align="center"
                                    sx={{
                                        fontSize: { xs: "0.8rem", md: "1rem" },
                                        color: card.disabled ? "#aaa" : "inherit",
                                    }}
                                >
                                    {card.title}
                                </Typography>
                            </Box>
                        </Paper>
                    </Grid>
                ))}
            </Grid>
        </Container>
    );
}