import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import type { GameListItem, UserPublic } from "@e-patti/shared";
import { api } from "../../lib/api";
import { colors } from "../../lib/theme";

export default function DashboardScreen() {
  const [user, setUser] = useState<UserPublic | null>(null);
  const [games, setGames] = useState<GameListItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [me, list] = await Promise.all([api.me(), api.listGames()]);
    setUser(me.user);
    setGames(list.items);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const report = useMemo(() => {
    const active = games.filter((game) => game.status === "ACTIVE");
    const completed = games.filter((game) => game.status === "COMPLETED");
    const rounds = games.reduce((sum, game) => sum + game.roundCount, 0);
    return {
      total: games.length,
      active: active.length,
      completed: completed.length,
      rounds,
      recent: [...games].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 3)
    };
  }, [games]);

  return (
    <ScrollView
      style={styles.wrap}
      contentContainerStyle={{ paddingBottom: 40 }}
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
      <Text style={styles.hello}>Welcome{user ? `, ${user.fullName}` : ""}</Text>
      <Text style={styles.meta}>Start a new room or continue from My games.</Text>
      <Pressable style={styles.button} onPress={() => router.push("/create")}>
        <Text style={styles.buttonText}>New game</Text>
      </Pressable>

      <Text style={styles.section}>Games report</Text>
      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{report.total}</Text>
          <Text style={styles.statLabel}>Total games</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{report.active}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{report.completed}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{report.rounds}</Text>
          <Text style={styles.statLabel}>Rounds played</Text>
        </View>
      </View>

      <Text style={styles.section}>Recently updated</Text>
      {report.recent.length === 0 ? (
        <Text style={styles.meta}>No games yet.</Text>
      ) : (
        report.recent.map((game) => (
          <Pressable key={game.id} style={styles.card} onPress={() => router.push(`/game/${game.id}`)}>
            <Text style={styles.room}>{game.roomId}</Text>
            <Text style={styles.name}>{game.name || "Untitled game"}</Text>
            <Text style={styles.meta}>
              {game.status} · {game.roundCount} rounds · {game.playerCount} players
            </Text>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 16, backgroundColor: colors.cream },
  hello: { fontSize: 28, fontWeight: "800", color: colors.forest, marginBottom: 8 },
  meta: { color: colors.muted, marginBottom: 16, fontSize: 15 },
  button: { backgroundColor: colors.forest, borderRadius: 12, padding: 16, alignItems: "center", marginBottom: 8 },
  buttonText: { color: colors.cream, fontWeight: "700", fontSize: 16 },
  section: { marginTop: 20, marginBottom: 12, fontSize: 18, fontWeight: "700", color: colors.forest },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  stat: { width: "47%", backgroundColor: colors.white, borderRadius: 16, padding: 16 },
  statValue: { fontSize: 28, fontWeight: "800", color: colors.forest },
  statLabel: { marginTop: 4, color: colors.muted },
  card: { backgroundColor: colors.white, borderRadius: 16, padding: 16, marginBottom: 10 },
  room: { color: colors.muted, fontSize: 12, letterSpacing: 1 },
  name: { fontSize: 18, fontWeight: "700", color: colors.ink }
});
