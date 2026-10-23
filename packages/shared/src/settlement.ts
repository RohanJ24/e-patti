import { SETTLEMENT_DISCLAIMER } from "./constants";
import type { PlayerStanding, SettlementResult, SettlementTransfer } from "./types";

export class SettlementError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SettlementError";
  }
}

function roundHalfUp(value: number): number {
  return Math.round(value + Number.EPSILON);
}

/**
 * Convert net points to integer paise (1/100 of a rupee) using half-up rounding.
 * Any leftover paise from rounding is applied to the player with the largest
 * absolute net-point total so that payable and receivable amounts still match.
 */
export function convertNetPointsToPaise(
  standings: PlayerStanding[],
  rate: number
): Map<string, number> {
  if (!(rate > 0)) {
    throw new SettlementError("Conversion rate must be greater than zero");
  }

  const paiseByPlayer = new Map<string, number>();
  let roundedSum = 0;
  for (const player of standings) {
    const paise = roundHalfUp(player.netPoints * rate * 100);
    paiseByPlayer.set(player.playerId, paise);
    roundedSum += paise;
  }

  if (roundedSum !== 0 && standings.length > 0) {
    const adjustTarget = [...standings].sort(
      (a, b) => Math.abs(b.netPoints) - Math.abs(a.netPoints)
    )[0];
    paiseByPlayer.set(
      adjustTarget.playerId,
      (paiseByPlayer.get(adjustTarget.playerId) ?? 0) - roundedSum
    );
  }

  return paiseByPlayer;
}

export function paiseToRupees(paise: number): number {
  return paise / 100;
}

/**
 * Greedy matching of largest remaining payer with largest remaining receiver.
 * Every balance is settled exactly and the number of transfers stays small.
 */
export function matchTransfers(
  balances: Array<{ playerId: string; name: string; amount: number }>
): SettlementTransfer[] {
  const unitGuess = "currency" as const;
  const receivers = balances
    .filter((item) => item.amount > 0)
    .map((item) => ({ ...item }))
    .sort((a, b) => b.amount - a.amount);
  const payers = balances
    .filter((item) => item.amount < 0)
    .map((item) => ({ ...item }))
    .sort((a, b) => a.amount - b.amount);

  const transfers: SettlementTransfer[] = [];
  let i = 0;
  let j = 0;

  while (i < payers.length && j < receivers.length) {
    const payer = payers[i];
    const receiver = receivers[j];
    const payable = -payer.amount;
    const take = Math.min(payable, receiver.amount);

    if (take > 0) {
      transfers.push({
        payerPlayerId: payer.playerId,
        payerName: payer.name,
        receiverPlayerId: receiver.playerId,
        receiverName: receiver.name,
        amount: take,
        unit: unitGuess
      });
    }

    payer.amount += take;
    receiver.amount -= take;
    if (Math.abs(payer.amount) < 1e-9) i += 1;
    if (Math.abs(receiver.amount) < 1e-9) j += 1;
  }

  return transfers;
}

export function buildSettlement(options: {
  gameId: string;
  roomId: string;
  standings: PlayerStanding[];
  pointsToMoneyRate: number | null;
}): SettlementResult {
  const { gameId, roomId, standings, pointsToMoneyRate } = options;
  const netSum = standings.reduce((sum, player) => sum + player.netPoints, 0);
  if (Math.abs(netSum) > 1e-9) {
    throw new SettlementError("Cannot settle a game whose net points do not sum to zero");
  }

  const useCurrency = pointsToMoneyRate != null && pointsToMoneyRate > 0;
  const unit: "currency" | "points" = useCurrency ? "currency" : "points";

  const amounts = new Map<string, number>();
  if (useCurrency) {
    const paise = convertNetPointsToPaise(standings, pointsToMoneyRate!);
    for (const [playerId, value] of paise) {
      amounts.set(playerId, paiseToRupees(value));
    }
  } else {
    for (const player of standings) {
      amounts.set(player.playerId, player.netPoints);
    }
  }

  const balances: PlayerStanding[] = standings.map((player) => ({
    ...player,
    moneyBalance: amounts.get(player.playerId) ?? 0
  }));

  const transfers = matchTransfers(
    balances.map((player) => ({
      playerId: player.playerId,
      name: player.playerName,
      amount: player.moneyBalance ?? 0
    }))
  ).map((transfer) => ({ ...transfer, unit }));

  const totalReceivable = balances
    .filter((player) => (player.moneyBalance ?? 0) > 0)
    .reduce((sum, player) => sum + (player.moneyBalance ?? 0), 0);
  const totalPayable = balances
    .filter((player) => (player.moneyBalance ?? 0) < 0)
    .reduce((sum, player) => sum + Math.abs(player.moneyBalance ?? 0), 0);

  const delta = Math.round((totalReceivable - totalPayable) * 100) / 100;
  if (Math.abs(delta) > 0.009) {
    throw new SettlementError("Payable and receivable totals must match");
  }

  const payerTotals = balances
    .filter((player) => (player.moneyBalance ?? 0) < 0)
    .map((player) => ({
      playerId: player.playerId,
      playerName: player.playerName,
      amount: Math.round(Math.abs(player.moneyBalance ?? 0) * 100) / 100
    }));
  const receiverTotals = balances
    .filter((player) => (player.moneyBalance ?? 0) > 0)
    .map((player) => ({
      playerId: player.playerId,
      playerName: player.playerName,
      amount: Math.round((player.moneyBalance ?? 0) * 100) / 100
    }));

  return {
    gameId,
    roomId,
    unit,
    pointsToMoneyRate,
    balances,
    transfers,
    totalPayable: Math.round(totalPayable * 100) / 100,
    totalReceivable: Math.round(totalReceivable * 100) / 100,
    payerTotals,
    receiverTotals,
    disclaimer: SETTLEMENT_DISCLAIMER
  };
}

export function formatCurrency(amount: number, unit: "currency" | "points"): string {
  const abs = Math.abs(amount);
  if (unit === "points") {
    return `${abs.toLocaleString("en-IN")} pts`;
  }
  return `₹${abs.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

export function formatSignedCurrency(amount: number, unit: "currency" | "points"): string {
  const formatted = formatCurrency(amount, unit);
  if (amount > 0) return `+${formatted}`;
  if (amount < 0) return `-${formatted}`;
  return unit === "currency" ? "₹0.00" : "0 pts";
}

export function describeTransfer(transfer: SettlementTransfer): string {
  return `${transfer.payerName} pays ${transfer.receiverName} ${formatCurrency(
    transfer.amount,
    transfer.unit
  )}.`;
}
