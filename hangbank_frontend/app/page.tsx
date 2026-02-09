"use client";
import { useAuth } from "./contexts/auth-context";

export default function Home() {
  const {user, loading} = useAuth();
  return (
    loading || !user ? (<div>Loading...</div>) : (<div>Welcome, {user?.firstName}!</div>) 
  );
}
