"use client";
//TODO: next steps
//Fetch project by ID (details)
//Fetch project's uploaded files on page load + after Save Changes (there is a todo comment about that)
//Handle Save Changes (create, update, delete)

import { Severity, useSnackbar } from "@/app/providers/SnackbarProvider";
import { Box, Button, CircularProgress, Paper, Stack, Typography } from "@mui/material";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import UploadedAudioFilePaper from "./components/uploaded-file-paper";
import BufferedAudioFilePaper from "./components/buffered-file-paper";
import UploadedFileDetailsDialog from "./components/uploaded-file-details.dialog";
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
  UploadProjectDetails,
} from "./types";

const AUDIO_ACCEPT = ".wav,.aiff,.flac,.mp3,.ogg,.opus";
const MAX_AUDIO_SIZE_BYTES = 200 * 1024 * 1024;

//TODO: fetch the project's audio files from the backend
const MOCK_FILES: ProjectAudioFile[] = [
  {
    id: "0",
    filename: "file1.mp3",
    type: "mp3",
    originalSamplingRate: 16_000,
    isMasterPrompt: false,
    transcription: "",
    emotion: "",
  },
  {
    id: "1",
    filename: "file2.m4a",
    type: "m4a",
    originalSamplingRate: 32_000,
    isMasterPrompt: true,
    transcription: "",
    emotion: "",
  },
];

//TODO: fetch the project's details from the backend
const MOCK_DETAILS: UploadProjectDetails = {
  speakerName: "Admin User",
  speechDialect: "",
  unifySamplingRate: true,
  targetSamplingRate: 48_000,
};

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

  const [files] = useState<ProjectAudioFile[]>(MOCK_FILES);
  const [details] = useState<UploadProjectDetails>(MOCK_DETAILS);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const [toUpload, setToUpload] = useState<BufferedAudioFile[]>([]);
  const [toDelete, setToDelete] = useState<string[]>([]);
  const [toModify, setToModify] = useState<ProjectAudioFile[]>([]);

  const [openFileId, setOpenFileId] = useState<string | null>(null);
  const [transcriptionRequested, setTranscriptionRequested] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const originalMasterId = files.find((f) => f.isMasterPrompt)?.id ?? null;
  const masterId = toModify.find((m) => m.isMasterPrompt)?.id ?? originalMasterId;

  const fileWithPendingModifications = (f: ProjectAudioFile): ProjectAudioFile => ({
    ...(toModify.find((m) => m.id === f.id) ?? f),
    isMasterPrompt: f.id === masterId,
  });

  const openFile = files.find((f) => f.id === openFileId);

  const changesPending = toUpload.length > 0 || toDelete.length > 0 || toModify.length > 0;

  //Returns a modified list of audio files, with the modified (updated) file from the original list
  const getFilesWithModified = (
    list: ProjectAudioFile[],
    updated: ProjectAudioFile,
  ) => {
    const rest = list.filter((m) => m.id !== updated.id);
    const original = files.find((f) => f.id === updated.id);
    return original && sameFile(original, updated) ? rest : [...rest, updated];
  };

  //Buffers the uploadable audio files
  const bufferSelectedFiles = () => {
    const newFiles = selectedFiles.filter((f) => !toUpload.some((b) => b.file.name === f.name && b.file.size === f.size));
    setToUpload((prev) => [...prev, ...newFiles.map((file) => ({ tempId: crypto.randomUUID(), file }))]); //they get a temporary ID to be able to remove them
    setSelectedFiles([]);
  };

  const removeBuffered = (tempId: string) => {
    setToUpload((prev) => prev.filter((b) => b.tempId !== tempId));
  };

  const markForDeletion = (id: string) => {
    setToDelete((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setToModify((prev) => prev.filter((m) => m.id !== id));
  };

  const restore = (id: string) => {
    setToDelete((prev) => prev.filter((d) => d !== id));
  };

  //Setting a new file to be master
  //Replacing the toModify buffer with a new one, containing:
  //a. All previously modified files
  //b. The new master file, if not yet present, to be marked as master
  //c. The old master file, if not yet present, to be marked as not master anymore
  const setAsMasterPrompt = (id: string) => {
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
    setToModify(next);
  };

  const saveFileDetails = (updated: ProjectAudioFile) => {
    setToModify((prev) => getFilesWithModified(prev, updated));
  };

  //TODO I'll do this later
  const deleteFiles = async (ids: string[]) => {
    console.log("delete", projectId, ids);
  };

  //TODO I'll do this later
  const modifyFiles = async (modified: ProjectAudioFile[]) => {
    console.log("modify", projectId, modified);
  };

  //TODO I'll do this later
  const uploadFiles = async (buffered: BufferedAudioFile[]) => {
    console.log("upload", projectId, buffered);
  };

  const clearAndReloadUploadedFiles = async () => {
    setToDelete([]);
    setToUpload([]);
    setToModify([]);

    //TODO: fetch uploaded files from DB
  }

  const handleSave = async () => {
    if (masterId && toDelete.includes(masterId)) {
      showMessage(t("upload_page.error_delete_master"), Severity.error);
      return;
    }

    setSaving(true);
    try {
      await deleteFiles(toDelete);
      await modifyFiles(toModify);
      await uploadFiles(toUpload);
      await clearAndReloadUploadedFiles();
    } finally {
      setSaving(false);
    }
  };

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
                    if (!toDelete.includes(file.id)) setOpenFileId(file.id);
                  }}
                />
              );
            })}

            {toUpload.map((b) => (
              <BufferedAudioFilePaper
                key={b.tempId}
                filename={b.file.name}
                onDelete={() => removeBuffered(b.tempId)}
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
        key={openFileId ?? "closed"}
        file={openFile ? fileWithPendingModifications(openFile) : null}
        transcriptionRequested={
          !!openFileId && transcriptionRequested.includes(openFileId)
        }
        onTranscribe={(id) =>
          setTranscriptionRequested((prev) =>
            prev.includes(id) ? prev : [...prev, id],
          )
        }
        onSave={saveFileDetails}
        onClose={() => setOpenFileId(null)}
      />
    </Box>
  );
}
