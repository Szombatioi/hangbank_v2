"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import api, { getAuthToken, validate } from "../axios";

export interface User {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    profilePictureUrl?: string;
    gender?: string | null;
    birthDate?: string | null; // ISO date string, e.g. "1990-05-20"
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
      try{
        const token = getAuthToken();
        if(!token){
          throw new Error();
        }

        api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        const response = await api.get("/user/me", { headers: { Authorization: `Bearer ${token}` }, });

        if(response.data){
          setUser(response.data);
        }
      }catch(error){
        setUser(null);

        //redirect to login page
        if(!pathname.includes("/auth")){
          router.replace("/auth/login");
        }
      } finally{
        setLoading(false);
      }
    };

    validateAuth();
  }, [pathname, router]);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
