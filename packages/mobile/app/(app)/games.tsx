import { router } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "expo-router";
import type { GameListItem } from "@e-patti/shared";
import { api } from "../../lib/api";
import { colors } from "../../lib/theme";

export default function MyGamesScreen() {
  const [games, setGames] = useState<GameListItem[]>([]);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const list = await api.listGames();
    setGames(list.items);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const filtered = games.filter((game) => {
    const needle = search.trim().toLowerCase();
    if (!needle) return true;
    return `${game.roomId} ${game.name}`.toLowerCase().includes(needle);
  });

  function confirmDelete(game: GameListItem) {
    Alert.alert(
      "Delete this game room?",
      "This permanently removes the room, rounds, and calculated scores.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void api
              .deleteGame(game.id)
              .then(() => setGames((current) => current.filter((item) => item.id !== game.id)))
              .catch((error) =>
                Alert.alert("Unable to delete", error instanceof Error ? error.message : "Try again")
              );
          }
        }
      ]
    );
  }

  return (
    <ScrollView
      style={styles.wrap}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await load();
            setRefreshing(false);
          }}
        />
      }
    >
      <Pressable style={styles.button} onPress={() => router.push("/create")}>
        <Text style={styles.buttonText}>New game</Text>
      </Pressable>
      <TextInput style={styles.search} placeholder="Search room ID or name" value={search} onChangeText={setSearch} />
      {games.length === 0 ? (
        <Text style={styles.empty}>No games yet. Create one to start scoring.</Text>
      ) : (
        ["ACTIVE", "COMPLETED"].map((status) => (
          <View key={status} style={{ marginBottom: 20 }}>
            <Text style={styles.section}>{status === "ACTIVE" ? "Active games" : "Completed games"}</Text>
            {filtered.filter((game) => game.status === status).length === 0 ? (
              <Text style={styles.empty}>None</Text>
            ) : (
              filtered
                .filter((game) => game.status === status)
                .map((game) => (
                  <View key={game.id} style={styles.card}>
                    <Pressable onPress={() => router.push(`/game/${game.id}`)}>
                      <Text style={styles.room}>{game.roomId}</Text>
                      <Text style={styles.name}>{game.name || "Untitled game"}</Text>
                      <Text style={styles.meta}>
                        {game.playerCount} players · {game.roundCount} rounds · {game.status}
                      </Text>
                    </Pressable>
                    <Pressable onPress={() => confirmDelete(game)} hitSlop={8}>
                      <Text style={styles.delete}>Delete</Text>
                    </Pressable>
                  </View>
                ))
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 16, backgroundColor: colors.cream },
  button: { backgroundColor: colors.forest, borderRadius: 12, padding: 14, alignItems: "center", marginBottom: 14 },
  buttonText: { color: colors.cream, fontWeight: "700" },
  search: { backgroundColor: colors.white, borderRadius: 12, padding: 12, marginBottom: 16 },
  section: { fontSize: 18, fontWeight: "700", color: colors.forest, marginBottom: 8 },
  empty: { color: colors.muted, marginBottom: 12 },
  card: { backgroundColor: colors.white, borderRadius: 16, padding: 16, marginBottom: 10 },
  room: { color: colors.muted, fontSize: 12, letterSpacing: 1 },
  name: { fontSize: 18, fontWeight: "700", color: colors.ink },
  meta: { marginTop: 4, color: colors.muted },
  delete: { marginTop: 10, color: colors.danger, fontWeight: "700" }
});
