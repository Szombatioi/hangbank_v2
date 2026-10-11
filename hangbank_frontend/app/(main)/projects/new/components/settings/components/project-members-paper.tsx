"use client";
import {
  Box,
  Button,
  Chip,
  MenuItem,
  Paper,
  Select,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AccessUser,
  UserSearchAutocomplete,
  fullName,
} from "@/app/components/user-access-selector";
import {
  fieldLabelSx,
  LABEL,
  paperSx,
  sectionTitleSx,
} from "@/app/components/style-constants";
import { PROJECT_ROLES, ProjectRole } from "../constants";

export interface ProjectMember {
  user: AccessUser;
  role: ProjectRole;
}

interface ProjectMembersPaperProps {
  members: ProjectMember[];
  onChange: (members: ProjectMember[]) => void;
  excludeUserIds?: string[];
  fixedMembers?: (ProjectMember & { tag?: string })[];
  hint?: string;
}

export function ProjectMembersPaper({
  members,
  onChange,
  excludeUserIds = [],
  fixedMembers = [],
  hint,
}: ProjectMembersPaperProps) {
  const { t } = useTranslation("common");
  const [memberUser, setMemberUser] = useState<AccessUser | null>(null);
  const [memberRole, setMemberRole] = useState<ProjectRole>("VIEW");

  const pendingUser = memberUser && !excludeUserIds.includes(memberUser.id) ? memberUser : null;

  const roleLabel = (role: ProjectRole) => t(`project_roles.${role.toLowerCase()}`);

  const addMember = () => {
    if (!pendingUser) return;
    if (members.some((m) => m.user.id === pendingUser.id)) return;
    onChange([...members, { user: pendingUser, role: memberRole }]);
    setMemberUser(null);
    setMemberRole("VIEW");
  };

  const removeMember = (id: string) => {
    onChange(members.filter((m) => m.user.id !== id));
  };

  return (
    <Paper elevation={0} sx={paperSx}>
      <Typography variant="overline" sx={{ ...sectionTitleSx, mb: 2 }}>
        {t("new_project.common.section_roles")}
      </Typography>

      {/* User search */}
      <Box sx={{ mb: 2, minWidth: 0 }}>
        <Typography variant="h6" sx={fieldLabelSx} color="primary">
          {t("new_project.common.label_user_name")}
        </Typography>
        <UserSearchAutocomplete
          value={pendingUser}
          onChange={setMemberUser}
          excludeIds={[...members.map((m) => m.user.id), ...excludeUserIds]}
        />
      </Box>

      {/* Role */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" sx={fieldLabelSx} color="primary">
          {t("new_project.common.label_user_role")}
        </Typography>
        <Select
          value={memberRole}
          onChange={(e) => setMemberRole(e.target.value as ProjectRole)}
          fullWidth
          sx={{ borderRadius: "8px", bgcolor: "var(--app-card)" }}
        >
          {PROJECT_ROLES.map((role) => (
            <MenuItem key={role} value={role}>
              {roleLabel(role)}
            </MenuItem>
          ))}
        </Select>
      </Box>

      {/* Add */}
      <Button
        variant="contained"
        onClick={addMember}
        disabled={!pendingUser}
        sx={{
          bgcolor: "var(--app-btn)",
          borderRadius: 2,
          textTransform: "none",
          fontFamily: LABEL,
          fontWeight: 700,
          mt: 2,
          px: 2.5,
          py: 1.5,
          "&:hover": { bgcolor: "var(--app-btn-hover)" },
          "&.Mui-disabled": {
            bgcolor: "var(--app-border)",
            color: "var(--app-text-faint)",
          },
        }}
      >
        {t("new_project.common.add_member")}
      </Button>

      {(fixedMembers.length > 0 || members.length > 0) && (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 2 }}>
          {fixedMembers.map((m) => (
            <Chip
              key={m.user.id}
              label={`${fullName(m.user)} · ${roleLabel(m.role)}${m.tag ? ` (${m.tag})` : ""}`}
            />
          ))}
          {members.map((m) => (
            <Chip
              key={m.user.id}
              label={`${fullName(m.user)} · ${roleLabel(m.role)}`}
              onDelete={() => removeMember(m.user.id)}
            />
          ))}
        </Box>
      )}
      {hint && (
        <Typography
          sx={{ mt: 1, ml: 1 }}
          variant="subtitle2"
          color="var(--app-text-muted)"
        >
          {hint}
        </Typography>
      )}
    </Paper>
  );
}
