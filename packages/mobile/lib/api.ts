import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";
import type { Game, GameListItem, GameSummary, Round, UserPublic } from "@e-patti/shared";

const TOKEN_KEY = "epatti_token";

function isLoopback(value: string): boolean {
  return /localhost|127\.0\.0\.1/.test(value);
}

function lanHostFromExpo(): string | null {
  const expoGo = Constants.expoGoConfig as { debuggerHost?: string } | null;
  const candidates = [
    expoGo?.debuggerHost,
    Constants.expoConfig?.hostUri,
    Constants.linkingUri
  ].filter((value): value is string => Boolean(value));

  for (const value of candidates) {
    const ipv4 = value.match(/(\d{1,3}(?:\.\d{1,3}){3})/);
    if (ipv4) return ipv4[1];
  }
  return null;
}

function resolveApiUrl(): string {
  const env = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");
  if (env && !isLoopback(env)) return env;

  const host = lanHostFromExpo();
  if (host) return `http://${host}:4000/api`;

  const extra = (Constants.expoConfig?.extra?.apiUrl as string | undefined)?.replace(/\/$/, "");
  if (extra && !isLoopback(extra)) return extra;

  if (Platform.OS === "android") return "http://10.0.2.2:4000/api";
  return extra ?? "http://localhost:4000/api";
}

export const API_URL = resolveApiUrl();

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function setToken(token: string | null): Promise<void> {
  if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
  else await AsyncStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, init: RequestInit = {}, asBlob = false): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const token = await getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(
      0,
      `Cannot reach the API at ${API_URL}. Keep the API running on this computer, use the same Wi-Fi, and allow port 4000 in Windows Firewall.`
    );
  }
  if (asBlob) {
    if (!response.ok) throw new ApiError(response.status, "Unable to download PDF");
    return (await response.blob()) as T;
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(response.status, payload?.error?.message ?? "Request failed");
  }
  return payload as T;
}

export const api = {
  register: (body: unknown) =>
    request<{ user: UserPublic; accessToken: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(body)
    }),
  login: (body: unknown) =>
    request<{ user: UserPublic; accessToken: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(body)
    }),
  logout: () => request("/auth/logout", { method: "POST" }),
  me: () => request<{ user: UserPublic }>("/auth/me"),
  updateProfile: (body: unknown) =>
    request<{ user: UserPublic }>("/auth/me", { method: "PATCH", body: JSON.stringify(body) }),
  listGames: () => request<{ items: GameListItem[] }>("/games"),
  createGame: (body: unknown) =>
    request<{ game: Game }>("/games", { method: "POST", body: JSON.stringify(body) }),
  getGame: (id: string) => request<{ game: Game }>(`/games/${id}`),
  completeGame: (id: string) => request<{ game: Game }>(`/games/${id}/complete`, { method: "POST" }),
  reopenGame: (id: string) => request<{ game: Game }>(`/games/${id}/reopen`, { method: "POST" }),
  deleteGame: (id: string) => request(`/games/${id}`, { method: "DELETE" }),
  summary: (id: string) => request<GameSummary>(`/games/${id}/summary`),
  createRound: (id: string, body: unknown) =>
    request<{ round: Round }>(`/games/${id}/rounds`, { method: "POST", body: JSON.stringify(body) }),
  updateRound: (gameId: string, roundId: string, body: unknown) =>
    request<{ round: Round }>(`/games/${gameId}/rounds/${roundId}`, {
      method: "PATCH",
      body: JSON.stringify(body)
    }),
  deleteRound: (gameId: string, roundId: string) =>
    request(`/games/${gameId}/rounds/${roundId}`, { method: "DELETE" }),
  pdf: (id: string) => request<Blob>(`/games/${id}/export/pdf`, {}, true)
};
