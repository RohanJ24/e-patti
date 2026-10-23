import { describe, expect, it } from "vitest";
import { MAX_ROUNDS } from "./constants";
import {
  accumulateScores,
  assertRoundLimit,
  assertZeroSum,
  calculateRoundScores,
  inferWinnerId,
  packedRoundInput,
  rankStandings,
  ScoringError
} from "./scoring";

const players = [
  { id: "amit", name: "Amit" },
  { id: "rahul", name: "Rahul" },
  { id: "sneha", name: "Sneha" },
  { id: "karan", name: "Karan" }
];

describe("calculateRoundScores", () => {
  it("awards the winner the sum of losses from the prompt example", () => {
    const result = calculateRoundScores({
      playerIds: players.map((player) => player.id),
      winnerId: "amit",
      scores: [
        { playerId: "amit", lossPoints: 0 },
        { playerId: "rahul", lossPoints: 50 },
        { playerId: "sneha", lossPoints: 60 },
        { playerId: "karan", lossPoints: 40 }
      ]
    });

    const byId = Object.fromEntries(result.map((score) => [score.playerId, score]));
    expect(byId.amit).toMatchObject({ points: 150, lossPoints: 0, isWinner: true });
    expect(byId.rahul).toMatchObject({ points: -50, lossPoints: 50, isWinner: false });
    expect(byId.sneha).toMatchObject({ points: -60, lossPoints: 60, isWinner: false });
    expect(byId.karan).toMatchObject({ points: -40, lossPoints: 40, isWinner: false });
    expect(result.reduce((sum, score) => sum + score.points, 0)).toBe(0);
  });

  it("allows a zero-point loss", () => {
    const result = calculateRoundScores({
      playerIds: ["a", "b"],
      winnerId: "a",
      scores: [
        { playerId: "a", lossPoints: 0 },
        { playerId: "b", lossPoints: 0 }
      ]
    });
    expect(result.find((score) => score.playerId === "a")?.points).toBe(0);
    expect(result.reduce((sum, score) => sum + score.points, 0)).toBe(0);
  });

  it("rejects a winner who is also given loss points", () => {
    expect(() =>
      calculateRoundScores({
        playerIds: ["a", "b"],
        winnerId: "a",
        scores: [
          { playerId: "a", lossPoints: 10 },
          { playerId: "b", lossPoints: 10 }
        ]
      })
    ).toThrow(ScoringError);
  });

  it("rejects negative loss points", () => {
    expect(() =>
      calculateRoundScores({
        playerIds: ["a", "b"],
        winnerId: "a",
        scores: [
          { playerId: "a", lossPoints: 0 },
          { playerId: "b", lossPoints: -5 }
        ]
      })
    ).toThrow(ScoringError);
  });

  it("rejects a winner who is not a participant", () => {
    expect(() =>
      calculateRoundScores({
        playerIds: ["a", "b"],
        winnerId: "c",
        scores: [
          { playerId: "a", lossPoints: 0 },
          { playerId: "b", lossPoints: 10 }
        ]
      })
    ).toThrow(ScoringError);
  });
});

describe("inferWinnerId from packed players", () => {
  it("treats the last remaining player as the winner", () => {
    expect(inferWinnerId(["a", "b", "c"], ["b"])).toBeNull();
    expect(inferWinnerId(["a", "b", "c"], ["b", "c"])).toBe("a");
    expect(inferWinnerId(["a", "b", "c"], ["a", "b", "c"])).toBeNull();
  });

  it("builds a zero-sum round from packed losses", () => {
    const input = packedRoundInput(["amit", "rahul", "sneha"], { rahul: 50, sneha: 70 });
    expect(input?.winnerId).toBe("amit");
    const result = calculateRoundScores(input!);
    const byId = Object.fromEntries(result.map((score) => [score.playerId, score]));
    expect(byId.amit).toMatchObject({ points: 120, isWinner: true });
    expect(byId.rahul.points).toBe(-50);
    expect(byId.sneha.points).toBe(-70);
  });
});

describe("accumulateScores and ranking", () => {
  it("recalculates cumulative scores after multiple rounds", () => {
    const totals = accumulateScores(
      [
        { id: "amit", name: "Amit", seatNumber: 1 },
        { id: "rahul", name: "Rahul", seatNumber: 2 },
        { id: "sneha", name: "Sneha", seatNumber: 3 }
      ],
      [
        {
          winnerId: "amit",
          playerScores: [
            { playerId: "amit", points: 500 },
            { playerId: "rahul", points: -300 },
            { playerId: "sneha", points: -200 }
          ]
        }
      ]
    );

    const ranked = rankStandings(totals);
    expect(ranked[0]).toMatchObject({ playerName: "Amit", rank: 1, netPoints: 500 });
    expect(ranked[1]).toMatchObject({ playerName: "Sneha", rank: 2, netPoints: -200 });
    expect(ranked[2]).toMatchObject({ playerName: "Rahul", rank: 3, netPoints: -300 });
    assertZeroSum(ranked.map((player) => player.netPoints));
  });

  it("assigns tied ranks when net scores match", () => {
    const ranked = rankStandings([
      { playerId: "a", playerName: "A", seatNumber: 1, pointsWon: 10, pointsLost: 0, netPoints: 10 },
      { playerId: "b", playerName: "B", seatNumber: 2, pointsWon: 10, pointsLost: 0, netPoints: 10 },
      { playerId: "c", playerName: "C", seatNumber: 3, pointsWon: 0, pointsLost: 20, netPoints: -20 }
    ]);
    expect(ranked[0].rank).toBe(1);
    expect(ranked[1].rank).toBe(1);
    expect(ranked[2].rank).toBe(3);
  });
});

describe("round limit", () => {
  it("blocks more than 50 rounds", () => {
    expect(() => assertRoundLimit(MAX_ROUNDS)).toThrow(ScoringError);
    expect(() => assertRoundLimit(MAX_ROUNDS - 1)).not.toThrow();
  });
});
