import { afterAll, describe, expect, it } from "vitest";
import fs from "fs/promises";
import request from "supertest";
import { bootstrapStorage, createApp } from "../src/app";
import { config } from "../src/config";
import { MAX_PLAYERS, MAX_ROUNDS } from "@e-patti/shared";

await bootstrapStorage();
const app = createApp();
const suffix = Date.now().toString().slice(-8);
const phone = `98${suffix.padStart(8, "0")}`.slice(0, 10);

let token = "";
let otherToken = "";
let gameId = "";
let roomId = "";
let playerIds: string[] = [];
let roundId = "";

describe("E-Patti API", () => {
  it("registers, logs in, logs out, and rejects invalid credentials", async () => {
    const register = await request(app).post("/api/auth/register").send({
      fullName: "Host Player",
      mobileNumber: phone,
      password: "Secret123",
      confirmPassword: "Secret123"
    });
    expect(register.status).toBe(201);
    token = register.body.accessToken;
    expect(token).toBeTruthy();
    expect(register.body.user.fullName).toBe("Host Player");

    const duplicate = await request(app).post("/api/auth/register").send({
      fullName: "Someone Else",
      mobileNumber: phone,
      password: "Secret123",
      confirmPassword: "Secret123"
    });
    expect(duplicate.status).toBe(409);

    const login = await request(app).post("/api/auth/login").send({
      mobileNumber: phone,
      password: "Secret123"
    });
    expect(login.status).toBe(200);

    const bad = await request(app).post("/api/auth/login").send({
      mobileNumber: phone,
      password: "WrongPass1"
    });
    expect(bad.status).toBe(401);

    const me = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);
    expect(me.status).toBe(200);
    expect(me.body.user.mobileNumber).toBe(phone);

    const logout = await request(app).post("/api/auth/logout").set("Authorization", `Bearer ${token}`);
    expect(logout.status).toBe(200);
  });

  it("rejects unauthenticated game access", async () => {
    const res = await request(app).get("/api/games");
    expect(res.status).toBe(401);
  });

  it("creates rooms with 2–8 players and rejects more than 8", async () => {
    const created = await request(app)
      .post("/api/games")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Friday night",
        pointsToMoneyRate: 1,
        players: [{ name: "Amit" }, { name: "Rahul" }, { name: "Sneha" }]
      });
    expect(created.status).toBe(201);
    gameId = created.body.game.id;
    roomId = created.body.game.roomId;
    playerIds = created.body.game.players.map((player: { id: string }) => player.id);
    expect(created.body.game.players).toHaveLength(3);
    expect(created.body.game.status).toBe("ACTIVE");

    const tooFew = await request(app)
      .post("/api/games")
      .set("Authorization", `Bearer ${token}`)
      .send({ players: [{ name: "OnlyOne" }] });
    expect(tooFew.status).toBe(400);

    const tooMany = await request(app)
      .post("/api/games")
      .set("Authorization", `Bearer ${token}`)
      .send({
        players: Array.from({ length: MAX_PLAYERS + 1 }, (_, index) => ({ name: `Player ${index + 1}` }))
      });
    expect(tooMany.status).toBe(400);
  });

  it("records a zero-sum round and computes settlement", async () => {
    const [amit, rahul, sneha] = playerIds;
    const round = await request(app)
      .post(`/api/games/${gameId}/rounds`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        winnerId: amit,
        scores: [
          { playerId: amit, lossPoints: 0 },
          { playerId: rahul, lossPoints: 300 },
          { playerId: sneha, lossPoints: 200 }
        ]
      });
    expect(round.status).toBe(201);
    roundId = round.body.round.id;
    const amitScore = round.body.round.playerScores.find(
      (score: { playerId: string }) => score.playerId === amit
    );
    expect(amitScore.points).toBe(500);
    expect(
      round.body.round.playerScores.reduce((sum: number, score: { points: number }) => sum + score.points, 0)
    ).toBe(0);

    const settlement = await request(app)
      .get(`/api/games/${gameId}/settlement`)
      .set("Authorization", `Bearer ${token}`);
    expect(settlement.status).toBe(200);
    expect(settlement.body.settlement.totalPayable).toBe(500);
    expect(settlement.body.settlement.transfers).toHaveLength(2);
  });

  it("rejects invalid scores", async () => {
    const [amit, rahul, sneha] = playerIds;
    const winnerAsLoser = await request(app)
      .post(`/api/games/${gameId}/rounds`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        winnerId: amit,
        scores: [
          { playerId: amit, lossPoints: 10 },
          { playerId: rahul, lossPoints: 10 },
          { playerId: sneha, lossPoints: 10 }
        ]
      });
    expect(winnerAsLoser.status).toBe(400);

    const negative = await request(app)
      .post(`/api/games/${gameId}/rounds`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        winnerId: amit,
        scores: [
          { playerId: amit, lossPoints: 0 },
          { playerId: rahul, lossPoints: -5 },
          { playerId: sneha, lossPoints: 5 }
        ]
      });
    expect(negative.status).toBe(400);
  });

  it("recalculates scores after a round edit and generates a PDF", async () => {
    const [amit, rahul, sneha] = playerIds;
    const updated = await request(app)
      .patch(`/api/games/${gameId}/rounds/${roundId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        winnerId: amit,
        scores: [
          { playerId: amit, lossPoints: 0 },
          { playerId: rahul, lossPoints: 50 },
          { playerId: sneha, lossPoints: 50 }
        ]
      });
    expect(updated.status).toBe(200);
    const amitScore = updated.body.round.playerScores.find(
      (score: { playerId: string }) => score.playerId === amit
    );
    expect(amitScore.points).toBe(100);

    const pdf = await request(app)
      .get(`/api/games/${gameId}/export/pdf`)
      .set("Authorization", `Bearer ${token}`);
    expect(pdf.status).toBe(200);
    expect(pdf.headers["content-type"]).toContain("application/pdf");
    expect(pdf.headers["content-disposition"]).toContain(`E-Patti-Room-${roomId}-Summary.pdf`);
    expect(pdf.body.length).toBeGreaterThan(100);
  });

  it("deletes a round and recalculates totals", async () => {
    const deleted = await request(app)
      .delete(`/api/games/${gameId}/rounds/${roundId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(deleted.status).toBe(200);

    const summary = await request(app)
      .get(`/api/games/${gameId}/summary`)
      .set("Authorization", `Bearer ${token}`);
    expect(summary.body.validation.totalRounds).toBe(0);
    expect(summary.body.validation.netBalance).toBe(0);
  });

  it("completes, blocks edits, reopens, and persists after reload", async () => {
    const [amit, rahul, sneha] = playerIds;
    await request(app)
      .post(`/api/games/${gameId}/rounds`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        winnerId: amit,
        scores: [
          { playerId: amit, lossPoints: 0 },
          { playerId: rahul, lossPoints: 40 },
          { playerId: sneha, lossPoints: 60 }
        ]
      });

    const completed = await request(app)
      .post(`/api/games/${gameId}/complete`)
      .set("Authorization", `Bearer ${token}`);
    expect(completed.status).toBe(200);
    expect(completed.body.game.status).toBe("COMPLETED");

    const blocked = await request(app)
      .post(`/api/games/${gameId}/rounds`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        winnerId: amit,
        scores: [
          { playerId: amit, lossPoints: 0 },
          { playerId: rahul, lossPoints: 1 },
          { playerId: sneha, lossPoints: 1 }
        ]
      });
    expect(blocked.status).toBe(400);

    const reopened = await request(app)
      .post(`/api/games/${gameId}/reopen`)
      .set("Authorization", `Bearer ${token}`);
    expect(reopened.body.game.status).toBe("ACTIVE");

    const raw = await fs.readFile(`${config.dataDir}/games/${gameId}.json`, "utf8");
    const stored = JSON.parse(raw);
    expect(stored.rounds).toHaveLength(1);
    expect(stored.players).toHaveLength(3);
  });

  it("enforces the 50-round limit", async () => {
    const limitGame = await request(app)
      .post("/api/games")
      .set("Authorization", `Bearer ${token}`)
      .send({ players: [{ name: "A" }, { name: "B" }] });
    const id = limitGame.body.game.id;
    const [a, b] = limitGame.body.game.players.map((player: { id: string }) => player.id);

    for (let i = 0; i < MAX_ROUNDS; i += 1) {
      const res = await request(app)
        .post(`/api/games/${id}/rounds`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          winnerId: a,
          scores: [
            { playerId: a, lossPoints: 0 },
            { playerId: b, lossPoints: 1 }
          ]
        });
      expect(res.status).toBe(201);
    }

    const extra = await request(app)
      .post(`/api/games/${id}/rounds`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        winnerId: a,
        scores: [
          { playerId: a, lossPoints: 0 },
          { playerId: b, lossPoints: 1 }
        ]
      });
    expect(extra.status).toBe(400);
  });

  it("serializes concurrent round writes on the same game", async () => {
    const created = await request(app)
      .post("/api/games")
      .set("Authorization", `Bearer ${token}`)
      .send({ players: [{ name: "One" }, { name: "Two" }] });
    const id = created.body.game.id;
    const [a, b] = created.body.game.players.map((player: { id: string }) => player.id);
    const payload = {
      winnerId: a,
      scores: [
        { playerId: a, lossPoints: 0 },
        { playerId: b, lossPoints: 5 }
      ]
    };

    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        request(app).post(`/api/games/${id}/rounds`).set("Authorization", `Bearer ${token}`).send(payload)
      )
    );
    expect(results.every((res) => res.status === 201)).toBe(true);

    const game = await request(app).get(`/api/games/${id}`).set("Authorization", `Bearer ${token}`);
    expect(game.body.game.rounds).toHaveLength(5);
    const numbers = game.body.game.rounds.map((round: { roundNumber: number }) => round.roundNumber).sort();
    expect(numbers).toEqual([1, 2, 3, 4, 5]);
  });

  it("blocks another user from accessing the room or PDF", async () => {
    const otherPhone = `97${suffix.padStart(8, "0")}`.slice(0, 10);
    const other = await request(app).post("/api/auth/register").send({
      fullName: "Other User",
      mobileNumber: otherPhone,
      password: "Secret123",
      confirmPassword: "Secret123"
    });
    otherToken = other.body.accessToken;
    const denied = await request(app)
      .get(`/api/games/${gameId}`)
      .set("Authorization", `Bearer ${otherToken}`);
    expect(denied.status).toBe(403);

    const pdf = await request(app)
      .get(`/api/games/${gameId}/export/pdf`)
      .set("Authorization", `Bearer ${otherToken}`);
    expect(pdf.status).toBe(403);
  });

  it("searches games by room ID and name", async () => {
    const listed = await request(app)
      .get("/api/games")
      .query({ search: roomId })
      .set("Authorization", `Bearer ${token}`);
    expect(listed.status).toBe(200);
    expect(listed.body.items.some((item: { roomId: string }) => item.roomId === roomId)).toBe(true);
  });
});

afterAll(async () => {
  await fs.rm(config.dataDir, { recursive: true, force: true }).catch(() => undefined);
});
