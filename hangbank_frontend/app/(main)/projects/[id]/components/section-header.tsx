import { Box, Typography } from "@mui/material";
import { LABEL } from "../../new/components/settings/corpus-based-settings";
import { ORANGE } from "@/app/components/style-constants";

export default function SectionHeader({ label }: { label: string }) {
    return (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2.5 }}>
            <Box sx={{ width: 4, height: 20, bgcolor: ORANGE, borderRadius: "2px" }} />
            <Typography sx={{ fontFamily: LABEL, fontWeight: 700, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.15em", color: "#475569" }}>
                {label}
            </Typography>
        </Box>
    );
}