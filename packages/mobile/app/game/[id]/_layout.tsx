import { Stack } from "expo-router";
import { HeaderBack, useHardwareBack, useNativeStackScreenOptions } from "../../../lib/navigation";

export default function GameLayout() {
  useHardwareBack("/(app)/games");
  const headerOptions = useNativeStackScreenOptions();

  return (
    <Stack
      screenOptions={{
        ...headerOptions,
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
