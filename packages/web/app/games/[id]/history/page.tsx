"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { Game } from "@e-patti/shared";
import { AppShell } from "@/components/AppShell";
import { Card, Input, Spinner, useToast } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { formatDate, signedPoints } from "@/lib/format";

export default function HistoryPage() {
  const params = useParams<{ id: string }>();
  const toast = useToast();
  const [game, setGame] = useState<Game | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    api
      .getGame(params.id)
      .then((result) => setGame(result.game))
      .catch((error) => toast.push(error instanceof ApiError ? error.message : "Unable to load history", "error"));
  }, [params.id, toast]);

  const rounds = useMemo(() => {
    if (!game) return [];
    const needle = query.trim().toLowerCase();
    if (!needle) return game.rounds;
    return game.rounds.filter((round) =>
      `${round.roundNumber} ${round.winnerName} ${round.playerScores.map((score) => score.playerName).join(" ")}`
        .toLowerCase()
        .includes(needle)
    );
  }, [game, query]);

  if (!game) {
    return (
      <AppShell>
        <Spinner label="Loading history…" />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <h1 className="font-display text-4xl text-forest-900">Round history</h1>
      <p className="text-slate-600">{game.name || game.roomId}</p>
      <div className="mt-4 max-w-md">
        <Input placeholder="Search winner or round number" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <Card className="mt-6 overflow-x-auto p-0">
        <table className="min-w-full text-sm">
          <thead className="bg-forest-900 text-cream-50">
            <tr>
              <th className="px-4 py-3 text-left">Round</th>
              <th className="px-4 py-3 text-left">Winner</th>
              <th className="px-4 py-3 text-left">Player-wise losses</th>
              <th className="px-4 py-3 text-right">Points won</th>
              <th className="px-4 py-3 text-right">Points lost</th>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rounds.map((round) => {
              const won = round.playerScores.filter((score) => score.points > 0).reduce((sum, score) => sum + score.points, 0);
              const lost = round.playerScores
                .filter((score) => score.points < 0)
                .reduce((sum, score) => sum + Math.abs(score.points), 0);
              return (
                <tr key={round.id} className="border-t border-cream-200">
                  <td className="px-4 py-3">{round.roundNumber}</td>
                  <td className="px-4 py-3 font-semibold">{round.winnerName}</td>
                  <td className="px-4 py-3">
                    {round.playerScores
                      .filter((score) => score.points < 0)
                      .map((score) => `${score.playerName} ${signedPoints(score.points)}`)
                      .join(" · ")}
                  </td>
                  <td className="px-4 py-3 text-right score-pos">{signedPoints(won)}</td>
                  <td className="px-4 py-3 text-right score-neg">-{lost.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3">{formatDate(round.createdAt)}</td>
                  <td className="px-4 py-3">
                    <Link href={`/games/${game.id}/rounds/${round.id}`} className="font-semibold text-forest-800">
                      Open
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </AppShell>
  );
}
