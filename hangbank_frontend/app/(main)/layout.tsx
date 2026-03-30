"use client";
import { Box, CircularProgress } from "@mui/material";
import { AuthProvider, useAuth } from "../contexts/auth-context";
import { LanguageProvider } from "../providers/language-provider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
    const {user, loading} = useAuth();
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <LanguageProvider>
            {loading || !user ? (
              <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
                <CircularProgress />
              </Box>
            ) : (
              <div>
                {children}
              </div>
            )}
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
