"use client";

import api from "@/app/axios";
import Recorder from "@/app/components/recorder";
import { ProjectDto } from "@/app/components/types/project.dto";
import { useSnackbar, Severity } from "@/app/contexts/SnackbarProvider";
import { CircularProgress, Grid } from "@mui/material";
import { AxiosError } from "axios";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CorpusProjectDetailDto } from "./corpus-project-details";

export default function CorpusRecord() {
  const { t } = useTranslation("common");
  const { showMessage } = useSnackbar();

  const params = useParams();
  const id = params.id as string;

  const [project, setProject] = useState<CorpusProjectDetailDto | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProject() {
      try {
        const response = await api.get(`/project/${id}/detail`);
        setProject(response.data);
        console.log(response.data.speaker.microphoneDeviceId);
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
    return (
      <>
        <CircularProgress />
      </>
    );
  }

  return (
    <Grid container>
      {/* Main part */}
      <Grid size={{ xs: 8 }}>
        <Recorder
          deviceId={project.speaker.microphoneDeviceId!}
          onAudioBlob={function (blob: Blob): void {
            console.log("Blob received in CorpusRecord component:", blob);
          }}
        />
      </Grid>

      {/* Side panel */}
      <Grid size={{ xs: 4 }}></Grid>
    </Grid>
  );
}
