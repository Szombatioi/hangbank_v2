"use client";
import { Button } from "@mui/material";
import { usePathname, useRouter } from "next/navigation";

export default function ProjectsOverviewPage() {
    const router = useRouter();
    const pathname = usePathname();
    return (
        <>
            TODO: itt fognak megjelenni a user projektjei

            <Button
                variant="contained"
                sx={{
                    backgroundColor: '#ed4a14',
                    borderRadius: 4,
                    position: 'fixed',
                    bottom: 24,
                    right: 24,
                    zIndex: 1000,

                    '&:hover': {
                        backgroundColor: '#bb350c',
                    }
                }}
                onClick={() => { router.push(`${pathname}/new`) }}
            >
                Create new
            </Button>
        </>
    );
}