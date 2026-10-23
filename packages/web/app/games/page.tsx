"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { GameListItem } from "@e-patti/shared";
import { AppShell } from "@/components/AppShell";
import { GameCard } from "@/components/GameCard";
import { Button, Input, Spinner, useToast } from "@/components/ui";
import { ApiError, api } from "@/lib/api";

export default function MyGamesPage() {
  const toast = useToast();
  const [games, setGames] = useState<GameListItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  async function load(query?: string) {
    try {
      const list = await api.listGames({ search: query });
      setGames(list.items);
    } catch (error) {
      toast.push(error instanceof ApiError ? error.message : "Unable to load games", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const active = useMemo(() => games.filter((game) => game.status === "ACTIVE"), [games]);
  const completed = useMemo(() => games.filter((game) => game.status === "COMPLETED"), [games]);

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-gold-500">My games</p>
          <h1 className="font-display text-4xl text-forest-900">Previous games</h1>
        </div>
        <Link href="/games/new">
          <Button>New game</Button>
        </Link>
      </div>

      <form
        className="mt-6 flex max-w-xl gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void load(search);
        }}
      >
        <Input
          placeholder="Search by room ID or game name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button type="submit" variant="ghost">
          Search
        </Button>
      </form>

      {loading ? (
        <div className="mt-8">
          <Spinner label="Loading games…" />
        </div>
      ) : (
        <div className="mt-8 space-y-10">
          <section>
            <h2 className="mb-3 font-display text-2xl text-forest-900">Active games</h2>
            {active.length === 0 ? (
              <p className="text-slate-600">No active games. Create one to start scoring.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {active.map((game) => (
                  <GameCard key={game.id} game={game} />
                ))}
              </div>
            )}
          </section>
          <section>
            <h2 className="mb-3 font-display text-2xl text-forest-900">Completed games</h2>
            {completed.length === 0 ? (
              <p className="text-slate-600">Completed games will appear here.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {completed.map((game) => (
                  <GameCard key={game.id} game={game} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </AppShell>
  );
}
