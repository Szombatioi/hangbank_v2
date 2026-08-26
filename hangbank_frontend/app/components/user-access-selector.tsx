"use client";
//TODO: delete this..
import { Autocomplete, Avatar, Box, CircularProgress, IconButton, TextField, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "@/app/axios";
import { useAuth } from "@/app/contexts/auth-context";

export interface AccessUser {
  id: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  email: string;
}

export function fullName(u: AccessUser): string {
  const name = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
  return name || u.username || u.email;
}

function initials(u: AccessUser): string {
  return fullName(u)
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

// Splits the edited list against the original accesses: grant only the additions,
// revoke only the removals of previously-existing accesses.
export function accessDiff(initial: AccessUser[], allowed: AccessUser[]) {
  const initialIds = new Set(initial.map((u) => u.id));
  return {
    newUserIds: allowed.filter((u) => !initialIds.has(u.id)).map((u) => u.id),
    revokeUserIds: initial
      .filter((u) => !allowed.some((a) => a.id === u.id))
      .map((u) => u.id),
  };
}

export function UserSearchAutocomplete({
  value,
  onChange,
  excludeIds = [],
  placeholder,
  clearOnSelect = false,
  background
}: {
  value: AccessUser | null;
  onChange: (user: AccessUser | null) => void;
  excludeIds?: string[];
  placeholder?: string;
  clearOnSelect?: boolean;
  background?: string
}) {
  const { t } = useTranslation("common");
  const { user } = useAuth();

  const [options, setOptions] = useState<AccessUser[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = inputValue.trim();
    if (!q) {
      setOptions([]);
      return;
    }
    let ignore = false;
    setLoading(true);
    const handle = setTimeout(() => {
      api
        .get<AccessUser[]>("/user/search", { params: { q } })
        .then((res) => { if (!ignore) setOptions(res.data); })
        .catch(() => { if (!ignore) setOptions([]); })
        .finally(() => { if (!ignore) setLoading(false); });
    }, 250);
    return () => { ignore = true; clearTimeout(handle); };
  }, [inputValue]);

  const selectableOptions = options.filter(
    (o) => o.id !== user?.id && !excludeIds.includes(o.id),
  );

  return (
    <Autocomplete<AccessUser>
      options={selectableOptions}
      loading={loading}
      filterOptions={(x) => x}
      getOptionLabel={(o) => fullName(o)}
      isOptionEqualToValue={(o, v) => o.id === v.id}
      inputValue={inputValue}
      onInputChange={(_, v) => setInputValue(v)}
      value={value}
      onChange={(_, v) => { onChange(v); if (clearOnSelect) setInputValue(""); }}
      blurOnSelect
      noOptionsText={inputValue.trim() ? t("access_selector.no_results") : t("access_selector.hint")}
      renderOption={(props, option) => (
        <Box component="li" {...props} key={option.id}>
          <Box>
            <Typography sx={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: "0.875rem" }}>
              {fullName(option)}
            </Typography>
            <Typography sx={{ fontSize: "0.72rem", color: "var(--app-text-muted)" }}>
              {option.email}
            </Typography>
          </Box>
        </Box>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder={placeholder ?? t("access_selector.search_placeholder")}
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px" } }}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress size={16} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
}

export function UserAccessSelector({
  value,
  onChange,
}: {
  value: AccessUser[];
  onChange: (next: AccessUser[]) => void;
}) {
  const addUser = (candidate: AccessUser | null) => {
    if (!candidate) return;
    if (value.some((u) => u.id === candidate.id)) return;
    onChange([...value, candidate]);
  };

  const removeUser = (id: string) => {
    onChange(value.filter((u) => u.id !== id));
  };

  return (
    <Box>
      <UserSearchAutocomplete
        value={null}
        onChange={addUser}
        excludeIds={value.map((u) => u.id)}
        clearOnSelect
      />

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mt: 1.5 }}>
        {value.map((u) => (
          <Box key={u.id} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Avatar sx={{ width: 36, height: 36, fontSize: "0.75rem", fontWeight: 700 }}>
                {initials(u)}
              </Avatar>
              <Box>
                <Typography sx={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: "0.85rem", color: "var(--app-text-primary)" }}>
                  {fullName(u)}
                </Typography>
                <Typography sx={{ fontSize: "0.72rem", color: "var(--app-text-muted)" }}>
                  {u.email}
                </Typography>
              </Box>
            </Box>
            <IconButton size="small" onClick={() => removeUser(u.id)}>
              <CloseIcon fontSize="small" sx={{ color: "var(--app-text-faint)" }} />
            </IconButton>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
