export enum ProjectProgress {
    NEW = "progress.new",
    IN_PROGRESS = "progress.in_progress",
    FINISHED = "progress.finished",
}

export interface ColorPair { text: string, background: string }

export default function GetColorFromProgress(progress: ProjectProgress): ColorPair {
    const ProgressColorMap: Record<ProjectProgress, ColorPair> = {
        [ProjectProgress.NEW]: {text: "#2196F3", background: "#E3F2FD"},
        [ProjectProgress.IN_PROGRESS]: {text: "#EF6C00", background: "#FFF3E0"},
        [ProjectProgress.FINISHED]: {text: "#2E7D32", background: "#E8F5E9"}
    };

    return ProgressColorMap[progress];
}