import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { formatCurrency, formatSignedPoints, type GameSummary } from "@e-patti/shared";
import { api, API_URL, getToken } from "../../../lib/api";
import { colors } from "../../../lib/theme";

export default function SummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [summary, setSummary] = useState<GameSummary | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.summary(String(id)).then(setSummary);
  }, [id]);

  async function sharePdf() {
    if (!summary) return;
    setBusy(true);
    try {
      const token = await getToken();
      const filename = `E-Patti-Room-${summary.game.roomId}-Summary.pdf`;
      const target = `${FileSystem.cacheDirectory}${filename}`;
      const result = await FileSystem.downloadAsync(`${API_URL}/games/${summary.game.id}/export/pdf`, target, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      });
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert("PDF saved", result.uri);
        return;
      }
      await Sharing.shareAsync(result.uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf" });
    } catch (error) {
      Alert.alert("PDF export failed", error instanceof Error ? error.message : "Try again");
    } finally {
      setBusy(false);
    }
  }

  if (!summary) return null;
  const unit = summary.settlement.unit;

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.title}>Final summary</Text>
      <Pressable style={styles.button} onPress={sharePdf} disabled={busy}>
        <Text style={styles.buttonText}>{busy ? "Preparing PDF…" : "Download / share PDF"}</Text>
      </Pressable>
      <Text style={styles.section}>Round-by-round points</Text>
      {summary.game.rounds.length === 0 ? (
        <Text style={styles.meta}>No rounds recorded yet.</Text>
      ) : (
        summary.game.rounds.map((round) => (
          <View key={round.id} style={styles.card}>
            <Text style={styles.name}>
              Round {round.roundNumber} · Winner {round.winnerName}
            </Text>
            {summary.game.players.map((player) => {
              const points = round.playerScores.find((score) => score.playerId === player.id)?.points ?? 0;
              return (
                <Text key={player.id} style={styles.line}>
                  {player.name}: {player.id === round.winnerId ? "Winner" : "Packed"} {formatSignedPoints(points)}
                </Text>
              );
            })}
          </View>
        ))
      )}
      <Text style={styles.section}>Standings</Text>
      {summary.leaderboard.standings.map((player) => (
        <View key={player.playerId} style={styles.card}>
          <Text style={styles.name}>
            #{player.rank} {player.playerName}
          </Text>
          <Text>
            Won {player.pointsWon} · Lost {player.pointsLost} · Net {formatSignedPoints(player.netPoints)}
          </Text>
        </View>
      ))}
      <Text style={styles.section}>Settlement</Text>
      {summary.settlement.transfers.map((transfer, index) => (
        <Text key={index} style={styles.line}>
          {transfer.payerName} → {transfer.receiverName}: {formatCurrency(transfer.amount, unit)}
        </Text>
      ))}
      <Text style={styles.meta}>{summary.settlement.disclaimer}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 16, backgroundColor: colors.cream },
  title: { fontSize: 28, fontWeight: "800", color: colors.forest, marginBottom: 12 },
  button: { backgroundColor: colors.gold, borderRadius: 12, padding: 14, alignItems: "center", marginBottom: 16 },
  buttonText: { color: colors.forestDark, fontWeight: "800" },
  card: { backgroundColor: colors.white, borderRadius: 12, padding: 12, marginBottom: 8 },
  name: { fontWeight: "700", color: colors.ink },
  section: { marginTop: 16, fontSize: 18, fontWeight: "700", color: colors.forest },
  line: { marginTop: 8, color: colors.ink },
  meta: { marginTop: 16, color: colors.muted, fontSize: 12 }
});
