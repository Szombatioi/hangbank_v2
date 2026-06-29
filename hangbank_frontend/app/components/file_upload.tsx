"use client";
import React, { useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { useTranslation } from "react-i18next";
import FileCard from "./file-card";

interface FileUploadProps {
  onFileSelected: (file: File) => void;
  onFileRemoved: () => void;
}

const FileUpload = ({ onFileSelected, onFileRemoved }: FileUploadProps) => {
  const { t } = useTranslation("common");
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      onFileSelected(file);
      setFile(file);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelected(file);
      setFile(file);
    }
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
        {t("file_upload.supported_formats")}
      </Typography>

      {/* Hidden file input */}
      <input
        type="file"
        id="file-upload"
        hidden
        accept=".txt,.docx,.pdf"
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

      {file && (
        <FileCard fileName={file.name} fileSize={file.size} onDelete={() => {setFile(null); onFileRemoved()}} />
      )}
    </Box>
  );
};

export default FileUpload;
