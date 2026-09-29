"use client";
import React, { useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { useTranslation } from "react-i18next";
import FileCard from "./file-card";
import { Severity, useSnackbar } from "../providers/SnackbarProvider";

interface FileUploadProps {
  onFileSelected?: (file: File) => void;
  onFileRemoved?: () => void;
  multiple?: boolean;
  onFilesChange?: (files: File[]) => void;
  // Makes the selection controlled by the caller (e.g. to clear it)
  files?: File[];
  accept?: string;
  description?: string;
  maxSizeBytes?: number;
}

const DEFAULT_ACCEPT = ".txt,.docx,.pdf";

const FileUpload = ({
  onFileSelected,
  onFileRemoved,
  multiple = false,
  onFilesChange,
  files: controlledFiles,
  accept = DEFAULT_ACCEPT,
  description,
  maxSizeBytes,
}: FileUploadProps) => {
  const { t } = useTranslation("common");
  const { showMessage } = useSnackbar();
  const [isDragging, setIsDragging] = useState(false);
  const [internalFiles, setInternalFiles] = useState<File[]>([]);
  const files = controlledFiles ?? internalFiles;
  const setFiles = (next: File[]) => {
    if (controlledFiles === undefined) setInternalFiles(next);
  };

  const allowedExtensions = accept
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const isValid = (file: File) => {
    const ext = "." + (file.name.split(".").pop()?.toLowerCase() ?? "");
    if (allowedExtensions.length > 0 && !allowedExtensions.includes(ext)) {
      showMessage(
        t("file_upload.unsupported_format", { name: file.name }),
        Severity.error,
      );
      return false;
    }
    if (maxSizeBytes !== undefined && file.size > maxSizeBytes) {
      showMessage(
        t("file_upload.too_large", {
          name: file.name,
          max: Math.round(maxSizeBytes / (1024 * 1024)),
        }),
        Severity.error,
      );
      return false;
    }
    return true;
  };

  const addFiles = (incoming: File[]) => {
    const valid = incoming.filter(isValid);
    if (valid.length === 0) return;

    if (multiple) {
      // Skip files that are already selected (same name + size).
      const next = [
        ...files,
        ...valid.filter(
          (f) => !files.some((e) => e.name === f.name && e.size === f.size),
        ),
      ];
      setFiles(next);
      onFilesChange?.(next);
    } else {
      setFiles([valid[0]]);
      onFileSelected?.(valid[0]);
    }
  };

  const removeFile = (index: number) => {
    const next = files.filter((_, i) => i !== index);
    setFiles(next);
    if (multiple) onFilesChange?.(next);
    else onFileRemoved?.();
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(e.target.files ?? []));
    e.target.value = "";
  };

  return (
    <Box
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        px: 6,
        py: 4,
        bgcolor: isDragging ? "var(--app-info-bg)" : "var(--app-bg)",
        border: "2px dashed",
        borderColor: isDragging ? "#4285f4" : "var(--app-border)",
        borderRadius: 3,
        transition: "border-color 0.2s, background-color 0.2s",
        textAlign: "center",
        width: "100%",
      }}
    >
      {/* Icon */}
      <CloudUploadIcon
        sx={{
          fontSize: 56,
          color: isDragging ? "#4285f4" : "#aac4f5",
        }}
      />

      {/* Title */}
      <Typography variant="h6" fontWeight={700} color="text.primary">
        {t("file_upload.drag_drop_files")}
      </Typography>

      {/* Subtitle */}
      <Typography variant="body2" color="text.secondary">
        {description ?? t("file_upload.supported_formats")}
      </Typography>

      {/* Hidden file input */}
      <input
        type="file"
        id="file-upload"
        hidden
        accept={accept}
        multiple={multiple}
        onChange={handleInputChange}
      />

      {/* Browse button */}
      <label htmlFor="file-upload">
        <Button
          component="span"
          variant="contained"
          disableElevation
          sx={{
            mt: 1,
            px: 5,
            py: 1.5,
            bgcolor: "var(--app-btn)",
            color: "white",
            fontWeight: 700,
            letterSpacing: "0.1em",
            borderRadius: 2,
            "&:hover": { bgcolor: "var(--app-btn-hover)" },
          }}
        >
          {t("file_upload.browse_files")}
        </Button>
      </label>

      {files.length > 0 && (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 1,
            width: "100%",
            alignItems: "center",
          }}
        >
          {files.map((file, index) => (
            <FileCard
              key={`${file.name}-${file.size}`}
              fileName={file.name}
              fileSize={file.size}
              onDelete={() => removeFile(index)}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};

export default FileUpload;
