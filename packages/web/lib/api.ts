import type { Game, GameListItem, GameSummary, Round, SettlementResult, UserPublic } from "@e-patti/shared";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
const TOKEN_KEY = "epatti_token";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_URL}${path}`, { ...init, headers });
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/pdf")) {
    if (!response.ok) {
      throw new ApiError(response.status, "PDF_ERROR", "Unable to generate the PDF");
    }
    return (await response.blob()) as T;
  }

  const payload = contentType.includes("application/json") ? await response.json() : null;
  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload?.error?.code ?? "REQUEST_FAILED",
      payload?.error?.message ?? "Request failed"
    );
  }
  return payload as T;
}

export const api = {
  register: (body: { fullName: string; mobileNumber: string; password: string; confirmPassword: string }) =>
    request<{ user: UserPublic; accessToken: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(body)
    }),
  login: (body: { mobileNumber: string; password: string }) =>
    request<{ user: UserPublic; accessToken: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(body)
    }),
  logout: () => request<{ message: string }>("/auth/logout", { method: "POST" }),
  me: () => request<{ user: UserPublic }>("/auth/me"),
  updateProfile: (body: Record<string, string>) =>
    request<{ user: UserPublic }>("/auth/me", { method: "PATCH", body: JSON.stringify(body) }),
  listGames: (query?: { search?: string; status?: string }) => {
    const params = new URLSearchParams();
    if (query?.search) params.set("search", query.search);
    if (query?.status) params.set("status", query.status);
    const suffix = params.toString() ? `?${params}` : "";
    return request<{ items: GameListItem[]; total: number }>(`/games${suffix}`);
  },
  createGame: (body: unknown) =>
    request<{ game: Game }>("/games", { method: "POST", body: JSON.stringify(body) }),
  getGame: (gameId: string) => request<{ game: Game }>(`/games/${gameId}`),
  updateGame: (gameId: string, body: unknown) =>
    request<{ game: Game }>(`/games/${gameId}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteGame: (gameId: string) => request<{ ok: boolean }>(`/games/${gameId}`, { method: "DELETE" }),
  completeGame: (gameId: string) =>
    request<{ game: Game }>(`/games/${gameId}/complete`, { method: "POST" }),
  reopenGame: (gameId: string) =>
    request<{ game: Game }>(`/games/${gameId}/reopen`, { method: "POST" }),
  summary: (gameId: string) => request<GameSummary>(`/games/${gameId}/summary`),
  settlement: (gameId: string) => request<{ settlement: SettlementResult }>(`/games/${gameId}/settlement`),
  createRound: (gameId: string, body: unknown) =>
    request<{ round: Round }>(`/games/${gameId}/rounds`, { method: "POST", body: JSON.stringify(body) }),
  updateRound: (gameId: string, roundId: string, body: unknown) =>
    request<{ round: Round }>(`/games/${gameId}/rounds/${roundId}`, {
      method: "PATCH",
      body: JSON.stringify(body)
    }),
  deleteRound: (gameId: string, roundId: string) =>
    request<{ ok: boolean }>(`/games/${gameId}/rounds/${roundId}`, { method: "DELETE" }),
  downloadPdf: async (gameId: string) => {
    const blob = await request<Blob>(`/games/${gameId}/export/pdf`);
    return blob;
  }
};
