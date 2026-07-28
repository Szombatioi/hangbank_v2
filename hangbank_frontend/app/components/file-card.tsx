import { Box, IconButton, Typography, Paper } from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteIcon from "@mui/icons-material/Delete";

interface FileCardProps {
  fileName: string;
  fileSize: number;
  onDelete: () => void;
}


export default function FileDisplay({ fileName, fileSize, onDelete }: FileCardProps) {
  return (
    <Paper
      variant="outlined"
      elevation={0}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 2,
        px: 2,
        py: 1.5,
        borderRadius: 8,
        maxWidth: 480,
        bgcolor: "var(--app-border)",
      }}
    >
      <Box
        sx={{
          width: 42,
          height: 42,
          borderRadius: 1.5,
          bgcolor: "primary.50",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <CloudUploadIcon color="primary" />
      </Box>

      <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "start", textAlign: "left" }}>
        <Typography
          variant="body2"
          fontWeight={500}
          noWrap
        >
          {fileName}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {(fileSize / 1024).toFixed(2)} KB
        </Typography>
      </Box>

      <IconButton
        onClick={onDelete}
        size="small"
        sx={{
          bgcolor: "error.50",
          color: "error.main",
          borderRadius: 1.5,
          "&:hover": { bgcolor: "error.100" },
        }}
        aria-label="Delete file"
      >
        <DeleteIcon fontSize="small" />
      </IconButton>
    </Paper>
  );
}