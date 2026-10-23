import { Stack } from "expo-router";
import { HeaderBack, useHardwareBack } from "../../../lib/navigation";
import { colors } from "../../../lib/theme";

export default function GameLayout() {
  useHardwareBack("/(app)/games");

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.forest },
        headerTintColor: colors.cream,
        headerTitleStyle: { fontWeight: "700" },
        contentStyle: { backgroundColor: colors.cream },
        headerLeft: () => <HeaderBack fallback="/(app)/games" />,
        headerBackVisible: false
      }}
    >
      <Stack.Screen name="index" options={{ title: "Game" }} />
      <Stack.Screen name="round" options={{ title: "Round" }} />
      <Stack.Screen name="summary" options={{ title: "Summary" }} />
    </Stack>
  );
}
