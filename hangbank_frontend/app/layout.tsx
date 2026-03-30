"use client";
import { Box, CircularProgress } from "@mui/material";
import { AuthProvider, useAuth } from "./contexts/auth-context";
import { LanguageProvider } from "./providers/language-provider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <LanguageProvider>
            {children}
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
