"use client";
import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Box, Typography, Chip, Button, CircularProgress } from "@mui/material";
import TuneIcon from "@mui/icons-material/Tune";
import SortIcon from "@mui/icons-material/Sort";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import NorthEastIcon from "@mui/icons-material/NorthEast";
import ArchiveOutlinedIcon from "@mui/icons-material/ArchiveOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import AlbumIcon from "@mui/icons-material/Album";
import { useRouter } from "next/navigation";
import { AxiosError } from "axios";
import api from "@/app/axios";
import { CorpusDto, CorpusVisibility } from "@/app/components/types/corpus.dto";
import { LanguageDto } from "@/app/components/types/language.dto";
import ConfirmDialog from "@/app/components/confirm-dialog";
import { useSnackbar, Severity } from "@/app/contexts/SnackbarProvider";

const HEADLINE = "'Space Grotesk', sans-serif";
const LABEL = "'Manrope', sans-serif";
const BODY = "'Inter', sans-serif";

const VISIBILITY_OPTIONS: CorpusVisibility[] = ["public", "protected", "private"];

function visibilityChipStyle(v: string) {
  if (v === "public") return { bgcolor: "#d1fae5", color: "#065f46" };
  if (v === "private") return { bgcolor: "#fef3c7", color: "#92400e" };
  return { bgcolor: "#e2e8f0", color: "#475569" };
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography sx={{ fontFamily: LABEL, fontSize: "0.6rem", textTransform: "uppercase", color: "#94a3b8", fontWeight: 700, letterSpacing: "0.15em", mb: 0.5 }}>
        {label}
      </Typography>
      <Typography sx={{ fontFamily: LABEL, fontSize: "0.875rem", fontWeight: 600, color: "#334155" }}>
        {value}
      </Typography>
    </Box>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography sx={{ fontFamily: LABEL, fontSize: "0.5625rem", textTransform: "uppercase", color: "#94a3b8", fontWeight: 700, letterSpacing: "0.15em", mb: 0.25 }}>
        {label}
      </Typography>
      <Typography sx={{ fontFamily: LABEL, fontSize: "0.75rem", fontWeight: 600, color: "#334155" }}>
        {value}
      </Typography>
    </Box>
  );
}

function VisibilityIcon({ v }: { v: string }) {
  if (v === "protected") return <LockOutlinedIcon sx={{ fontSize: "1.2rem", color: "#94a3b8" }} />;
  if (v === "private") return <VisibilityOffOutlinedIcon sx={{ fontSize: "1.2rem", color: "#94a3b8" }} />;
  return null;
}

function VisibilityBadge({ visibility, t }: { visibility: string; t: (k: string) => string }) {
  return (
    <Typography
      component="span"
      sx={{
        ...visibilityChipStyle(visibility),
        px: 1.5, py: 0.5,
        borderRadius: "999px",
        fontFamily: LABEL,
        fontSize: "0.625rem",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.15em",
        display: "inline-block",
      }}
    >
      {t(`library_page.visibility.${visibility}`)}
    </Typography>
  );
}

function FeaturedCard({ corpus, t, router, onArchive }: { corpus: CorpusDto; t: (k: string) => string; router: ReturnType<typeof useRouter>; onArchive: () => void }) {
  const date = corpus.createdAt
    ? new Date(corpus.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "—";

  return (
    <Box
      sx={{
        gridColumn: { md: "span 2" },
        position: "relative",
        bgcolor: "#ffffff",
        p: 4,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        overflow: "hidden",
        transition: "box-shadow 0.3s",
        "&:hover": { boxShadow: "0 4px 24px 0 rgba(0,0,0,0.07)" },
      }}
    >
      {/* Visibility badge */}
      <Box sx={{ position: "absolute", top: 24, right: 24 }}>
        <VisibilityBadge visibility={corpus.visibility} t={t} />
      </Box>

      {/* Content */}
      <Box sx={{ maxWidth: "32rem", display: "flex", flexDirection: "column", gap: 2 }}>
        <Typography sx={{ fontFamily: LABEL, fontSize: "0.7rem", fontWeight: 700, color: "#ed4a14", textTransform: "uppercase", letterSpacing: "0.2em" }}>
          {t("library_page.primary_archive_label")}
        </Typography>
        <Typography sx={{ fontFamily: HEADLINE, fontSize: "1.875rem", fontWeight: 700, color: "#0f172a", lineHeight: 1.2 }}>
          {corpus.name}
        </Typography>
        {corpus.domain && (
          <Typography sx={{ fontFamily: BODY, color: "#47607e", lineHeight: 1.6 }}>
            {corpus.domain.name}
          </Typography>
        )}
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2, pt: 2 }}>
          <Stat label={t("library_page.label_language")} value={t(`language.${corpus.language.name}`)} />
          <Stat label={t("library_page.label_domain")} value={corpus.domain?.name ?? "—"} />
          <Stat label={t("library_page.label_uploaded")} value={date} />
        </Box>
      </Box>

      {/* Actions */}
      <Box sx={{ mt: 6, display: "flex", alignItems: "center", gap: 2 }}>
        <Button
          variant="contained"
          endIcon={<ArrowForwardIcon />}
          onClick={() => window.open((`/library/${corpus.id}`), '_blank')}
          sx={{ bgcolor: "#191c1d", color: "#fff", borderRadius: 2, fontFamily: LABEL, fontWeight: 700, fontSize: "0.875rem", px: 3, py: 1.25, "&:hover": { bgcolor: "#0f172a" }, textTransform: "none" }}
        >
          {t("library_page.view_corpus")}
        </Button>
        <Button
          variant="text"
          startIcon={<ArchiveOutlinedIcon />}
          onClick={onArchive}
          sx={{ color: "#64748b", fontFamily: LABEL, fontWeight: 700, fontSize: "0.875rem", textTransform: "none", "&:hover": { color: "#0f172a", bgcolor: "transparent" } }}
        >
          {t("library_page.archive_button")}
        </Button>
      </Box>

      {/* Decorative icon */}
      <Box sx={{ position: "absolute", bottom: -40, right: -40, opacity: 0.05, pointerEvents: "none" }}>
        <AlbumIcon sx={{ fontSize: "12rem" }} />
      </Box>
    </Box>
  );
}

function RegularCard({ corpus, t, router, onArchive }: { corpus: CorpusDto; t: (k: string) => string; router: ReturnType<typeof useRouter>; onArchive: () => void }) {
  return (
    <Box
      sx={{
        bgcolor: "#edeeef",
        p: 3,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        transition: "background-color 0.3s",
        "&:hover": { bgcolor: "#e7e8e9" },
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 3 }}>
        <VisibilityBadge visibility={corpus.visibility} t={t} />
        <VisibilityIcon v={corpus.visibility} />
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        <Typography sx={{ fontFamily: HEADLINE, fontSize: "1.25rem", fontWeight: 700, color: "#0f172a", lineHeight: 1.3 }}>
          {corpus.name}
        </Typography>
        {corpus.domain && (
          <Typography
            sx={{
              fontFamily: BODY, fontSize: "0.875rem", color: "#47607e",
              overflow: "hidden", display: "-webkit-box",
              WebkitLineClamp: 3, WebkitBoxOrient: "vertical",
            }}
          >
            {corpus.domain.name}
          </Typography>
        )}
        <Box sx={{ pt: 2, display: "flex", flexWrap: "wrap", gap: "0.75rem 1.5rem" }}>
          <MiniStat label={t("library_page.label_language")} value={t(`language.${corpus.language.name}`)} />
          {corpus.domain && <MiniStat label={t("library_page.label_domain")} value={corpus.domain.name} />}
        </Box>
      </Box>

      <Box sx={{ mt: 4, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Button
          variant="text"
          endIcon={<NorthEastIcon sx={{ fontSize: "0.875rem !important" }} />}
          onClick={() => router.push(`/library/${corpus.id}`)}
          sx={{ color: "#191c1d", fontFamily: LABEL, fontWeight: 700, fontSize: "0.875rem", textTransform: "none", p: 0, "&:hover": { bgcolor: "transparent", opacity: 0.6 }, minWidth: 0 }}
        >
          {t("library_page.view_button")}
        </Button>
        <Button
          variant="text"
          onClick={onArchive}
          sx={{ color: "#94a3b8", minWidth: 0, p: 0.5, "&:hover": { color: "#ef4444", bgcolor: "transparent" } }}
        >
          <ArchiveOutlinedIcon sx={{ fontSize: "1.25rem" }} />
        </Button>
      </Box>
    </Box>
  );
}

function AddCard({ t, router }: { t: (k: string) => string; router: ReturnType<typeof useRouter> }) {
  return (
    <Box
      onClick={() => router.push("/library/upload")}
      sx={{
        border: "2px dashed #e2e8f0",
        p: 3,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        gap: 2,
        cursor: "pointer",
        minHeight: 200,
        transition: "all 0.2s",
        "&:hover": { borderColor: "#94a3b8", bgcolor: "#f8fafc" },
        "&:hover .add-icon-wrapper": { bgcolor: "#191c1d", color: "#fff" },
      }}
    >
      <Box
        className="add-icon-wrapper"
        sx={{ width: 48, height: 48, borderRadius: "50%", bgcolor: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", transition: "all 0.2s" }}
      >
        <AddCircleOutlineIcon />
      </Box>
      <Box>
        <Typography sx={{ fontFamily: HEADLINE, fontWeight: 700, color: "#0f172a", fontSize: "1rem" }}>
          {t("library_page.new_corpus_title")}
        </Typography>
        <Typography sx={{ fontFamily: BODY, fontSize: "0.75rem", color: "#94a3b8", mt: 0.5 }}>
          {t("library_page.new_corpus_subtitle")}
        </Typography>
      </Box>
    </Box>
  );
}

export default function LibraryPage() {
  const { t } = useTranslation("common");
  const { showMessage } = useSnackbar();
  const router = useRouter();

  const [corpora, setCorpora] = useState<CorpusDto[]>([]);
  const [languages, setLanguages] = useState<LanguageDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [langFilter, setLangFilter] = useState<string | null>(null);
  const [visFilter, setVisFilter] = useState<CorpusVisibility | null>(null);

  // Delete flow
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [targetCorpus, setTargetCorpus] = useState<CorpusDto | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openDeleteConfirm = (corpus: CorpusDto) => {
    setTargetCorpus(corpus);
    setConfirmOpen(true);
  };

  const handleDeleteProceed = async () => {
    if (!targetCorpus) return;
    setDeleting(true);
    try {
      await api.delete(`/corpus/${targetCorpus.id}`);
      setCorpora(prev => prev.filter(c => c.id !== targetCorpus.id));
      setConfirmOpen(false);
      setTargetCorpus(null);
      showMessage(t("library_page.delete_success"), Severity.success);
    } catch (err) {
      const status = (err as AxiosError).response?.status;
      if (status === 409) {
        showMessage(t("library_page.delete_corpus_in_use"), Severity.error);
      } else {
        showMessage(t("library_page.delete_error"), Severity.error);
      }
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    Promise.all([
      api.get<CorpusDto[]>("/corpus"),
      api.get<LanguageDto[]>("/language"),
    ])
      .then(([corpusRes, langRes]) => {
        setCorpora(corpusRes.data);
        setLanguages(langRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () =>
      corpora.filter((c) => {
        if (langFilter && c.language.code !== langFilter) return false;
        if (visFilter && c.visibility !== visFilter) return false;
        return true;
      }),
    [corpora, langFilter, visFilter]
  );

  const chipSx = (active: boolean) => ({
    fontFamily: LABEL,
    fontWeight: active ? 700 : 600,
    fontSize: "0.75rem",
    letterSpacing: "0.04em",
    bgcolor: active ? "#191c1d" : "#e7e8e9",
    color: active ? "#fff" : "#44474c",
    borderRadius: "999px",
    "&:hover": { bgcolor: active ? "#191c1d" : "#d9dadb" },
  });

  return (
    <Box sx={{ p: { xs: 4, lg: 6 }, maxWidth: 1400, mx: "auto" }}>

      {/* Header */}
      <Box sx={{ mb: 6, display: "flex", flexDirection: { xs: "column", md: "row" }, alignItems: { md: "flex-end" }, justifyContent: "space-between", gap: 3 }}>
        <Box>
          <Typography sx={{ fontFamily: HEADLINE, fontSize: { xs: "2.5rem", lg: "3rem" }, fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1, color: "#0f172a" }}>
            {t("library_page.title")}
          </Typography>
          <Typography sx={{ fontFamily: BODY, fontSize: "1.125rem", color: "#47607e", maxWidth: 400, mt: 1 }}>
            {t("library_page.description")}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1.5 }}>
          <Button variant="text" startIcon={<TuneIcon sx={{ fontSize: "1rem !important" }} />}
            sx={{ bgcolor: "#e7e8e9", color: "#44474c", fontFamily: LABEL, fontWeight: 600, fontSize: "0.875rem", borderRadius: 2, px: 2, "&:hover": { bgcolor: "#d9dadb" }, textTransform: "none" }}>
            {t("library_page.filters_button")}
          </Button>
          <Button variant="text" startIcon={<SortIcon sx={{ fontSize: "1rem !important" }} />}
            sx={{ bgcolor: "#e7e8e9", color: "#44474c", fontFamily: LABEL, fontWeight: 600, fontSize: "0.875rem", borderRadius: 2, px: 2, "&:hover": { bgcolor: "#d9dadb" }, textTransform: "none" }}>
            {t("library_page.sort_button")}
          </Button>
        </Box>
      </Box>

      {/* Filter chips */}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 5, alignItems: "center" }}>
        <Chip
          label={t("library_page.chip_all_languages")}
          onClick={() => { setLangFilter(null); setVisFilter(null); }}
          sx={chipSx(!langFilter && !visFilter)}
        />
        {languages.map((lang) => (
          <Chip
            key={lang.code}
            label={t(`language.${lang.name}`)}
            onClick={() => setLangFilter(langFilter === lang.code ? null : lang.code)}
            sx={chipSx(langFilter === lang.code)}
          />
        ))}
        <Box sx={{ width: "1px", height: 16, bgcolor: "#c4c6cc", mx: 1, alignSelf: "center" }} />
        {VISIBILITY_OPTIONS.map((v) => (
          <Chip
            key={v}
            label={t(`library_page.visibility.${v}`)}
            onClick={() => setVisFilter(visFilter === v ? null : v)}
            sx={chipSx(visFilter === v)}
          />
        ))}
      </Box>

      {/* Grid */}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" }, gap: 4 }}>
          {filtered.length === 0 && (
            <Typography sx={{ gridColumn: "1 / -1", fontFamily: BODY, color: "#94a3b8", textAlign: "center", py: 10 }}>
              {t("library_page.empty_filters")}
            </Typography>
          )}
          {filtered.map((corpus, i) =>
            i === 0
              ? <FeaturedCard key={corpus.id} corpus={corpus} t={t} router={router} onArchive={() => openDeleteConfirm(corpus)} />
              : <RegularCard key={corpus.id} corpus={corpus} t={t} router={router} onArchive={() => openDeleteConfirm(corpus)} />
          )}
          <AddCard t={t} router={router} />
        </Box>
      )}

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={confirmOpen}
        title={t("library_page.delete_corpus_title")}
        description={
          <>
            {t("library_page.delete_corpus_description", { name: targetCorpus?.name ?? "" })}
            <Box component="span" sx={{ display: "block", mt: 1.5, color: "#f59e0b", fontSize: "0.8rem" }}>
              {t("library_page.delete_corpus_in_use_warning")}
            </Box>
          </>
        }
        proceedLabel={t("library_page.delete_corpus_confirm_button")}
        loading={deleting}
        dangerous
        onProceed={handleDeleteProceed}
        onCancel={() => { if (!deleting) { setConfirmOpen(false); setTargetCorpus(null); } }}
      />
    </Box>
  );
}
