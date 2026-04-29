"use client";

import { motion } from "framer-motion";
import ProjectTypeSelector, { ProjectType } from "./components/project-type-selector";
import { useState } from "react";
import NewProjectSettings from "./components/project-settings";

export default function NewProjectPage() {
    const [projectType, setProjectType] = useState<ProjectType | null>(null);

    if (!projectType) {
        return (
            <>
                <motion.div
                    key={"type"}
                    initial={{ opacity: 0, y: 100 }} // Start below
                    animate={{ opacity: 1, y: 0 }} // Swim upward
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="flex flex-col items-center justify-center h-screen w-screen"
                    style={{
                        width: "100%",
                    }}
                >
                    <ProjectTypeSelector onSelect={(type: ProjectType) => { setProjectType(type) }} />
                </motion.div>
            </>
        );
    } else {
        return (
            <>
                <motion.div
                    key={"settings"}
                    initial={{ opacity: 0, y: 100 }} // Start below
                    animate={{ opacity: 1, y: 0 }} // Swim upward
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="flex flex-col items-center justify-center h-screen w-screen"
                    style={{
                        width: "100%",
                    }}
                >
                    <NewProjectSettings type={projectType} />
                </motion.div>
            </>
        );
    }
}