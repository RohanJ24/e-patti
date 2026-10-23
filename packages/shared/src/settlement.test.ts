import { describe, expect, it } from "vitest";
import { rankStandings } from "./scoring";
import {
  buildSettlement,
  convertNetPointsToPaise,
  formatCurrency,
  matchTransfers
} from "./settlement";

const sampleStandings = rankStandings([
  { playerId: "amit", playerName: "Amit", seatNumber: 1, pointsWon: 1200, pointsLost: 700, netPoints: 500 },
  { playerId: "rahul", playerName: "Rahul", seatNumber: 2, pointsWon: 400, pointsLost: 700, netPoints: -300 },
  { playerId: "sneha", playerName: "Sneha", seatNumber: 3, pointsWon: 300, pointsLost: 500, netPoints: -200 }
]);

describe("buildSettlement", () => {
  it("matches the prompt settlement example at ₹1 per point", () => {
    const result = buildSettlement({
      gameId: "game-1",
      roomId: "ABCD12",
      standings: sampleStandings,
      pointsToMoneyRate: 1
    });

    expect(result.unit).toBe("currency");
    expect(result.totalPayable).toBe(500);
    expect(result.totalReceivable).toBe(500);
    expect(result.transfers).toHaveLength(2);
    expect(result.transfers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ payerName: "Rahul", receiverName: "Amit", amount: 300 }),
        expect.objectContaining({ payerName: "Sneha", receiverName: "Amit", amount: 200 })
      ])
    );
  });

  it("falls back to points when no conversion rate is configured", () => {
    const result = buildSettlement({
      gameId: "game-1",
      roomId: "ABCD12",
      standings: sampleStandings,
      pointsToMoneyRate: null
    });
    expect(result.unit).toBe("points");
    expect(result.transfers.every((transfer) => transfer.unit === "points")).toBe(true);
    expect(formatCurrency(300, "points")).toBe("300 pts");
  });

  it("keeps payable and receivable equal after decimal rounding", () => {
    const standings = rankStandings([
      { playerId: "a", playerName: "A", seatNumber: 1, pointsWon: 1, pointsLost: 0, netPoints: 1 },
      { playerId: "b", playerName: "B", seatNumber: 2, pointsWon: 1, pointsLost: 0, netPoints: 1 },
      { playerId: "c", playerName: "C", seatNumber: 3, pointsWon: 0, pointsLost: 2, netPoints: -2 }
    ]);
    const result = buildSettlement({
      gameId: "r",
      roomId: "R1",
      standings,
      pointsToMoneyRate: 0.3333
    });
    expect(result.totalPayable).toBeCloseTo(result.totalReceivable, 2);
    const paise = convertNetPointsToPaise(standings, 0.3333);
    const sum = [...paise.values()].reduce((total, value) => total + value, 0);
    expect(sum).toBe(0);
  });
});

describe("matchTransfers", () => {
  it("settles every balance exactly with the fewest practical transfers", () => {
    const transfers = matchTransfers([
      { playerId: "a", name: "A", amount: 100 },
      { playerId: "b", name: "B", amount: 50 },
      { playerId: "c", name: "C", amount: -80 },
      { playerId: "d", name: "D", amount: -70 }
    ]);
    const paid = transfers.reduce((sum, transfer) => sum + transfer.amount, 0);
    expect(paid).toBe(150);
    expect(transfers.length).toBeLessThanOrEqual(3);
  });
});
