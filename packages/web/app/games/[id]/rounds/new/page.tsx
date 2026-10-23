"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Game } from "@e-patti/shared";
import { AppShell } from "@/components/AppShell";
import { RoundForm } from "@/components/RoundForm";
import { Card, Modal, Spinner, useToast } from "@/components/ui";
import { ApiError, api } from "@/lib/api";

export default function NewRoundPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const [game, setGame] = useState<Game | null>(null);
  const [payload, setPayload] = useState<{ winnerId: string; scores: Array<{ playerId: string; lossPoints: number }> } | null>(
    null
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .getGame(params.id)
      .then((result) => setGame(result.game))
      .catch((error) => toast.push(error instanceof ApiError ? error.message : "Unable to load game", "error"));
  }, [params.id, toast]);

  async function save() {
    if (!payload) return;
    setSaving(true);
    try {
      await api.createRound(params.id, payload);
      toast.push("Round saved");
      router.replace(`/games/${params.id}`);
    } catch (error) {
      toast.push(error instanceof ApiError ? error.message : "Unable to save round", "error");
    } finally {
      setSaving(false);
    }
  }

  if (!game) {
    return (
      <AppShell>
        <Spinner label="Loading players…" />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <h1 className="font-display text-4xl text-forest-900">Add new round</h1>
      <p className="mt-1 text-slate-600">
        {game.name || game.roomId} · Round {(game.rounds.length + 1).toString()} of 50
      </p>
      <Card className="mt-6 max-w-3xl">
        <RoundForm game={game} submitting={saving} onSubmit={(next) => setPayload(next)} />
      </Card>
      <Modal open={Boolean(payload)} title="Save this round?" onClose={() => setPayload(null)}>
        <p className="text-sm text-slate-600">The last remaining player wins the combined packed points of everyone who folded.</p>
        <div className="mt-5 flex gap-3">
          <button className="rounded-lg bg-forest-900 px-4 py-2 text-sm font-semibold text-white" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Confirm"}
          </button>
          <button className="rounded-lg border px-4 py-2 text-sm" onClick={() => setPayload(null)}>
            Back
          </button>
        </div>
      </Modal>
    </AppShell>
  );
}
