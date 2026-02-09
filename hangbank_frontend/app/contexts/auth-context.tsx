"use client";

import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import api, { validate } from "../axios";

export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    profilePictureUrl: string;
    roles: Role[];
}

export interface Role {
    id: string;
    role: string;
    priority: number;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const validateAuth = async () => {
        const isValid = await validate();
        if(!isValid && !pathname.includes('/auth')) {
            router.push(`/auth/login`);
        }

        setLoading(false);
    };


    

    validateAuth();
  }, [pathname, router]);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);