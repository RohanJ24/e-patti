import type { Game, Round } from "@e-patti/shared";
import { signedPoints } from "@/lib/format";
import { Card } from "./ui";

export function RoundDetailTable({ round, players }: { round: Round; players: Game["players"] }) {
  return (
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
          {players.map((player) => {
            const score = round.playerScores.find((item) => item.playerId === player.id);
            const points = score?.points ?? 0;
            return (
              <tr key={player.id} className="border-t border-cream-200">
                <td className="px-4 py-2">{player.name}</td>
                <td className="px-4 py-2">{player.id === round.winnerId ? "Winner" : "Packed"}</td>
                <td className={`px-4 py-2 text-right ${points > 0 ? "score-pos" : points < 0 ? "score-neg" : ""}`}>
                  {signedPoints(points)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function AllRoundsMatrix({ game }: { game: Game }) {
  return (
    <Card className="overflow-x-auto p-0">
      <table className="min-w-full text-sm">
        <thead className="bg-forest-900 text-cream-50">
          <tr>
            <th className="px-4 py-3 text-left">Round</th>
            {game.players.map((player) => (
              <th key={player.id} className="px-4 py-3 text-right">
                {player.name}
              </th>
            ))}
            <th className="px-4 py-3 text-left">Winner</th>
          </tr>
        </thead>
        <tbody>
          {game.rounds.length === 0 ? (
            <tr>
              <td className="px-4 py-6 text-slate-500" colSpan={game.players.length + 2}>
                No rounds yet.
              </td>
            </tr>
          ) : (
            game.rounds.map((round) => (
              <tr key={round.id} className="border-t border-cream-200">
                <td className="px-4 py-3">{round.roundNumber}</td>
                {game.players.map((player) => {
                  const points = round.playerScores.find((score) => score.playerId === player.id)?.points ?? 0;
                  return (
                    <td
                      key={player.id}
                      className={`px-4 py-3 text-right ${points > 0 ? "score-pos" : points < 0 ? "score-neg" : ""}`}
                    >
                      {signedPoints(points)}
                    </td>
                  );
                })}
                <td className="px-4 py-3 font-semibold">{round.winnerName}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </Card>
  );
}
