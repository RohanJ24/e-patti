"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { Game, Round } from "@e-patti/shared";
import { AppShell } from "@/components/AppShell";
import { RoundForm } from "@/components/RoundForm";
import { Button, Card, Spinner, useToast } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { formatDate, signedPoints } from "@/lib/format";

export default function RoundDetailPage() {
  const params = useParams<{ id: string; roundId: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const [game, setGame] = useState<Game | null>(null);
  const [round, setRound] = useState<Round | null>(null);
  const [editing, setEditing] = useState(search.get("edit") === "1");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .getGame(params.id)
      .then((result) => {
        setGame(result.game);
        setRound(result.game.rounds.find((item) => item.id === params.roundId) ?? null);
      })
      .catch((error) => toast.push(error instanceof ApiError ? error.message : "Unable to load round", "error"));
  }, [params.id, params.roundId, toast]);

  async function save(payload: { winnerId: string; scores: Array<{ playerId: string; lossPoints: number }> }) {
    setSaving(true);
    try {
      const result = await api.updateRound(params.id, params.roundId, payload);
      setRound(result.round);
      setEditing(false);
      toast.push("Round updated and totals recalculated");
      router.replace(`/games/${params.id}`);
    } catch (error) {
      toast.push(error instanceof ApiError ? error.message : "Unable to update round", "error");
    } finally {
      setSaving(false);
    }
  }

  if (!game || !round) {
    return (
      <AppShell>
        <Spinner label="Loading round…" />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <h1 className="font-display text-4xl text-forest-900">Round {round.roundNumber}</h1>
      <p className="text-slate-600">
        Winner: {round.winnerName} · {formatDate(round.createdAt)}
      </p>
      {editing && game.status === "ACTIVE" ? (
        <Card className="mt-6 max-w-3xl">
          <RoundForm game={game} initial={round} submitting={saving} onSubmit={save} />
        </Card>
      ) : (
        <Card className="mt-6 max-w-3xl overflow-x-auto p-0">
          <table className="min-w-full text-sm">
            <thead className="bg-forest-900 text-cream-50">
              <tr>
                <th className="px-4 py-3 text-left">Player</th>
                <th className="px-4 py-3 text-left">Result</th>
                <th className="px-4 py-3 text-right">Points</th>
              </tr>
            </thead>
            <tbody>
              {round.playerScores.map((score) => (
                <tr key={score.playerId} className="border-t border-cream-200">
                  <td className="px-4 py-3">{score.playerName}</td>
                  <td className="px-4 py-3">{score.playerId === round.winnerId ? "Winner" : "Packed"}</td>
                  <td className={`px-4 py-3 text-right ${score.points > 0 ? "score-pos" : score.points < 0 ? "score-neg" : ""}`}>
                    {signedPoints(score.points)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      {game.status === "ACTIVE" && !editing ? (
        <div className="mt-4">
          <Button onClick={() => setEditing(true)}>Edit round</Button>
        </div>
      ) : null}
    </AppShell>
  );
}
