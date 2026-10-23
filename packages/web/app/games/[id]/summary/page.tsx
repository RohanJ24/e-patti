"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { GameSummary } from "@e-patti/shared";
import { AppShell } from "@/components/AppShell";
import { AllRoundsMatrix, RoundDetailTable } from "@/components/RoundPointsTables";
import { Button, Card, Spinner, useToast } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { formatCurrency } from "@e-patti/shared";
import { moneyOrPoints, signedPoints } from "@/lib/format";

export default function SummaryPage() {
  const params = useParams<{ id: string }>();
  const toast = useToast();
  const [summary, setSummary] = useState<GameSummary | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .summary(params.id)
      .then(setSummary)
      .catch((error) => toast.push(error instanceof ApiError ? error.message : "Unable to load summary", "error"));
  }, [params.id, toast]);

  async function download() {
    if (!summary) return;
    setBusy(true);
    try {
      const blob = await api.downloadPdf(params.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `E-Patti-Room-${summary.game.roomId}-Summary.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.push(error instanceof ApiError ? error.message : "Unable to export PDF", "error");
    } finally {
      setBusy(false);
    }
  }

  if (!summary) {
    return (
      <AppShell>
        <Spinner label="Preparing summary…" />
      </AppShell>
    );
  }

  const unit = summary.settlement.unit;
  const rate = summary.game.scoringConfig.pointsToMoneyRate;

  return (
    <AppShell>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl text-forest-900">Final game summary</h1>
          <p className="text-slate-600">
            {summary.game.name || summary.game.roomId} · {summary.validation.totalRounds} rounds
          </p>
        </div>
        <Button onClick={download} disabled={busy}>
          {busy ? "Generating PDF…" : "Download PDF"}
        </Button>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 font-display text-2xl text-forest-900">Round-by-round points</h2>
        <div className="space-y-4">
          {summary.game.rounds.length === 0 ? (
            <Card>
              <p className="text-sm text-slate-500">No rounds recorded yet.</p>
            </Card>
          ) : (
            summary.game.rounds.map((round) => (
              <Card key={round.id} className="p-0">
                <div className="border-b border-cream-200 px-4 py-3">
                  <h3 className="font-semibold text-forest-900">
                    Round {round.roundNumber} · Winner {round.winnerName}
                  </h3>
                </div>
                <RoundDetailTable round={round} players={summary.game.players} />
              </Card>
            ))
          )}
        </div>
        <h3 className="mb-3 mt-6 font-display text-xl text-forest-900">All rounds overview</h3>
        <AllRoundsMatrix game={summary.game} />
      </section>

      <section className="mt-8">
        <h2 className="mb-3 font-display text-2xl text-forest-900">Overall player standings</h2>
        <Card className="overflow-x-auto p-0">
          <table className="min-w-full text-sm">
            <thead className="bg-forest-900 text-cream-50">
              <tr>
                <th className="px-4 py-3 text-left">Rank</th>
                <th className="px-4 py-3 text-left">Player</th>
                <th className="px-4 py-3 text-right">Total won</th>
                <th className="px-4 py-3 text-right">Total lost</th>
                <th className="px-4 py-3 text-right">Net points</th>
              </tr>
            </thead>
            <tbody>
              {summary.leaderboard.standings.map((player) => (
                <tr key={player.playerId} className="border-t border-cream-200">
                  <td className="px-4 py-3">{player.rank}</td>
                  <td className="px-4 py-3 font-medium">{player.playerName}</td>
                  <td className="px-4 py-3 text-right">{player.pointsWon.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 text-right">{player.pointsLost.toLocaleString("en-IN")}</td>
                  <td className={`px-4 py-3 text-right ${player.netPoints > 0 ? "score-pos" : player.netPoints < 0 ? "score-neg" : ""}`}>
                    {signedPoints(player.netPoints)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 font-display text-2xl text-forest-900">Financial settlement</h2>
        <p className="mb-3 text-sm text-slate-600">
          {rate ? `Configured rate: 1 point = ₹${rate}` : "No conversion rate configured. Amounts below are in points, not rupees."}
        </p>
        <Card className="overflow-x-auto p-0">
          <table className="min-w-full text-sm">
            <thead className="bg-forest-900 text-cream-50">
              <tr>
                <th className="px-4 py-3 text-left">Player</th>
                <th className="px-4 py-3 text-right">Net balance</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {summary.settlement.balances.map((player) => {
                const amount = player.moneyBalance ?? 0;
                return (
                  <tr key={player.playerId} className="border-t border-cream-200">
                    <td className="px-4 py-3">{player.playerName}</td>
                    <td className="px-4 py-3 text-right">{moneyOrPoints(amount, unit)}</td>
                    <td className="px-4 py-3">{amount > 0 ? "Receives" : amount < 0 ? "Pays" : "Settled"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 font-display text-2xl text-forest-900">Settlement instructions</h2>
        <p className="mb-3 text-sm text-slate-600">{summary.settlement.disclaimer}</p>
        <Card className="overflow-x-auto p-0">
          <table className="min-w-full text-sm">
            <thead className="bg-forest-900 text-cream-50">
              <tr>
                <th className="px-4 py-3 text-left">Payer</th>
                <th className="px-4 py-3 text-left">Receiver</th>
                <th className="px-4 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {summary.settlement.transfers.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={3}>
                    No transfers required.
                  </td>
                </tr>
              ) : (
                summary.settlement.transfers.map((transfer, index) => (
                  <tr key={`${transfer.payerPlayerId}-${transfer.receiverPlayerId}-${index}`} className="border-t border-cream-200">
                    <td className="px-4 py-3">{transfer.payerName}</td>
                    <td className="px-4 py-3">{transfer.receiverName}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(transfer.amount, transfer.unit)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
        <p className="mt-3 text-sm text-slate-600">
          Totals reconcile: {summary.validation.reconciles ? "Yes" : "No"} · Settlement{" "}
          {moneyOrPoints(summary.validation.totalSettlementAmount, unit)}
        </p>
      </section>
    </AppShell>
  );
}
