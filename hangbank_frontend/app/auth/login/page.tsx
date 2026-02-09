"use client";
import { Box, Button, Container, Link, Paper, TextField, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export default function LoginPage() {
    const { t } = useTranslation("common");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleLogin = () => {
        //TODO: call axios login function
    };

    return (
        <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: (theme) => theme.palette.grey[100],
      }}
    >
      <Container maxWidth="sm">
        {/* The "Paper" component creates the elevated card effect */}
        <Paper 
          elevation={4} 
          sx={{ 
            p: 4, 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            borderRadius: 3
          }}
        >
          <Typography component="h1" variant="h5" fontWeight="bold">
            {t('login')}
          </Typography>
          
          <Box component="form" sx={{ mt: 3, width: '100%' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label={t('email')}
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label={t('password')}
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              sx={{ mt: 3, mb: 2, py: 1.5, textTransform: 'none', fontSize: '1.1rem' }}
              onClick={() => handleLogin()}
            >
              {t('login')}
            </Button>
            
            <Box sx={{ textAlign: 'center', mt: 1 }}>
              <Link href="/auth/register" variant="body2" underline="hover">
                {t('no_account_q')} {t('sign_up')}
              </Link>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
    );
}