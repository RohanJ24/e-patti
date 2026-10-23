"use client";

import { useMemo, useState } from "react";
import {
  calculateRoundScores,
  inferWinnerId,
  packedRoundInput,
  type Game,
  type Round
} from "@e-patti/shared";
import { signedPoints } from "@/lib/format";
import { Button, Label } from "./ui";

function initialPacked(game: Game, initial?: Round): Record<string, string | null> {
  const next: Record<string, string | null> = {};
  for (const player of game.players) {
    if (!initial || player.id === initial.winnerId) {
      next[player.id] = null;
      continue;
    }
    const existing = initial.playerScores.find((score) => score.playerId === player.id);
    next[player.id] = existing && existing.points < 0 ? String(Math.abs(existing.points)) : "0";
  }
  return next;
}

function parseLoss(value: string | null): number | null {
  if (value === null) return null;
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const amount = Number(trimmed);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return amount;
}

export function RoundForm({
  game,
  initial,
  submitting,
  onSubmit
}: {
  game: Game;
  initial?: Round;
  submitting?: boolean;
  onSubmit: (payload: { winnerId: string; scores: Array<{ playerId: string; lossPoints: number }> }) => void;
}) {
  const [packed, setPacked] = useState<Record<string, string | null>>(() => initialPacked(game, initial));

  const packedIds = game.players.filter((player) => packed[player.id] !== null).map((player) => player.id);
  const winnerId = inferWinnerId(
    game.players.map((player) => player.id),
    packedIds
  );
  const remainingCount = game.players.length - packedIds.length;

  const packedLosses = useMemo(() => {
    const next: Record<string, number> = {};
    for (const player of game.players) {
      const amount = parseLoss(packed[player.id] ?? null);
      if (packed[player.id] !== null && amount === null) return null;
      if (amount !== null && player.id !== winnerId) next[player.id] = amount;
    }
    return next;
  }, [game.players, packed, winnerId]);

  const preview = useMemo(() => {
    if (!winnerId || !packedLosses) return null;
    const input = packedRoundInput(
      game.players.map((player) => player.id),
      packedLosses
    );
    if (!input) return null;
    try {
      return calculateRoundScores({ ...input, rule: game.scoringConfig.rule });
    } catch {
      return null;
    }
  }, [game, packedLosses, winnerId]);

  function markPacked(playerId: string) {
    if (remainingCount <= 1) return;
    setPacked((current) => ({ ...current, [playerId]: current[playerId] ?? "" }));
  }

  function stillPlaying(playerId: string) {
    setPacked((current) => ({ ...current, [playerId]: null }));
  }

  function submit() {
    if (!winnerId || !packedLosses) return;
    const input = packedRoundInput(
      game.players.map((player) => player.id),
      packedLosses
    );
    if (!input) return;
    onSubmit({ winnerId: input.winnerId, scores: input.scores });
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-600">
        Enter points when a player packs. Other players can keep playing. The last player still in the round is the
        winner automatically — then submit the round.
      </p>

      <div className="space-y-3">
        <Label>Players this round</Label>
        {game.players.map((player) => {
          const isPacked = packed[player.id] !== null;
          const isWinner = winnerId === player.id;
          return (
            <div
              key={player.id}
              className={`rounded-xl border px-4 py-3 ${
                isWinner
                  ? "border-gold-500 bg-gold-300/40"
                  : isPacked
                    ? "border-cream-200 bg-white"
                    : "border-dashed border-cream-200 bg-cream-50"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-forest-900">{player.name}</span>
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {isWinner ? "Winner" : isPacked ? "Packed" : "Playing"}
                </span>
              </div>
              {isWinner ? (
                <p className="mt-2 text-sm text-slate-600">Last remaining player. Wins the combined packed points.</p>
              ) : isPacked ? (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <input
                    type="number"
                    min={0}
                    step="1"
                    inputMode="numeric"
                    aria-label={`${player.name} packed points`}
                    placeholder="Packed points"
                    className="w-40 rounded-lg border border-cream-200 px-3 py-2"
                    value={packed[player.id] ?? ""}
                    onChange={(event) =>
                      setPacked((current) => ({ ...current, [player.id]: event.target.value }))
                    }
                  />
                  <button type="button" className="text-sm font-semibold text-forest-800" onClick={() => stillPlaying(player.id)}>
                    Still playing
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="mt-3 rounded-lg border border-forest-900 px-3 py-1.5 text-sm font-semibold text-forest-900 disabled:opacity-40"
                  onClick={() => markPacked(player.id)}
                  disabled={remainingCount <= 1}
                >
                  Packed
                </button>
              )}
            </div>
          );
        })}
      </div>

      {preview ? (
        <div className="table-wrap">
          <table className="min-w-full text-sm">
            <thead className="bg-forest-900 text-cream-50">
              <tr>
                <th className="px-4 py-2 text-left">Player</th>
                <th className="px-4 py-2 text-left">Result</th>
                <th className="px-4 py-2 text-right">Points</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((score) => {
                const player = game.players.find((item) => item.id === score.playerId);
                return (
                  <tr key={score.playerId} className="border-t border-cream-200">
                    <td className="px-4 py-2">{player?.name}</td>
                    <td className="px-4 py-2">{score.isWinner ? "Winner" : "Packed"}</td>
                    <td className={`px-4 py-2 text-right ${score.points > 0 ? "score-pos" : score.points < 0 ? "score-neg" : ""}`}>
                      {signedPoints(score.points)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-slate-500">
          {remainingCount > 1
            ? `${remainingCount} players still playing. Pack players until one remains.`
            : "Enter packed points for every folded player to preview this round."}
        </p>
      )}

      <Button onClick={submit} disabled={!preview || submitting}>
        {submitting ? "Saving…" : "Submit round"}
      </Button>
    </div>
  );
}
