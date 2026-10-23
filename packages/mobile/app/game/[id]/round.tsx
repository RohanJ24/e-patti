import { router, useFocusEffect, useLocalSearchParams, useNavigation } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import {
  calculateRoundScores,
  formatSignedPoints,
  inferWinnerId,
  packedRoundInput,
  type Game,
  type Round
} from "@e-patti/shared";
import { api } from "../../../lib/api";
import { colors } from "../../../lib/theme";

function parseLoss(value: string | null): number | null {
  if (value === null) return null;
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const amount = Number(trimmed);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return amount;
}

function packedFromRound(game: Game, initial?: Round): Record<string, string | null> {
  const next: Record<string, string | null> = {};
  for (const player of game.players) {
    if (!initial || player.id === initial.winnerId) {
      next[player.id] = null;
      continue;
    }
    const existing = initial.playerScores.find((score) => score.playerId === player.id);
    next[player.id] = existing && existing.points < 0 ? String(Math.abs(existing.points)) : "0";
  }
  return next;
}

export default function RoundScreen() {
  const { id, roundId } = useLocalSearchParams<{ id: string; roundId?: string }>();
  const navigation = useNavigation();
  const editingId = Array.isArray(roundId) ? roundId[0] : roundId;
  const [game, setGame] = useState<Game | null>(null);
  const [packed, setPacked] = useState<Record<string, string | null>>({});
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      navigation.setOptions({ title: editingId ? "Edit round" : "Add round" });
      if (!editingId) setPacked({});
      void api.getGame(String(id)).then((result) => {
        if (cancelled) return;
        setGame(result.game);
        const existing = editingId ? result.game.rounds.find((item) => item.id === editingId) : undefined;
        setPacked(packedFromRound(result.game, existing));
      });
      return () => {
        cancelled = true;
      };
    }, [editingId, id, navigation])
  );

  const packedIds = game
    ? game.players.filter((player) => typeof packed[player.id] === "string").map((player) => player.id)
    : [];
  const winnerId = game
    ? inferWinnerId(
        game.players.map((player) => player.id),
        packedIds
      )
    : null;
  const remainingCount = game ? game.players.length - packedIds.length : 0;

  const packedLosses = useMemo(() => {
    if (!game) return null;
    const next: Record<string, number> = {};
    for (const player of game.players) {
      const amount = parseLoss(typeof packed[player.id] === "string" ? packed[player.id] : null);
      if (typeof packed[player.id] === "string" && amount === null) return null;
      if (amount !== null && player.id !== winnerId) next[player.id] = amount;
    }
    return next;
  }, [game, packed, winnerId]);

  const preview = useMemo(() => {
    if (!game || !winnerId || !packedLosses) return null;
    const input = packedRoundInput(
      game.players.map((player) => player.id),
      packedLosses
    );
    if (!input) return null;
    try {
      return calculateRoundScores({ ...input, rule: game.scoringConfig.rule });
    } catch {
      return null;
    }
  }, [game, packedLosses, winnerId]);

  if (!game) return null;

  function markPacked(playerId: string) {
    if (remainingCount <= 1) return;
    setPacked((current) => ({ ...current, [playerId]: current[playerId] ?? "" }));
  }

  async function save() {
    if (!preview || !winnerId || !packedLosses) return;
    const input = packedRoundInput(
      game.players.map((player) => player.id),
      packedLosses
    );
    if (!input) return;
    Alert.alert(editingId ? "Save this round?" : "Submit this round?", "The last remaining player wins the combined packed points.", [
      { text: "Back" },
      {
        text: editingId ? "Save" : "Submit",
        onPress: async () => {
          setSaving(true);
          try {
            if (editingId) {
              await api.updateRound(game.id, editingId, { winnerId: input.winnerId, scores: input.scores });
            } else {
              await api.createRound(game.id, { winnerId: input.winnerId, scores: input.scores });
            }
            setPacked(packedFromRound(game));
            router.replace(`/game/${game.id}`);
          } catch (error) {
            Alert.alert("Could not save", error instanceof Error ? error.message : "Try again");
          } finally {
            setSaving(false);
          }
        }
      }
    ]);
  }

  const existing = editingId ? game.rounds.find((item) => item.id === editingId) : undefined;

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>
        {existing ? `Edit round ${existing.roundNumber}` : `Add round ${game.rounds.length + 1}`}
      </Text>
      <Text style={styles.help}>
        Enter points when a player packs. The last player still in the round is the winner automatically.
      </Text>
      {game.players.map((player) => {
        const isPacked = typeof packed[player.id] === "string";
        const isWinner = winnerId === player.id;
        return (
          <View key={player.id} style={[styles.card, isWinner && styles.cardWinner]}>
            <View style={styles.cardHead}>
              <Text style={styles.player}>{player.name}</Text>
              <Text style={styles.status}>{isWinner ? "Winner" : isPacked ? "Packed" : "Playing"}</Text>
            </View>
            {isWinner ? (
              <Text style={styles.meta}>Last remaining player. Wins the combined packed points.</Text>
            ) : isPacked ? (
              <>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="Packed points"
                  value={packed[player.id] ?? ""}
                  onChangeText={(value) => setPacked((current) => ({ ...current, [player.id]: value }))}
                />
                <Pressable onPress={() => setPacked((current) => ({ ...current, [player.id]: null }))}>
                  <Text style={styles.link}>Still playing</Text>
                </Pressable>
              </>
            ) : (
              <Pressable
                style={[styles.pack, remainingCount <= 1 && styles.packOff]}
                onPress={() => markPacked(player.id)}
                disabled={remainingCount <= 1}
              >
                <Text style={styles.packText}>Packed</Text>
              </Pressable>
            )}
          </View>
        );
      })}
      {preview ? (
        <View style={styles.preview}>
          {preview.map((score) => {
            const player = game.players.find((item) => item.id === score.playerId);
            return (
              <Text key={score.playerId} style={styles.previewLine}>
                {player?.name}: {score.isWinner ? "Winner" : "Packed"} {formatSignedPoints(score.points)}
              </Text>
            );
          })}
        </View>
      ) : (
        <Text style={styles.meta}>
          {remainingCount > 1
            ? `${remainingCount} players still playing. Pack players until one remains.`
            : "Enter packed points for every folded player to preview this round."}
        </Text>
      )}
      <Pressable style={styles.button} onPress={save} disabled={!preview || saving}>
        <Text style={styles.buttonText}>{saving ? "Saving…" : existing ? "Save round" : "Submit round"}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 16, backgroundColor: colors.cream },
  title: { fontSize: 24, fontWeight: "800", color: colors.forest, marginBottom: 8 },
  help: { color: colors.muted, marginBottom: 16 },
  card: { backgroundColor: colors.white, borderRadius: 12, padding: 14, marginBottom: 10 },
  cardWinner: { backgroundColor: "#E8D9A8" },
  cardHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  player: { fontWeight: "700", color: colors.ink, fontSize: 16 },
  status: { color: colors.muted, fontWeight: "700", fontSize: 12, textTransform: "uppercase" },
  meta: { marginTop: 8, color: colors.muted },
  input: { backgroundColor: colors.cream, borderRadius: 12, padding: 12, marginTop: 10 },
  link: { marginTop: 8, color: colors.forest, fontWeight: "700" },
  pack: { marginTop: 10, alignSelf: "flex-start", borderWidth: 1, borderColor: colors.forest, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14 },
  packOff: { opacity: 0.4 },
  packText: { color: colors.forest, fontWeight: "700" },
  preview: { marginTop: 8, backgroundColor: colors.white, borderRadius: 12, padding: 12 },
  previewLine: { marginBottom: 4, color: colors.ink },
  button: { marginTop: 16, backgroundColor: colors.forest, borderRadius: 12, padding: 16, alignItems: "center" },
  buttonText: { color: colors.cream, fontWeight: "700" }
});
