"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { GameListItem, UserPublic } from "@e-patti/shared";
import { AppShell } from "@/components/AppShell";
import { GameCard } from "@/components/GameCard";
import { Button, Card, Spinner, useToast } from "@/components/ui";
import { ApiError, api } from "@/lib/api";

export default function DashboardPage() {
  const toast = useToast();
  const [user, setUser] = useState<UserPublic | null>(null);
  const [games, setGames] = useState<GameListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.me(), api.listGames()])
      .then(([me, list]) => {
        setUser(me.user);
        setGames(list.items);
      })
      .catch((error) => toast.push(error instanceof ApiError ? error.message : "Unable to load dashboard", "error"))
      .finally(() => setLoading(false));
  }, [toast]);

  const report = useMemo(() => {
    const active = games.filter((game) => game.status === "ACTIVE");
    const completed = games.filter((game) => game.status === "COMPLETED");
    const rounds = games.reduce((sum, game) => sum + game.roundCount, 0);
    const recent = [...games].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 3);
    return { total: games.length, active: active.length, completed: completed.length, rounds, recent };
  }, [games]);

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-gold-500">Dashboard</p>
          <h1 className="font-display text-4xl text-forest-900">{user ? `Welcome, ${user.fullName}` : "Welcome"}</h1>
          <p className="mt-2 text-slate-600">Start a new room or continue from My games.</p>
        </div>
        <Link href="/games/new">
          <Button>New game</Button>
        </Link>
      </div>

      {loading ? (
        <div className="mt-8">
          <Spinner label="Loading report…" />
        </div>
      ) : (
        <>
          <section className="mt-8">
            <h2 className="mb-3 font-display text-2xl text-forest-900">Games report</h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ["Total games", report.total],
                ["Active", report.active],
                ["Completed", report.completed],
                ["Rounds played", report.rounds]
              ].map(([label, value]) => (
                <Card key={String(label)}>
                  <p className="text-3xl font-bold text-forest-900">{value}</p>
                  <p className="mt-1 text-sm text-slate-600">{label}</p>
                </Card>
              ))}
            </div>
          </section>
          <section className="mt-10">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-2xl text-forest-900">Recently updated</h2>
              <Link href="/games" className="text-sm font-semibold text-forest-800">
                Open My games
              </Link>
            </div>
            {report.recent.length === 0 ? (
              <p className="text-slate-600">No games yet. Create one to start scoring.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {report.recent.map((game) => (
                  <GameCard key={game.id} game={game} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </AppShell>
  );
}
