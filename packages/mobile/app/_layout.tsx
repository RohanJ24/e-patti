import "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { HeaderBack, useNativeStackScreenOptions } from "../lib/navigation";
import { colors } from "../lib/theme";

export default function RootLayout() {
  const headerOptions = useNativeStackScreenOptions();
  const [fontsLoaded] = useFonts({
    ...Ionicons.font
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.cream }}>
        <ActivityIndicator color={colors.forest} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          ...headerOptions,
          headerLeft: () => <HeaderBack />,
          headerBackVisible: false
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ title: "Log in", headerLeft: () => <HeaderBack fallback="/" /> }} />
        <Stack.Screen name="register" options={{ title: "Register", headerLeft: () => <HeaderBack fallback="/" /> }} />
        <Stack.Screen name="create" options={{ title: "New game" }} />
        <Stack.Screen name="game/[id]" options={{ headerShown: false }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
