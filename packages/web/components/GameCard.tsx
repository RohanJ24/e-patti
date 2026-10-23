"use client";

import Link from "next/link";
import type { GameListItem } from "@e-patti/shared";
import { formatDate } from "@/lib/format";
import { Card, StatusBadge } from "./ui";

export function GameCard({ game }: { game: GameListItem }) {
  return (
    <Link href={`/games/${game.id}`}>
      <Card className="h-full transition hover:-translate-y-0.5 hover:border-gold-400">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">{game.roomId}</p>
            <h3 className="font-display text-xl text-forest-900">{game.name || "Untitled game"}</h3>
          </div>
          <StatusBadge status={game.status} />
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-600">
          <div>
            <dt className="text-xs uppercase text-slate-400">Players</dt>
            <dd className="font-semibold text-ink">{game.playerCount}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-400">Rounds</dt>
            <dd className="font-semibold text-ink">{game.roundCount} / 50</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-xs uppercase text-slate-400">Last updated</dt>
            <dd>{formatDate(game.updatedAt)}</dd>
          </div>
        </dl>
      </Card>
    </Link>
  );
}
