"use client";

import { Severity, useSnackbar } from "@/app/providers/SnackbarProvider";
import { Box, Button, CircularProgress, Paper, Stack, Typography } from "@mui/material";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import api from "@/app/axios";
import { translateHttpError } from "@/app/components/helpers/http-error";
import { useTranslation } from "react-i18next";
import UploadedAudioFilePaper from "./components/uploaded-file-paper";
import BufferedAudioFilePaper from "./components/buffered-file-paper";
import UploadedFileDetailsDialog, {
  AudioFileDetailsView,
} from "./components/uploaded-file-details.dialog";
import FileUpload from "@/app/components/file_upload";
import {
  BODY,
  captionSx,
  LABEL,
  paperSx,
  sectionTitleSx,
} from "@/app/components/style-constants";
import {
  BufferedAudioFile,
  ProjectAudioFile,
  UploadProjectView,
} from "./types";

const AUDIO_ACCEPT = ".wav,.aiff,.flac,.mp3,.ogg,.opus";
const MAX_AUDIO_SIZE_BYTES = 200 * 1024 * 1024;
const MAX_FILES_PER_UPLOAD = 20;

const detailValueSx = {
  fontFamily: BODY,
  fontWeight: 600,
  color: "var(--app-text-primary)",
} as const;

const sameFile = (a: ProjectAudioFile, b: ProjectAudioFile) =>
  a.transcription === b.transcription &&
  a.emotion === b.emotion &&
  a.isMasterPrompt === b.isMasterPrompt;

export default function UploadPage() {
  const { t } = useTranslation("common");
  const { showMessage } = useSnackbar();
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<UploadProjectView | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const files = project?.files ?? [];

  const loadProject = useCallback(async () => {
    try {
      const { data } = await api.get<UploadProjectView>(
        `/existing-audio-project/project/${projectId}`,
      );
      setProject(data);
      setLoadFailed(false);
    } catch (err) {
      showMessage(
        translateHttpError(err, t, t("upload_page.error_load_project")),
        Severity.error,
      );
      setLoadFailed(true);
    }
  }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const [toUpload, setToUpload] = useState<BufferedAudioFile[]>([]);
  const [toDelete, setToDelete] = useState<string[]>([]);
  const [toModify, setToModify] = useState<ProjectAudioFile[]>([]);

  const [openTarget, setOpenTarget] = useState<{
    kind: "uploaded" | "buffered";
    id: string;
  } | null>(null);
  const [transcriptionRequested, setTranscriptionRequested] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const [bufferedMasterId, setBufferedMasterId] = useState<string | null>(null);

  const originalMasterId = files.find((f) => f.isMasterPrompt)?.id ?? null;
  const masterId = bufferedMasterId
    ? null
    : (toModify.find((m) => m.isMasterPrompt)?.id ?? originalMasterId);

  const fileWithPendingModifications = (f: ProjectAudioFile): ProjectAudioFile => ({
    ...(toModify.find((m) => m.id === f.id) ?? f),
    isMasterPrompt: f.id === masterId,
  });

  const openUploaded =
    openTarget?.kind === "uploaded"
      ? files.find((f) => f.id === openTarget.id)
      : undefined;
  const openBuffered =
    openTarget?.kind === "buffered"
      ? toUpload.find((b) => b.tempId === openTarget.id)
      : undefined;

  const openFileView: AudioFileDetailsView | null = openUploaded
    ? fileWithPendingModifications(openUploaded)
    : openBuffered
      ? {
          filename: openBuffered.file.name,
          type: openBuffered.file.name.split(".").pop() ?? "",
          isMasterPrompt: openBuffered.tempId === bufferedMasterId,
          transcription: openBuffered.transcription,
          emotion: openBuffered.emotion,
        }
      : null;

  const changesPending = toUpload.length > 0 || toDelete.length > 0 || toModify.length > 0;

  //Returns a modified list of audio files, 
  //with the modified (updated) file from the original list
  const getFilesWithModified = (
    list: ProjectAudioFile[],
    updated: ProjectAudioFile,
  ) => {
    const rest = list.filter((m) => m.id !== updated.id);
    const original = files.find((f) => f.id === updated.id);
    return original && sameFile(original, updated) ? rest : [...rest, updated];
  };

  
  const bufferSelectedFiles = () => {
    const newFiles = selectedFiles.filter((f) => !toUpload.some((b) => b.file.name === f.name && b.file.size === f.size));
    setToUpload((prev) => [
      ...prev,
      ...newFiles.map((file) => ({
        tempId: crypto.randomUUID(), //temporary ID to be able to remove them if not planning to upload them anymore
        file,
        transcription: "",
        emotion: "",
      })),
    ]);
    setSelectedFiles([]);
  };

  const removeBuffered = (tempId: string) => {
    setToUpload((prev) => prev.filter((b) => b.tempId !== tempId));
    if (tempId === bufferedMasterId) {
      setToModify(withUploadedMaster(originalMasterId));
      setBufferedMasterId(null);
    }
  };

  const markForDeletion = (id: string) => {
    setToDelete((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setToModify((prev) => prev.filter((m) => m.id !== id));
  };

  const restore = (id: string) => {
    setToDelete((prev) => prev.filter((d) => d !== id));
  };

  //Returns the toModify list after making `id` the master among the uploaded files,
  //or after taking the role from all of them when `id` is null (a buffered file is the new master):
  //a. All previously modified files
  //b. The new master file, if not yet present, to be marked as master
  //c. The old master file, if not yet present, to be marked as not master anymore
  const withUploadedMaster = (id: string | null) => {
    let next = toModify;
    for (const f of files) {
      if (toDelete.includes(f.id)) continue;

      const shouldBeMaster = f.id === id; //Should the examined file a master prompt? (Did we change it?)
      const current = fileWithPendingModifications(f);
      if (current.isMasterPrompt !== shouldBeMaster) {
        //If we marked THIS file to be the new master and is NOT marked as so, we set it
        //If we marked THIS file NOT to be master and it IS, we set it accordingly
        next = getFilesWithModified(next, {
          ...current,
          isMasterPrompt: shouldBeMaster,
        });
      }
    }
    return next;
  };

  const setAsMasterPrompt = (id: string) => {
    setToModify(withUploadedMaster(id));
    setBufferedMasterId(null);
  };

  const setBufferedAsMasterPrompt = (tempId: string) => {
    setToModify(withUploadedMaster(null));
    setBufferedMasterId(tempId);
  };

  const saveFileDetails = (changes: { transcription: string; emotion: string }) => {
    if (openUploaded) {
      const updated = { ...fileWithPendingModifications(openUploaded), ...changes };
      setToModify((prev) => getFilesWithModified(prev, updated));
    } else if (openBuffered) {
      // Buffered files are new uploads, so their details travel with the upload itself.
      setToUpload((prev) =>
        prev.map((b) => (b.tempId === openBuffered.tempId ? { ...b, ...changes } : b)),
      );
    }
  };

  const uploadFiles = async (
    buffered: BufferedAudioFile[],
    masterTempId: string | null,
  ) => {
    if (buffered.length === 0) return;

    const ordered = [...buffered].sort(
      (a, b) =>
        Number(b.tempId === masterTempId) - Number(a.tempId === masterTempId),
    );

    for (let i = 0; i < ordered.length; i += MAX_FILES_PER_UPLOAD) {
      const batch = ordered.slice(i, i + MAX_FILES_PER_UPLOAD);
      const formData = new FormData();
      formData.append("projectId", projectId);
      batch.forEach((b) => formData.append("files", b.file));
      formData.append(
        "details",
        JSON.stringify(
          batch.map((b) => ({
            transcription: b.transcription.trim() || undefined,
            emotion: b.emotion.trim() || undefined,
            isMasterPrompt: b.tempId === masterTempId,
          })),
        ),
      );

      await api.post("/existing-audio-project/files", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const uploadedIds = new Set(batch.map((b) => b.tempId));
      setToUpload((prev) => prev.filter((b) => !uploadedIds.has(b.tempId)));
      if (masterTempId && uploadedIds.has(masterTempId)) {
        setBufferedMasterId(null);
      }
    }
  };

  const modifyFiles = async (modified: ProjectAudioFile[]) => {
    if (modified.length === 0) return;

    await api.patch("/existing-audio-project/files", {
      projectId,
      files: modified.map((m) => ({
        id: m.id,
        transcription: m.transcription,
        emotion: m.emotion,
        isMasterPrompt: m.isMasterPrompt,
      })),
    });
    setToModify([]);
  };

  const deleteFiles = async (ids: string[]) => {
    if (ids.length === 0) return;

    await api.delete("/existing-audio-project/files", {
      data: { projectId, ids },
    });
    setToDelete([]);
  };

  const handleSave = async () => {
    if (masterId && toDelete.includes(masterId)) {
      showMessage(t("upload_page.error_delete_master"), Severity.error);
      return;
    }

    setSaving(true);
    try {
      await uploadFiles(toUpload, bufferedMasterId);
      await modifyFiles(toModify);
      await deleteFiles(toDelete);
      showMessage(t("upload_page.save_success"), Severity.success);
    } catch (err) {
      showMessage(
        translateHttpError(err, t, t("upload_page.error_save")),
        Severity.error,
      );
    } finally {
      await loadProject();
      setSaving(false);
    }
  };

  if (!project) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        {loadFailed ? (
          <Typography sx={{ fontFamily: BODY, color: "var(--app-text-muted)" }}>
            {t("upload_page.error_load_project")}
          </Typography>
        ) : (
          <CircularProgress />
        )}
      </Box>
    );
  }
  const { details } = project;

  return (
    <Box>
      <Stack
        gap={2}
        direction={"row"}
        sx={{ justifyContent: "center", alignItems: "start" }}
      >
        {/* Left side: uploader */}
        <Box sx={{ flexGrow: 1 }}>
          <Paper elevation={0} sx={{ ...paperSx, gap: 3 }}>
            <Typography variant="h4" align="center" fontFamily={LABEL}>
              {t("upload_page.upload_title")}
            </Typography>
            <FileUpload
              files={selectedFiles}
              multiple
              accept={AUDIO_ACCEPT}
              maxSizeBytes={MAX_AUDIO_SIZE_BYTES}
              description={t("upload_page.supported_audio_formats")}
              onFilesChange={setSelectedFiles}
            />
            <Button
              variant="contained"
              disabled={selectedFiles.length === 0}
              onClick={bufferSelectedFiles}
              sx={{
                borderRadius: 4,
                py: 1.5,
                width: "50%",
                alignSelf: "center",
                fontFamily: LABEL,
                fontWeight: 700,
                textTransform: "none",
              }}
            >
              {t("upload_page.upload_button")}
              {selectedFiles.length > 0 ? ` (${selectedFiles.length})` : ""}
            </Button>
          </Paper>
        </Box>

        {/* Right side */}
        <Box
          sx={{
            flexGrow: 0,
            width: "35%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          {/* Uploaded files */}
          <Paper elevation={0} sx={{ ...paperSx, gap: 2, marginBottom: 2 }}>
            <Typography variant="overline" sx={sectionTitleSx}>
              {t("upload_page.uploaded_files_title")}
            </Typography>

            {files.length === 0 && toUpload.length === 0 && (
              <Typography
                sx={{
                  fontFamily: BODY,
                  fontSize: "0.875rem",
                  color: "var(--app-text-muted)",
                }}
              >
                {t("upload_page.no_files")}
              </Typography>
            )}

            {files.map((f) => {
              const file = fileWithPendingModifications(f);
              return (
                <UploadedAudioFilePaper
                  key={file.id}
                  id={file.id}
                  filename={file.filename}
                  type={file.type}
                  originalSamplingRate={file.originalSamplingRate}
                  isMasterPrompt={file.isMasterPrompt}
                  setAsMasterPrompt={setAsMasterPrompt}
                  onDelete={() => markForDeletion(file.id)}
                  markedForDeletion={toDelete.includes(file.id)}
                  modified={toModify.some((m) => m.id === file.id)}
                  onRestore={() => restore(file.id)}
                  onOpen={() => {
                    if (!toDelete.includes(file.id))
                      setOpenTarget({ kind: "uploaded", id: file.id });
                  }}
                />
              );
            })}

            {toUpload.map((b) => (
              <BufferedAudioFilePaper
                key={b.tempId}
                file={b.file}
                isMasterPrompt={b.tempId === bufferedMasterId}
                setAsMasterPrompt={() => setBufferedAsMasterPrompt(b.tempId)}
                onDelete={() => removeBuffered(b.tempId)}
                onOpen={() => setOpenTarget({ kind: "buffered", id: b.tempId })}
              />
            ))}
          </Paper>

          {/* Project details */}
          <Paper elevation={0} sx={{ ...paperSx, gap: 2 }}>
            <Typography variant="overline" sx={sectionTitleSx}>
              {t("upload_page.project_details_title")}
            </Typography>

            <Box>
              <Typography sx={captionSx}>
                {t("upload_page.speaker")}
              </Typography>
              <Typography sx={detailValueSx}>
                {details.speakerName || "—"}
              </Typography>
            </Box>

            <Box>
              <Typography sx={captionSx}>
                {t("upload_page.speech_dialect")}
              </Typography>
              <Typography sx={detailValueSx}>
                {details.speechDialect || "—"}
              </Typography>
            </Box>

            <Box>
              <Typography sx={captionSx}>
                {t("new_project.existing_files.label_transcription_language")}
              </Typography>
              <Typography sx={detailValueSx}>
                {details.transcriptionLanguage
                  ? t(`language.${details.transcriptionLanguage}`)
                  : "—"}
              </Typography>
            </Box>

            {details.unifySamplingRate && details.targetSamplingRate && (
              <Box>
                <Typography sx={captionSx}>
                  {t("upload_page.target_sampling_rate")}
                </Typography>
                <Typography sx={detailValueSx}>
                  {`${details.targetSamplingRate / 1000} kHz`}
                </Typography>
              </Box>
            )}
          </Paper>

          <Button
            variant="contained"
            color="primary"
            disabled={saving || !changesPending}
            sx={{ borderRadius: 4, py: 2, width: "50%", alignSelf: "center" }}
            onClick={() => handleSave()}
          >
            {saving ? (
              <CircularProgress size={20} sx={{ color: "inherit" }} />
            ) : (
              t("uploaded_file.save")
            )}
          </Button>
        </Box>
      </Stack>

      <UploadedFileDetailsDialog
        key={openTarget ? `${openTarget.kind}-${openTarget.id}` : "closed"}
        file={openFileView}
        canTranscribe={!!openUploaded}
        transcriptionRequested={
          !!openUploaded && transcriptionRequested.includes(openUploaded.id)
        }
        onTranscribe={() => {
          if (!openUploaded) return;
          const id = openUploaded.id;
          setTranscriptionRequested((prev) =>
            prev.includes(id) ? prev : [...prev, id],
          );
        }}
        onSave={saveFileDetails}
        onClose={() => setOpenTarget(null)}
      />
    </Box>
  );
}
