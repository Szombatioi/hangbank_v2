import { ProjectType } from "@/app/(main)/projects/new/components/project-type-selector";
import { AutoStories } from "@mui/icons-material";
import React from "react";


export default function GetProjectIcon(type: ProjectType){
    const projectIconMap: Record<ProjectType, React.ReactNode> = {
        [ProjectType.CORPUS]: <AutoStories />,
        [ProjectType.AI_CHAT]: <></>,
        [ProjectType.MULTI_SPEAKER]: <></>,
        [ProjectType.EXISTING_FILES]: <></>,
    };

    return projectIconMap[type];
}