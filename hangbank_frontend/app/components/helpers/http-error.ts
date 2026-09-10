import { AxiosError } from "axios";

// If the backend sent a translatable "httpErrors.*" message, return its translation;
// otherwise return the provided fallback text.
export function translateHttpError(
  err: unknown,
  t: (key: string) => string,
  fallback: string,
): string {
  const raw = (err as AxiosError<{ message?: string | string[] }>).response?.data
    ?.message;
  const message = Array.isArray(raw) ? raw[0] : raw;
  if (message && message.startsWith("httpErrors.")) {
    return t(message);
  }
  return fallback;
}
