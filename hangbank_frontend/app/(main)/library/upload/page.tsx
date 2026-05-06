"use client";
//TODO: file feltöltésnél nincs semmi visszajelzés, hogy sikerült-e vagy sem, illetve a feltöltés folyamatáról sincs semmilyen indikátor. Ezt mindenképp érdemes lenne megoldani, mert nagyobb fájloknál elég bizonytalan lehet a helyzet. (pl. egy 100MB-s fájl feltöltése akár több percig is eltarthat, és ha nincs semmi visszajelzés, akkor a user azt hiheti, hogy nem történik semmi, és újra megpróbálja feltölteni, ami tovább növeli a terhelést)
import FileUpload from "@/app/components/file_upload";
import {
  Avatar,
  Box,
  Button,
  Chip,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  OutlinedInput,
  Paper,
  Radio,
  Select,
  SelectChangeEvent,
  TextField,
  Typography,
} from "@mui/material";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import CloseIcon from "@mui/icons-material/Close";
import { ChangeEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { LanguageDto } from "@/app/components/types/language.dto";
import api from "@/app/axios";
import { Severity, useSnackbar } from "@/app/contexts/SnackbarProvider";
import { useRouter } from "next/navigation";

type Visibility = "private" | "public" | "protected";

const AVATAR_COLORS = ["#2f4470", "#8fa8c8", "#5a7a9e", "#3d5a80"];

function getInitials(email: string): string {
  const name = email.split("@")[0];
  const parts = name.split(/[._-]/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++)
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function CorpusUploadPage() {
  const { t } = useTranslation("common");
  const { showMessage } = useSnackbar();
  const router = useRouter();

  // Left panel state
  const [corpusLanguage, setCorpusLanguage] = useState<LanguageDto | null>(
    null
  );
  const [supportedLanguages, setSupportedLanguages] = useState<LanguageDto[]>(
    []
  ); //TODO: fetch
  const [corpusTitle, setCorpusTitle] = useState<string>("");
  const [corpusDomain, setCorpusDomain] = useState<string>("");

  // Right panel state
  const [visibility, setVisibility] = useState<Visibility>("private");
  const [collaboratorInput, setCollaboratorInput] = useState("");
  const [collaborators, setCollaborators] = useState<string[]>([]);

  const [file, setFile] = useState<File | null>(null);

  const [pageSkips, setPageSkips] = useState("0");

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setPageSkips(raw);
    // setError(raw !== "" && (isNaN(raw) || Number(raw) < 0));
  };

  useEffect(() => {
    async function fetchLanguages() {
      try {
        const response = await api.get("/language");
        setCorpusLanguage(
          response.data.find((lang: LanguageDto) => lang.code === "en-US") ||
          null
        ); //Default to English if available
        setSupportedLanguages(response.data);
      } catch (error) {
        console.error("Failed to fetch languages:", error);
        showMessage(t("error.language_load"), Severity.error)
      }
    }

    fetchLanguages();
  }, []);

  const handleLanguageChange = (event: SelectChangeEvent) => {
    // const language = supportedLanguages.find((lang) => lang.name === event.target.value); //e.g. lang_en_us
    const language = supportedLanguages.find((lang) => lang.code === event.target.value);
    if (!language) {
      //TODO: snackbar
      return;
    }
    setCorpusLanguage(language);
  };

  const addCollaborator = () => {
    const email = collaboratorInput.trim();
    if (email && !collaborators.includes(email)) {
      setCollaborators([...collaborators, email]);
      setCollaboratorInput("");
    }
  };

  const removeCollaborator = (email: string) => {
    setCollaborators(collaborators.filter((c) => c !== email));
  };

  //TODO: share enum type with backend
  const visibilityOptions: {
    value: Visibility;
    label: string;
    description: string;
  }[] = [
      {
        value: "private",
        label: t("upload_corpus_page.visibility.private"),
        description: t("upload_corpus_page.visibility.private_desc"),
      },
      {
        value: "public",
        label: t("upload_corpus_page.visibility.public"),
        description: t("upload_corpus_page.visibility.public_desc"),
      },
      {
        value: "protected",
        label: t("upload_corpus_page.visibility.protected"),
        description: t("upload_corpus_page.visibility.protected_desc"),
      },
    ];

  //TODO: handle collaborators
  const handleUpload = async () => {
    if (!file || !corpusLanguage || !corpusTitle || !corpusDomain) {
      //TODO: snackbar
      return;
    }

    //TODO: innen folytatni: teszteljük le a feltöltést!
    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", corpusTitle);
    formData.append("languageCode", corpusLanguage?.code);
    formData.append("domainName", corpusDomain);
    formData.append("visibility", visibility);
    if (parseInt(pageSkips) > 0) {
      formData.append("pageSkips", pageSkips);
    }
    try {
      await api.post("/corpus", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      showMessage(t("corpus_upload.success"), Severity.success);
      router.replace("/library");
    } catch (ex) {
      //TODO: snackbar
      console.error("Upload failed:", ex);
      showMessage(t("corpus_upload.failure"), Severity.error);
    }
  };

  return (
    <>
      <div style={{ width: "60%" }}>
        <Typography variant="h4" gutterBottom color="primary">
          {t("upload_corpus_page.title")}
        </Typography>
        <Typography variant="subtitle1" gutterBottom color="secondary">
          {t("upload_corpus_page.description")}
        </Typography>
      </div>

      <Grid container spacing={2} style={{ marginTop: "1rem" }}>
        {/* ── Left panel ── */}
        <Grid
          size={{ xs: 12, md: 7 }}
          sx={{ display: "flex", flexDirection: "column", gap: 2 }}
        >
          <FileUpload
            onFileSelected={(file) => {
              setFile(file);
              console.log(file.name);
            }}
            onFileRemoved={() => {
              setFile(null);
              setPageSkips("0");
            }}
          />

          <Paper
            elevation={0}
            sx={{ backgroundColor: "#f3f4f5", py: 4, px: 4, borderRadius: 4, display: "flex", flexDirection: "column", gap: 2 }}
          >
            <div style={{}}>
              <Typography
                variant="h6"
                sx={{ textTransform: "capitalize" }}
                gutterBottom
                color="primary"
              >
                {t("upload_corpus_page.language_selection")}
              </Typography>
              <Select
                value={corpusLanguage ? t(`language.${corpusLanguage?.name}`) : ""}
                onChange={handleLanguageChange}
                fullWidth
                sx={{ borderRadius: 4 }}
                displayEmpty
                // renderValue={(selected) =>
                //   selected.length === 0 ? (
                //     <em style={{ color: "#aaa", fontStyle: "normal" }}>
                //       {t("upload_corpus_page.select_language_placeholder")}
                //     </em>
                //   ) : (
                //     selected
                //   )
                // }
                renderValue={(selected) => {
                  if (!selected)
                    return (
                      <em style={{ color: "#aaa", fontStyle: "normal" }}>
                        {t("upload_corpus_page.select_language_placeholder")}
                      </em>
                    );
                  const lang = supportedLanguages.find(
                    (l) => l.code === selected
                  );
                  return lang ? t(`language.${lang.name}`) : selected;
                }}
              >
                {supportedLanguages.map((lang) => (
                  <MenuItem key={lang.code} value={lang.code}>
                    {t(`language.${lang.name}`)}
                  </MenuItem>
                ))}
              </Select>
            </div>

            {/* Title */}
            <div>
              <Typography
                variant="h6"
                sx={{ textTransform: "capitalize" }}
                gutterBottom
                color="primary"
              >
                {t("upload_corpus_page.corpus_title")}
              </Typography>
              <TextField
                value={corpusTitle}
                onChange={(e) => setCorpusTitle(e.target.value)}
                placeholder={t("upload_corpus_page.corpus_title_placeholder")}
                fullWidth
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px" } }}
              />
            </div>

            {/* Domain */}
            <div>
              <Typography
                variant="h6"
                sx={{ textTransform: "capitalize" }}
                gutterBottom
                color="primary"
              >
                {t("upload_corpus_page.domain")}
              </Typography>
              {/* TODO: replace with auto search for existing domain names */}
              <TextField
                value={corpusDomain}
                onChange={(e) => setCorpusDomain(e.target.value)}
                placeholder={t("upload_corpus_page.corpus_domain_placeholder")}
                fullWidth
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px" } }}
              />
            </div>
          </Paper>

          <Button
            variant="contained"
            color="primary"
            sx={{ borderRadius: 4, py: 2, width: "75%", alignSelf: "center" }}
            onClick={() => handleUpload()}
          >
            {t("upload_corpus_page.submit_button")}
          </Button>
        </Grid>

        {/* ── Right panel ── */}
        <Grid
          size={{ xs: 12, md: 5 }}
          sx={{ display: "flex", flexDirection: "column", gap: 2 }}
        >
          {/* Visibility Settings */}
          <Paper
            elevation={0}
            sx={{ backgroundColor: "#f3f4f5", py: 3, px: 3, borderRadius: 4 }}
          >
            <Typography
              variant="overline"
              sx={{
                color: "text.secondary",
                fontWeight: 700,
                letterSpacing: "0.12em",
              }}
            >
              {t("upload_corpus_page.visibility.title")}
            </Typography>

            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 1.5,
                mt: 1.5,
              }}
            >
              {visibilityOptions.map((option) => {
                const isSelected = visibility === option.value;
                return (
                  <Box
                    key={option.value}
                    onClick={() => setVisibility(option.value)}
                    sx={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 1.5,
                      px: 2,
                      py: 1.5,
                      borderRadius: 3,
                      cursor: "pointer",
                      border: "1.5px solid",
                      borderColor: isSelected ? "#b8c8e8" : "transparent",
                      bgcolor: isSelected ? "#e8eef8" : "transparent",
                      transition: "all 0.15s",
                    }}
                  >
                    <Radio
                      checked={isSelected}
                      onChange={() => setVisibility(option.value)}
                      size="small"
                      sx={{
                        p: 0,
                        mt: "2px",
                        color: isSelected ? "#1a1a1a" : "#aaa",
                      }}
                    />
                    <Box>
                      <Typography
                        variant="body1"
                        fontWeight={700}
                        color="text.primary"
                      >
                        {option.label}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {option.description}
                      </Typography>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Paper>

          {visibility === "protected" && (
            <Paper
              elevation={0}
              sx={{ backgroundColor: "#f3f4f5", py: 3, px: 3, borderRadius: 4 }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  mb: 2,
                }}
              >
                <Typography
                  variant="overline"
                  sx={{
                    color: "text.secondary",
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                  }}
                >
                  {t("upload_corpus_page.access_control.title")}
                </Typography>
                <Chip
                  label={t(
                    "upload_corpus_page.access_control.restricted_badge"
                  )}
                  size="small"
                  sx={{
                    bgcolor: "#dde6f5",
                    color: "#4a6fa5",
                    fontWeight: 700,
                    fontSize: "0.65rem",
                    letterSpacing: "0.08em",
                    borderRadius: "999px",
                  }}
                />
              </Box>

              {/* Email input */}
              <OutlinedInput
                value={collaboratorInput}
                onChange={(e) => setCollaboratorInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCollaborator()}
                placeholder={t(
                  "upload_corpus_page.access_control.add_collaborator_placeholder"
                )}
                fullWidth
                size="small"
                endAdornment={
                  <InputAdornment position="end">
                    <IconButton
                      onClick={addCollaborator}
                      edge="end"
                      size="small"
                    >
                      <PersonAddIcon sx={{ color: "#4a6fa5" }} />
                    </IconButton>
                  </InputAdornment>
                }
                sx={{
                  bgcolor: "#e8edf5",
                  borderRadius: 2,
                  "& fieldset": { border: "none" },
                  mb: 2,
                }}
              />

              {/* Collaborator list */}
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {collaborators.map((email) => (
                  <Box
                    key={email}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
                    >
                      <Avatar
                        sx={{
                          width: 36,
                          height: 36,
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          bgcolor: stringToColor(email),
                        }}
                      >
                        {getInitials(email)}
                      </Avatar>
                      <Typography variant="body2" color="text.primary">
                        {email}
                      </Typography>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={() => removeCollaborator(email)}
                    >
                      <CloseIcon
                        fontSize="small"
                        sx={{ color: "text.secondary" }}
                      />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            </Paper>
          )}

          {file && file.name.split('.').pop()?.toLowerCase() === "pdf" && (
            <>
              <Paper elevation={0}
                sx={{ backgroundColor: "#f3f4f5", py: 3, px: 3, borderRadius: 4 }}>
                <Typography
                  variant="h6"
                  sx={{ textTransform: "capitalize" }}
                  gutterBottom
                  color="primary"
                >
                  {t("upload_corpus_page.skip_pages")}
                </Typography>
                <TextField
                  fullWidth
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px" } }}
                  type="number"
                  value={pageSkips}
                  onChange={handleChange}
                  inputProps={{ min: 0, step: 1 }}
                  onKeyDown={(e) => {
                    if (e.key === "-" || e.key === "e") e.preventDefault();
                  }}
                />
              </Paper>
            </>
          )}
        </Grid>
      </Grid>
    </>
  );
}
