"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MAX_ROUNDS, type Game } from "@e-patti/shared";
import { AppShell } from "@/components/AppShell";
import { Scoreboard } from "@/components/Scoreboard";
import { Button, Card, Modal, Spinner, StatusBadge, useToast } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { formatDate, signedPoints } from "@/lib/format";

export default function GamePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const [game, setGame] = useState<Game | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [roundToDelete, setRoundToDelete] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const result = await api.getGame(params.id);
      setGame(result.game);
    } catch (error) {
      toast.push(error instanceof ApiError ? error.message : "Unable to load game", "error");
    }
  }

  useEffect(() => {
    void load();
  }, [params.id]);

  async function complete() {
    setBusy(true);
    try {
      const result = await api.completeGame(params.id);
      setGame(result.game);
      setCompleteOpen(false);
      router.push(`/games/${params.id}/summary`);
    } catch (error) {
      toast.push(error instanceof ApiError ? error.message : "Unable to complete the game", "error");
    } finally {
      setBusy(false);
    }
  }

  async function reopen() {
    setBusy(true);
    try {
      const result = await api.reopenGame(params.id);
      setGame(result.game);
      toast.push("Game reopened for corrections");
    } catch (error) {
      toast.push(error instanceof ApiError ? error.message : "Unable to reopen", "error");
    } finally {
      setBusy(false);
    }
  }

  async function exportPdf() {
    setBusy(true);
    try {
      const blob = await api.downloadPdf(params.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `E-Patti-Room-${game?.roomId ?? params.id}-Summary.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.push(error instanceof ApiError ? error.message : "Unable to export PDF", "error");
    } finally {
      setBusy(false);
    }
  }

  async function removeGame() {
    setBusy(true);
    try {
      await api.deleteGame(params.id);
      toast.push("Game deleted");
      router.replace("/dashboard");
    } catch (error) {
      toast.push(error instanceof ApiError ? error.message : "Unable to delete", "error");
    } finally {
      setBusy(false);
    }
  }

  async function removeRound() {
    if (!roundToDelete) return;
    setBusy(true);
    try {
      await api.deleteRound(params.id, roundToDelete);
      setRoundToDelete(null);
      await load();
      toast.push("Round deleted and scores recalculated");
    } catch (error) {
      toast.push(error instanceof ApiError ? error.message : "Unable to delete round", "error");
    } finally {
      setBusy(false);
    }
  }

  if (!game) {
    return (
      <AppShell>
        <Spinner label="Loading game…" />
      </AppShell>
    );
  }

  const locked = game.status === "COMPLETED";
  const canAddRound = !locked && game.rounds.length < MAX_ROUNDS;

  return (
    <AppShell>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-slate-500">{game.roomId}</p>
          <h1 className="font-display text-4xl text-forest-900">{game.name || "Untitled game"}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <StatusBadge status={game.status} />
            <span>{game.players.length} players</span>
            <span>
              Round {game.rounds.length} of {MAX_ROUNDS}
            </span>
            <span>Updated {formatDate(game.updatedAt)}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={exportPdf} disabled={busy} variant="secondary">
            Export summary
          </Button>
          {canAddRound ? (
            <Link href={`/games/${game.id}/rounds/new`}>
              <Button>Add new round</Button>
            </Link>
          ) : null}
          {!locked ? (
            <Button onClick={() => setCompleteOpen(true)} disabled={busy}>
              Complete game
            </Button>
          ) : (
            <Button variant="ghost" onClick={reopen} disabled={busy}>
              Reopen for corrections
            </Button>
          )}
          <Link href={`/games/${game.id}/summary`}>
            <Button variant="ghost">Final summary</Button>
          </Link>
          <Button variant="danger" onClick={() => setDeleteOpen(true)}>
            Delete room
          </Button>
        </div>
      </div>

      <div className="mt-8 space-y-8">
        <section>
          <h2 className="mb-3 font-display text-2xl text-forest-900">Player scoreboard</h2>
          <Scoreboard game={game} />
        </section>
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-2xl text-forest-900">Round history</h2>
            <Link href={`/games/${game.id}/history`} className="text-sm font-semibold text-forest-800">
              Open full history
            </Link>
          </div>
          <Card className="overflow-x-auto p-0">
            <table className="min-w-full text-sm">
              <thead className="bg-forest-900 text-cream-50">
                <tr>
                  <th className="px-4 py-3 text-left">Round</th>
                  <th className="px-4 py-3 text-left">Winner</th>
                  <th className="px-4 py-3 text-left">Packed points</th>
                  <th className="px-4 py-3 text-right">Won</th>
                  <th className="px-4 py-3 text-left">When</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {game.rounds.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-slate-500" colSpan={6}>
                      No rounds yet.
                    </td>
                  </tr>
                ) : (
                  game.rounds.map((round) => {
                    const winner = round.playerScores.find((score) => score.playerId === round.winnerId);
                    const losses = round.playerScores
                      .filter((score) => score.points < 0)
                      .map((score) => `${score.playerName}: ${signedPoints(score.points)}`)
                      .join(", ");
                    return (
                      <tr key={round.id} className="border-t border-cream-200">
                        <td className="px-4 py-3">{round.roundNumber}</td>
                        <td className="px-4 py-3 font-semibold text-forest-800">{round.winnerName}</td>
                        <td className="px-4 py-3">{losses || "—"}</td>
                        <td className="px-4 py-3 text-right score-pos">{signedPoints(winner?.points ?? 0)}</td>
                        <td className="px-4 py-3">{formatDate(round.createdAt)}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <Link href={`/games/${game.id}/rounds/${round.id}`} className="text-sm font-semibold text-forest-800">
                              View
                            </Link>
                            {!locked ? (
                              <>
                                <Link href={`/games/${game.id}/rounds/${round.id}?edit=1`} className="text-sm font-semibold">
                                  Edit
                                </Link>
                                <button className="text-sm font-semibold text-rose-700" onClick={() => setRoundToDelete(round.id)}>
                                  Delete
                                </button>
                              </>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </Card>
        </section>
      </div>

      <Modal open={completeOpen} title="Complete this game?" onClose={() => setCompleteOpen(false)}>
        <p className="text-sm text-slate-600">
          This finishes scoring for {game.name || game.roomId}. You can reopen later for corrections.
        </p>
        <p className="mt-2 text-sm text-slate-600">
          After you confirm, you will see a short summary and can download the PDF.
        </p>
        <div className="mt-5 flex gap-3">
          <Button onClick={complete} disabled={busy}>
            {busy ? "Completing…" : "Confirm and complete"}
          </Button>
          <Button variant="ghost" onClick={() => setCompleteOpen(false)} disabled={busy}>
            Cancel
          </Button>
        </div>
      </Modal>
      <Modal open={deleteOpen} title="Delete this game room?" onClose={() => setDeleteOpen(false)}>
        <p className="text-sm text-slate-600">This permanently removes the room, rounds, and calculated scores.</p>
        <div className="mt-5 flex gap-3">
          <Button variant="danger" onClick={removeGame} disabled={busy}>
            Delete room
          </Button>
          <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
            Cancel
          </Button>
        </div>
      </Modal>
      <Modal open={Boolean(roundToDelete)} title="Delete this round?" onClose={() => setRoundToDelete(null)}>
        <p className="text-sm text-slate-600">Scores and settlements will be recalculated from the remaining rounds.</p>
        <div className="mt-5 flex gap-3">
          <Button variant="danger" onClick={removeRound} disabled={busy}>
            Delete round
          </Button>
          <Button variant="ghost" onClick={() => setRoundToDelete(null)}>
            Cancel
          </Button>
        </div>
      </Modal>
    </AppShell>
  );
}
