"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { MAX_PLAYERS, MIN_PLAYERS } from "@e-patti/shared";
import { AppShell } from "@/components/AppShell";
import { Button, Card, Input, Label, Modal, useToast } from "@/components/ui";
import { ApiError, api } from "@/lib/api";

export default function NewGamePage() {
  const router = useRouter();
  const toast = useToast();
  const [roomId, setRoomId] = useState("");
  const [name, setName] = useState("");
  const [playerCount, setPlayerCount] = useState(3);
  const [playerNames, setPlayerNames] = useState(["", "", ""]);
  const [rate, setRate] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const players = useMemo(
    () => playerNames.slice(0, playerCount).map((value) => value.trim()),
    [playerNames, playerCount]
  );

  function setCount(count: number) {
    const next = Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, count));
    setPlayerCount(next);
    setPlayerNames((current) => {
      const copy = [...current];
      while (copy.length < next) copy.push("");
      return copy.slice(0, next);
    });
  }

  function validate(): string | null {
    if (players.some((player) => !player)) return "Enter a name for every player";
    const lower = players.map((player) => player.toLowerCase());
    if (new Set(lower).size !== lower.length) return "Player names must be unique";
    return null;
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const error = validate();
    if (error) {
      toast.push(error, "error");
      return;
    }
    setConfirmOpen(true);
  }

  async function create() {
    setSaving(true);
    try {
      const result = await api.createGame({
        roomId: roomId || undefined,
        name,
        pointsToMoneyRate: rate ? Number(rate) : null,
        players: players.map((player) => ({ name: player }))
      });
      toast.push("Game room created");
      router.replace(`/games/${result.game.id}`);
    } catch (error) {
      toast.push(error instanceof ApiError ? error.message : "Unable to create the game", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <h1 className="font-display text-4xl text-forest-900">Create a game room</h1>
      <Card className="mt-6 max-w-2xl">
        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <Label htmlFor="roomId">Room ID (optional)</Label>
            <Input id="roomId" value={roomId} onChange={(e) => setRoomId(e.target.value)} placeholder="Leave blank to auto-generate" />
          </div>
          <div>
            <Label htmlFor="name">Game name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Friday night" />
          </div>
          <div>
            <Label htmlFor="count">Player count (2–8)</Label>
            <Input
              id="count"
              type="number"
              min={MIN_PLAYERS}
              max={MAX_PLAYERS}
              value={playerCount}
              onChange={(e) => setCount(Number(e.target.value))}
            />
          </div>
          {players.map((_, index) => (
            <div key={index}>
              <Label htmlFor={`player-${index}`}>Player {index + 1}</Label>
              <Input
                id={`player-${index}`}
                value={playerNames[index] ?? ""}
                onChange={(e) =>
                  setPlayerNames((current) => {
                    const next = [...current];
                    next[index] = e.target.value;
                    return next;
                  })
                }
              />
            </div>
          ))}
          <div>
            <Label htmlFor="rate">Points-to-money rate (optional)</Label>
            <Input
              id="rate"
              type="number"
              min={0}
              step="0.01"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="e.g. 1 means 1 point = ₹1"
            />
          </div>
          <Button type="submit">Review and create</Button>
        </form>
      </Card>
      <Modal open={confirmOpen} title="Confirm game room" onClose={() => setConfirmOpen(false)}>
        <dl className="space-y-2 text-sm">
          <div>
            <dt className="text-slate-500">Room ID</dt>
            <dd>{roomId || "Auto-generated"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Name</dt>
            <dd>{name || "Untitled game"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Players</dt>
            <dd>{players.join(", ")}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Conversion rate</dt>
            <dd>{rate ? `1 point = ₹${rate}` : "Not configured"}</dd>
          </div>
        </dl>
        <div className="mt-6 flex gap-3">
          <Button onClick={create} disabled={saving}>
            {saving ? "Creating…" : "Create and start"}
          </Button>
          <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
            Back
          </Button>
        </div>
      </Modal>
    </AppShell>
  );
}
