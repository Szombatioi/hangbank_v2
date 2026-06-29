"use client";

import api from "@/app/axios";
import { ProjectDto } from "@/app/components/types/project.dto";
import { Severity, useSnackbar } from "@/app/providers/SnackbarProvider";
import { Box, CircularProgress, Typography } from "@mui/material";
import { AxiosError } from "axios";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ProjectType } from "../../new/components/project-type-selector";
import CorpusRecord from "./components/corpus-record";

export default function RecordPage() {
  const { t } = useTranslation("common");
  const { showMessage } = useSnackbar();

  const params = useParams();
  const id = params.id;

  const [project, setProject] = useState<ProjectDto | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProject() {
      try {
        const response = await api.get(`/project/${id}`);
        setProject(response.data);
      } catch (error) {
        const axiosError = error as AxiosError;
        if (axiosError.response) {
          if (axiosError.response.status === 404) {
            showMessage(t("project_page.not_found"), Severity.error);
            setLoadError(t("project_page.not_found"));
          } else if (axiosError.response.status === 401) {
            showMessage(t("project_page.access_denied"), Severity.error);
            setLoadError(t("project_page.access_denied"));
          }
        } else {
          showMessage(t("project_page.fetch_error"), Severity.error);
          setLoadError(t("project_page.fetch_error"));
        }
      }
    }
    fetchProject();
  }, []);

  if (!id) {
    return (
      <div>
        <h1>Record Page</h1>
        <p>No project ID provided.</p>
      </div>
    );
  }

  if (!project) {
    if (loadError) {
      return (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "80vh",
          }}
        >
          <Typography variant="h6" color="error">
            {loadError}
          </Typography>
        </Box>
      );
    } else {
      return (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "80vh",
          }}
        >
          <CircularProgress />
        </Box>
      );
    }
  }

  const recordPageTypes: Record<ProjectType, React.ReactNode> = {
    [ProjectType.CORPUS]: <CorpusRecord />,
    [ProjectType.AI_CHAT]: <></>,
    [ProjectType.MULTI_SPEAKER]: <></>,
    [ProjectType.EXISTING_FILES]: <></>,
  }

  return recordPageTypes[project.type];
}
