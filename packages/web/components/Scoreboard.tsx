"use client";

import type { Game } from "@e-patti/shared";
import { accumulateScores, rankStandings } from "@e-patti/shared";
import { signedPoints } from "@/lib/format";

export function Scoreboard({ game }: { game: Game }) {
  const standings = rankStandings(
    accumulateScores(
      game.players.map((player, index) => ({ id: player.id, name: player.name, seatNumber: index + 1 })),
      game.rounds.map((round) => ({ winnerId: round.winnerId, playerScores: round.playerScores }))
    )
  );

  return (
    <div className="table-wrap">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-forest-900 text-cream-50">
          <tr>
            <th className="px-4 py-3 font-semibold">Player</th>
            <th className="px-4 py-3 text-right font-semibold">Total won</th>
            <th className="px-4 py-3 text-right font-semibold">Total lost</th>
            <th className="px-4 py-3 text-right font-semibold">Net points</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((player) => (
            <tr key={player.playerId} className="border-t border-cream-200 even:bg-cream-50">
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
    </div>
  );
}
