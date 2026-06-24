"use client";
import {
  Box,
  CircularProgress,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Button,
  Divider,
  AppBar,
  Toolbar,
  IconButton,
} from "@mui/material";
import {
  GridView,
  ReceiptLong,
  Mic,
  History,
  Settings,
  Help,
  AddCircle,
  DarkMode,
  LightMode,
} from "@mui/icons-material";
import { usePathname, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useTheme } from "@mui/material/styles";
import { useAuth } from "../contexts/auth-context";
import { useCustomTheme } from "../contexts/theme-context";
import api, { removeAuthToken } from "../axios";

const DRAWER_WIDTH = 256;
const LABEL_FONT = "'Manrope', sans-serif";
const HEADLINE_FONT = "'Space Grotesk', sans-serif";

const NAV_ITEMS = [
  { key: "nav_dashboard", icon: <GridView />, path: "/" },
  { key: "nav_library", icon: <ReceiptLong />, path: "/library" },
  { key: "nav_projects", icon: <Mic />, path: "/projects" },
  // { key: "nav_archive", icon: <History />, path: "/archive" },
];

const APPBAR_ITEMS: {key: string, path: string}[] = [
  // { key: "nav_projects", path: "/projects" },
  // { key: "nav_notifications" },
  // { key: "nav_profile", icon: <AccountCircle /> },
  // { key: "nav_settings", icon: <Settings fontSize="small" /> },
];

const APPBAR_ITEMS_END = [
  { key: "nav_logout", path: "/auth/login", onClick: () => {
    removeAuthToken();
  }},
];

const FOOTER_ITEMS = [
  {
    key: "nav_settings",
    icon: <Settings fontSize="small" />,
    path: "/settings",
  },
  { key: "nav_support", icon: <Help fontSize="small" />, path: "/support" },
];

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading } = useAuth();
  const { t } = useTranslation("common");
  const pathname = usePathname();
  const router = useRouter();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const drawerBg = isDark ? "#1e2021" : "#f3f4f5"; // surface_container_low
  const activeBg = isDark ? "#2c2e2f" : "#ffffff"; // paper surface
  const activeColor = "#ed4a14"; // The Signal
  const inactiveColor = isDark ? "#c4c6cc" : "#44474c"; // on_surface_variant
  const hoverColor = isDark ? "#e1e3e4" : "#191c1d"; // on_surface

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  const drawerContent = (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        py: 3,
        bgcolor: drawerBg,
      }}
    >
      {/* Brand */}
      <Box sx={{ px: 4, mb: 5 }}>
        <Typography
          sx={{
            fontFamily: HEADLINE_FONT,
            fontWeight: 900,
            fontSize: "1rem",
            textTransform: "uppercase",
            letterSpacing: "0.15em",
            color: hoverColor,
            lineHeight: 1,
            mb: 0.5,
          }}
        >
          {t("brand_name")}
        </Typography>
        <Typography
          sx={{
            fontFamily: LABEL_FONT,
            fontSize: "0.65rem",
            color: inactiveColor,
            opacity: 0.7,
          }}
        >
          {t("brand_subtitle")}
        </Typography>
      </Box>

      {/* Primary nav */}
      <List disablePadding sx={{ flex: 1 }}>
        {NAV_ITEMS.map(({ key, icon, path }) => {
          const active = pathname === path;
          return (
            <ListItemButton
              key={key}
              onClick={() => router.push(path)}
              sx={{
                py: 1.25,
                transition: "all 0.2s ease",
                ...(active
                  ? {
                      ml: 1.5,
                      pl: 2,
                      pr: 2,
                      borderRadius: "100px 0 0 100px",
                      bgcolor: activeBg,
                      color: activeColor,
                      "&:hover": { bgcolor: activeBg },
                    }
                  : {
                      pl: 4,
                      pr: 2,
                      color: inactiveColor,
                      "&:hover": {
                        bgcolor: "transparent",
                        color: hoverColor,
                        transform: "translateX(4px)",
                      },
                    }),
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 36,
                  color: "inherit",
                  "& .MuiSvgIcon-root": { fontSize: "1.25rem" },
                }}
              >
                {icon}
              </ListItemIcon>
              <ListItemText
                primary={t(key)}
                primaryTypographyProps={{
                  fontFamily: LABEL_FONT,
                  fontSize: "0.875rem",
                  fontWeight: active ? 700 : 500,
                  color: "inherit",
                }}
              />
            </ListItemButton>
          );
        })}
      </List>

      {/* Bottom section */}
      <Box sx={{ px: 2, mt: "auto" }}>
        <Button
          fullWidth
          variant="contained"
          startIcon={<AddCircle />}
          onClick={() => router.push("/projects/new")}
          sx={{
            bgcolor: "#ed4a14",
            color: "#ffffff",
            borderRadius: "12px",
            py: 1.5,
            mb: 3,
            fontFamily: HEADLINE_FONT,
            fontWeight: 700,
            fontSize: "0.8rem",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            "&:hover": { bgcolor: "#c93d0f", transform: "scale(0.98)" },
            transition: "all 0.15s ease",
          }}
        >
          {t("button_new_recording")}
        </Button>

        <Divider sx={{ mb: 1, opacity: 0.15 }} />

        <List disablePadding>
          {FOOTER_ITEMS.map(({ key, icon, path }) => (
            <ListItemButton
              key={key}
              onClick={() => router.push(path)}
              sx={{
                pl: 2,
                py: 0.75,
                color: inactiveColor,
                "&:hover": {
                  bgcolor: "transparent",
                  color: hoverColor,
                  transform: "translateX(4px)",
                },
                transition: "all 0.2s ease",
              }}
            >
              <ListItemIcon sx={{ minWidth: 30, color: "inherit" }}>
                {icon}
              </ListItemIcon>
              <ListItemText
                primary={t(key)}
                primaryTypographyProps={{
                  fontFamily: LABEL_FONT,
                  fontSize: "0.7rem",
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "inherit",
                }}
              />
            </ListItemButton>
          ))}
        </List>
      </Box>
    </Box>
  );

  const { mode, toggleTheme } = useCustomTheme();
  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <AppBar
        position="static"
        sx={{
          display: { xs: "none", md: "flex" },
          ml: `${DRAWER_WIDTH}px`,
          width: `calc(100% - ${DRAWER_WIDTH}px)`,
          bgcolor: isDark ? "#1e2021" : "#f8f9fa",
          boxShadow: "none",
        }}
      >
        <Toolbar sx={{ gap: 4, px: 4 }}>
          {APPBAR_ITEMS.map(({ key, path }) => {
            const active = pathname === path || pathname.startsWith(path + "/");
            const textColor = isDark ? "#F0F1F2" : "#060a17";
            return (
              <Box
                key={key}
                onClick={() => {
                  router.push(path);
                }}
                sx={{
                  cursor: "pointer",
                  fontFamily: LABEL_FONT,
                  fontSize: "0.7rem",
                  fontWeight: active ? 700 : 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  color: active
                    ? textColor
                    : isDark
                    ? "rgba(240,241,242,0.5)"
                    : "rgba(6,10,23,0.45)",
                  borderBottom: active
                    ? `2px solid ${textColor}`
                    : "2px solid transparent",
                  pb: "2px",
                  transition: "all 0.2s ease",
                  "&:hover": { color: textColor },
                }}
              >
                {t(key)}
              </Box>
            );
          })}

          {/* Filler element */}
          <Box sx={{ flex: 1 }} />

          {/* TODO: theme later */}
          {/* <IconButton onClick={toggleTheme} color="inherit">
            {mode === "dark" ? <LightMode /> : <DarkMode />}
          </IconButton> */}

          {/* Right side */}
          {APPBAR_ITEMS_END.map(({ key, path, onClick }) => {
            const active = pathname === path || pathname.startsWith(path + "/");
            const textColor = isDark ? "#F0F1F2" : "#060a17";
            return (
              <Box
                key={key}
                onClick={() => {
                  if(onClick) onClick();
                  router.push(path);
                }}
                sx={{
                  cursor: "pointer",
                  fontFamily: LABEL_FONT,
                  fontSize: "0.7rem",
                  fontWeight: active ? 700 : 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  color: active
                    ? textColor
                    : isDark
                    ? "rgba(240,241,242,0.5)"
                    : "rgba(6,10,23,0.45)",
                  borderBottom: active
                    ? `2px solid ${textColor}`
                    : "2px solid transparent",
                  pb: "2px",
                  transition: "all 0.2s ease",
                  "&:hover": { color: textColor },
                }}
              >
                {t(key)}
              </Box>
            );
          })}
        </Toolbar>
      </AppBar>
      <Box sx={{ display: "flex", flex: 1 }}>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", md: "block" },
            width: DRAWER_WIDTH,
            flexShrink: 0,
            "& .MuiDrawer-paper": {
              width: DRAWER_WIDTH,
              boxSizing: "border-box",
              border: "none",
              bgcolor: drawerBg,
              overflowX: "hidden",
            },
          }}
        >
          {drawerContent}
        </Drawer>

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            // ml: { xs: 0, md: `${DRAWER_WIDTH}px` },
            minHeight: "100vh",
            bgcolor: "background.default",
            p: 2,
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
