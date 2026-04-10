import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export const validate = async (): Promise<boolean> => {
  const token = getAuthToken();
  if (!token) {
    return false;
  }

  api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

  try {
    await api.get("/user/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return true;
  } catch {
    console.log("Not logged in, redirecting...");
    return false;
  }
};

export async function login(email: string, password: string): Promise<void> {
  const { data } = await api.post<string>("/auth/login", { email, password });
  setAuthToken(data);
}

export async function register(body: {
  email: string;
  password: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  profilePictureUrl?: string;
}): Promise<void> {
  const { data } = await api.post<string>("/auth/register", body);
  setAuthToken(data);
}

export function setAuthToken(token: string | null) {
  if (token) {
    localStorage.setItem("token", token);
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    localStorage.removeItem("token");
    delete api.defaults.headers.common["Authorization"];
  }
}

export function removeAuthToken() {
  localStorage.removeItem("token");
}

export function getAuthToken(): string | null {
  return localStorage.getItem("token");
}

export default api;
