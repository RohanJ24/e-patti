export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "E-Patti API",
    version: "1.0.0",
    description:
      "Score-tracking and settlement-calculation API for Teen Patti. Records are stored as JSON files. The API never collects bets, holds funds, or processes payments."
  },
  servers: [{ url: "/api", description: "Current server" }],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" }
    }
  },
  security: [{ bearerAuth: [] }],
  paths: {
    "/auth/register": {
      post: {
        security: [],
        summary: "Register with full name, mobile number, and password",
        tags: ["Authentication"]
      }
    },
    "/auth/login": {
      post: { security: [], summary: "Log in with mobile number and password", tags: ["Authentication"] }
    },
    "/auth/logout": { post: { summary: "End the client session", tags: ["Authentication"] } },
    "/auth/me": {
      get: { summary: "Current user profile", tags: ["Authentication"] },
      patch: { summary: "Update name or password", tags: ["Authentication"] }
    },
    "/games": {
      get: { summary: "List the authenticated user's games", tags: ["Games"] },
      post: { summary: "Create a game room", tags: ["Games"] }
    },
    "/games/{gameId}": {
      get: { summary: "Game details including rounds", tags: ["Games"] },
      patch: { summary: "Update game name or conversion rate", tags: ["Games"] },
      delete: { summary: "Delete a game room", tags: ["Games"] }
    },
    "/games/{gameId}/complete": { post: { summary: "Mark the game completed", tags: ["Games"] } },
    "/games/{gameId}/reopen": { post: { summary: "Reopen a completed game for corrections", tags: ["Games"] } },
    "/games/{gameId}/rounds": {
      get: { summary: "List rounds", tags: ["Rounds"] },
      post: { summary: "Record a round; winner points are computed server-side", tags: ["Rounds"] }
    },
    "/games/{gameId}/rounds/{roundId}": {
      get: { summary: "Round detail", tags: ["Rounds"] },
      patch: { summary: "Correct a saved round and recalculate scores", tags: ["Rounds"] },
      delete: { summary: "Delete a round and renumber remaining rounds", tags: ["Rounds"] }
    },
    "/games/{gameId}/summary": { get: { summary: "Full game summary", tags: ["Results"] } },
    "/games/{gameId}/settlement": { get: { summary: "Settlement instructions", tags: ["Results"] } },
    "/games/{gameId}/export/pdf": { get: { summary: "Download Excel-style PDF report", tags: ["Reports"] } }
  }
};
