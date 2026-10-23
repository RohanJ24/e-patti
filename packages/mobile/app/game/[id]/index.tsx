import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { accumulateScores, formatSignedPoints, rankStandings, type Game } from "@e-patti/shared";
import { api } from "../../../lib/api";
import { colors } from "../../../lib/theme";

export default function GameScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [game, setGame] = useState<Game | null>(null);

  const load = useCallback(async () => {
    const result = await api.getGame(String(id));
    setGame(result.game);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  if (!game) return null;

  const standings = rankStandings(
    accumulateScores(
      game.players.map((player, index) => ({ id: player.id, name: player.name, seatNumber: index + 1 })),
      game.rounds.map((round) => ({ winnerId: round.winnerId, playerScores: round.playerScores }))
    )
  );
  const locked = game.status === "COMPLETED";

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.room}>{game.roomId}</Text>
      <Text style={styles.title}>{game.name || "Untitled game"}</Text>
      <Text style={styles.meta}>
        {game.players.length} players · Round {game.rounds.length} of 50 · {game.status}
      </Text>

      <View style={styles.actions}>
        {!locked && game.rounds.length < 50 ? (
          <Pressable style={styles.button} onPress={() => router.push(`/game/${game.id}/round`)}>
            <Text style={styles.buttonText}>Add new round</Text>
          </Pressable>
        ) : null}
        <Pressable style={styles.ghost} onPress={() => router.push(`/game/${game.id}/summary`)}>
          <Text style={styles.ghostText}>Summary / PDF</Text>
        </Pressable>
        {!locked ? (
          <Pressable
            style={styles.ghost}
            onPress={() =>
              api.completeGame(game.id).then((result) => {
                setGame(result.game);
                router.push(`/game/${game.id}/summary`);
              })
            }
          >
            <Text style={styles.ghostText}>Complete game</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.ghost} onPress={() => api.reopenGame(game.id).then((result) => setGame(result.game))}>
            <Text style={styles.ghostText}>Reopen for corrections</Text>
          </Pressable>
        )}
        <Pressable
          style={styles.danger}
          onPress={() =>
            Alert.alert(
              "Delete this game room?",
              "This permanently removes the room, rounds, and calculated scores.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete room",
                  style: "destructive",
                  onPress: () => {
                    void api
                      .deleteGame(game.id)
                      .then(() => router.replace("/(app)/games"))
                      .catch((error) =>
                        Alert.alert("Unable to delete", error instanceof Error ? error.message : "Try again")
                      );
                  }
                }
              ]
            )
          }
        >
          <Text style={styles.dangerText}>Delete room</Text>
        </Pressable>
      </View>

      <Text style={styles.section}>Scoreboard</Text>
      <ScrollView horizontal>
        <View>
          {standings.map((player) => (
            <View key={player.playerId} style={styles.scoreRow}>
              <Text style={styles.player}>{player.playerName}</Text>
              <Text>W {player.pointsWon}</Text>
              <Text>L {player.pointsLost}</Text>
              <Text style={{ color: player.netPoints >= 0 ? colors.success : colors.danger, fontWeight: "700" }}>
                {formatSignedPoints(player.netPoints)}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <Text style={styles.section}>Rounds</Text>
      {game.rounds.map((round) => (
        <View key={round.id} style={styles.round}>
          <Text style={styles.roundTitle}>
            Round {round.roundNumber} · {round.winnerName}
          </Text>
          <Text style={styles.meta}>
            {round.playerScores.map((score) => `${score.playerName} ${formatSignedPoints(score.points)}`).join("  ")}
          </Text>
          {!locked ? (
            <View style={styles.roundActions}>
              <Pressable onPress={() => router.push(`/game/${game.id}/round?roundId=${round.id}`)}>
                <Text style={styles.edit}>Edit</Text>
              </Pressable>
              <Pressable
                onPress={() =>
                  Alert.alert("Delete round?", "Scores will be recalculated.", [
                    { text: "Cancel" },
                    {
                      text: "Delete",
                      style: "destructive",
                      onPress: () => api.deleteRound(game.id, round.id).then(load)
                    }
                  ])
                }
              >
                <Text style={styles.delete}>Delete</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 16, backgroundColor: colors.cream },
  room: { color: colors.muted, letterSpacing: 1 },
  title: { fontSize: 28, fontWeight: "800", color: colors.forest },
  meta: { color: colors.muted, marginTop: 4 },
  actions: { marginVertical: 16, gap: 8 },
  button: { backgroundColor: colors.forest, borderRadius: 12, padding: 14, alignItems: "center" },
  buttonText: { color: colors.cream, fontWeight: "700" },
  ghost: { borderWidth: 1, borderColor: colors.forest, borderRadius: 12, padding: 14, alignItems: "center" },
  ghostText: { color: colors.forest, fontWeight: "700" },
  danger: { borderWidth: 1, borderColor: colors.danger, borderRadius: 12, padding: 14, alignItems: "center" },
  dangerText: { color: colors.danger, fontWeight: "700" },
  section: { fontSize: 18, fontWeight: "700", color: colors.forest, marginTop: 12, marginBottom: 8 },
  scoreRow: { flexDirection: "row", gap: 16, backgroundColor: colors.white, padding: 12, borderRadius: 12, marginBottom: 8, minWidth: 360 },
  player: { width: 100, fontWeight: "700" },
  round: { backgroundColor: colors.white, borderRadius: 12, padding: 12, marginBottom: 8 },
  roundTitle: { fontWeight: "700", color: colors.ink },
  roundActions: { flexDirection: "row", gap: 16, marginTop: 8 },
  edit: { color: colors.forest, fontWeight: "700" },
  delete: { color: colors.danger, fontWeight: "700" }
});
