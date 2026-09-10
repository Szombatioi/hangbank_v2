"use client";
//TODO: file feltöltésnél nincs semmi visszajelzés, hogy sikerült-e vagy sem, illetve a feltöltés folyamatáról sincs semmilyen indikátor. Ezt mindenképp érdemes lenne megoldani, mert nagyobb fájloknál elég bizonytalan lehet a helyzet. (pl. egy 100MB-s fájl feltöltése akár több percig is eltarthat, és ha nincs semmi visszajelzés, akkor a user azt hiheti, hogy nem történik semmi, és újra megpróbálja feltölteni, ami tovább növeli a terhelést)
import FileUpload from "@/app/components/file_upload";
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  createFilterOptions,
  Grid,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  TextField,
  Typography,
} from "@mui/material";
import { ChangeEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { LanguageDto } from "@/app/components/types/language.dto";
import { CorpusVisibility } from "@/app/components/types/corpus.dto";
import { VisibilitySelector } from "@/app/components/visibility-selector";
import { UserAccessSelector, AccessUser } from "@/app/components/user-access-selector";
import { translateHttpError } from "@/app/components/helpers/http-error";
import api from "@/app/axios";
import { Severity, useSnackbar } from "@/app/providers/SnackbarProvider";
import { useRouter } from "next/navigation";

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
  const [domainOptions, setDomainOptions] = useState<string[]>([]);

  // Right panel state
  const [visibility, setVisibility] = useState<CorpusVisibility>("private");
  const [accessUsers, setAccessUsers] = useState<AccessUser[]>([]);

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
        showMessage(translateHttpError(error, t, t("error.language_load")), Severity.error)
      }
    }

    fetchLanguages();
  }, []);

  // Existing domains offered as suggestions; the user may still type a new one (freeSolo)
  useEffect(() => {
    async function fetchDomains() {
      try {
        const response = await api.get<{ name: string }[]>("/corpus-domain");
        setDomainOptions(response.data.map((d) => d.name));
      } catch (error) {
        console.error("Failed to fetch domains:", error);
      }
    }

    fetchDomains();
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

  const handleUpload = async () => {
    if (!file || !corpusLanguage || !corpusTitle || !corpusDomain) {
      showMessage(t("upload.fill_all"), Severity.error);
      return;
    }

    //TODO: innen folytatni: teszteljük le a feltöltést!
    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", corpusTitle);
    formData.append("languageCode", corpusLanguage?.code);
    formData.append("domainName", corpusDomain);
    formData.append("visibility", visibility);
    if (visibility === "protected" && accessUsers.length > 0) {
      formData.append("userAccesses", JSON.stringify(accessUsers.map((u) => u.id)));
    }
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
      console.error("Upload failed:", ex);
      showMessage(translateHttpError(ex, t, t("corpus_upload.failure")), Severity.error);
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
            sx={{ backgroundColor: "var(--app-surface-muted)", py: 4, px: 4, borderRadius: 4, display: "flex", flexDirection: "column", gap: 2 }}
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
              <Autocomplete
                freeSolo
                options={domainOptions}
                filterOptions={createFilterOptions<string>({ limit: 50, trim: true })}
                inputValue={corpusDomain}
                onInputChange={(_, value) => setCorpusDomain(value)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder={t("upload_corpus_page.corpus_domain_placeholder")}
                    fullWidth
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px" } }}
                  />
                )}
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
            sx={{ backgroundColor: "var(--app-surface-muted)", py: 3, px: 3, borderRadius: 4 }}
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

            <Box sx={{ mt: 1.5 }}>
              <VisibilitySelector value={visibility} onChange={setVisibility} />
            </Box>
          </Paper>

          {visibility === "protected" && (
            <Paper
              elevation={0}
              sx={{ backgroundColor: "var(--app-surface-muted)", py: 3, px: 3, borderRadius: 4 }}
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
                    bgcolor: "var(--app-info-bg)",
                    color: "var(--app-info-fg)",
                    fontWeight: 700,
                    fontSize: "0.65rem",
                    letterSpacing: "0.08em",
                    borderRadius: "999px",
                  }}
                />
              </Box>

              <UserAccessSelector value={accessUsers} onChange={setAccessUsers} />
            </Paper>
          )}

          {file && file.name.split('.').pop()?.toLowerCase() === "pdf" && (
            <>
              <Paper elevation={0}
                sx={{ backgroundColor: "var(--app-surface-muted)", py: 3, px: 3, borderRadius: 4 }}>
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
