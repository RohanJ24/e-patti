import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { api } from "../lib/api";
import { KeyboardScreen } from "../lib/keyboard";
import { useHardwareBack } from "../lib/navigation";
import { colors } from "../lib/theme";

export default function CreateGameScreen() {
  useHardwareBack();
  const [name, setName] = useState("");
  const [roomId, setRoomId] = useState("");
  const [count, setCount] = useState("3");
  const [players, setPlayers] = useState(["", "", ""]);
  const [rate, setRate] = useState("");
  const [saving, setSaving] = useState(false);

  const playerCount = useMemo(() => Math.min(8, Math.max(2, Number(count) || 2)), [count]);

  function updateCount(value: string) {
    setCount(value);
    const next = Math.min(8, Math.max(2, Number(value) || 2));
    setPlayers((current) => {
      const copy = [...current];
      while (copy.length < next) copy.push("");
      return copy.slice(0, next);
    });
  }

  async function submit() {
    const names = players.slice(0, playerCount).map((item) => item.trim());
    if (names.some((item) => !item)) {
      Alert.alert("Missing names", "Enter a name for every player.");
      return;
    }
    Alert.alert("Create this room?", `${names.join(", ")}`, [
      { text: "Back" },
      {
        text: "Create",
        onPress: async () => {
          setSaving(true);
          try {
            const result = await api.createGame({
              name,
              roomId: roomId || undefined,
              pointsToMoneyRate: rate ? Number(rate) : null,
              players: names.map((item) => ({ name: item }))
            });
            router.push(`/game/${result.game.id}`);
          } catch (error) {
            Alert.alert("Could not create", error instanceof Error ? error.message : "Try again");
          } finally {
            setSaving(false);
          }
        }
      }
    ]);
  }

  return (
    <KeyboardScreen style={styles.wrap} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Game name</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} />
      <Text style={styles.label}>Room ID (optional)</Text>
      <TextInput style={styles.input} autoCapitalize="characters" value={roomId} onChangeText={setRoomId} />
      <Text style={styles.label}>Player count</Text>
      <TextInput style={styles.input} keyboardType="number-pad" value={count} onChangeText={updateCount} />
      {players.slice(0, playerCount).map((player, index) => (
        <View key={index}>
          <Text style={styles.label}>Player {index + 1}</Text>
          <TextInput
            style={styles.input}
            value={player}
            onChangeText={(value) =>
              setPlayers((current) => {
                const next = [...current];
                next[index] = value;
                return next;
              })
            }
          />
        </View>
      ))}
      <Text style={styles.label}>Points-to-money rate (optional)</Text>
      <TextInput style={styles.input} keyboardType="decimal-pad" value={rate} onChangeText={setRate} />
      <Pressable style={styles.button} onPress={submit} disabled={saving}>
        <Text style={styles.buttonText}>{saving ? "Creating…" : "Review and create"}</Text>
      </Pressable>
    </KeyboardScreen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.cream },
  content: { padding: 16, paddingBottom: 40 },
  label: { fontWeight: "700", color: colors.forest, marginBottom: 6 },
  input: { backgroundColor: colors.white, borderRadius: 12, padding: 12, marginBottom: 12 },
  button: { backgroundColor: colors.forest, borderRadius: 12, padding: 16, alignItems: "center", marginTop: 8 },
  buttonText: { color: colors.cream, fontWeight: "700" }
});
