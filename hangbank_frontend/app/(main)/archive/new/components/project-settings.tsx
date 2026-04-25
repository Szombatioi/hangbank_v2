"use client";

import React from "react";
import { ProjectType } from "./project-type-selector";
import ProjectBasedSettings from "./settings/corpus-based-settings";
import CorpusBasedSettings from "./settings/corpus-based-settings";

interface ProjectSettingsComponentTypes{
    key: ProjectType,
    jsx: React.ReactNode;
}

interface NewProjectSettingsProps{
    type: ProjectType
}

export default function NewProjectSettings({type}: NewProjectSettingsProps){
    const projectSettingsComponents: Record<ProjectType, React.ReactNode> = {
        [ProjectType.CORPUS]: <CorpusBasedSettings />,
        [ProjectType.AI_CHAT]: <></>,
        [ProjectType.MULTI_SPEAKER]: <></>,
        [ProjectType.EXISTING_FILES]: <></>,
    };

    return projectSettingsComponents[type];
}