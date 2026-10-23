import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useCallback } from "react";
import { BackHandler, Platform, Pressable, StatusBar } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "./theme";

/** Status-bar height so header titles sit below the system bar on edge-to-edge Android. */
export function useHeaderTopInset(): number {
  const insets = useSafeAreaInsets();
  const androidBar = Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 0;
  return Math.max(insets.top, androidBar);
}

export function useNativeStackScreenOptions() {
  return {
    headerStyle: { backgroundColor: colors.forest },
    headerTintColor: colors.cream,
    headerTitleStyle: { fontWeight: "700" as const },
    contentStyle: { backgroundColor: colors.cream },
    statusBarStyle: "light" as const,
    // Native stack only pads the title when this is true (edge-to-edge Android).
    statusBarTranslucent: true,
    headerTopInsetEnabled: true
  };
}

export function useTabScreenOptions() {
  const insets = useSafeAreaInsets();
  const top = useHeaderTopInset();
  return {
    headerStyle: { backgroundColor: colors.forest },
    headerTintColor: colors.cream,
    headerTitleStyle: { fontWeight: "700" as const },
    headerStatusBarHeight: top,
    safeAreaInsets: {
      top,
      bottom: insets.bottom,
      left: insets.left,
      right: insets.right
    }
  };
}

export function goBack(fallback = "/(app)"): void {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace(fallback);
}

export function HeaderBack({ fallback = "/(app)" }: { fallback?: string }) {
  return (
    <Pressable onPress={() => goBack(fallback)} hitSlop={12} style={{ paddingHorizontal: 4, marginRight: 8 }}>
      <Ionicons name="chevron-back" size={28} color={colors.cream} />
    </Pressable>
  );
}

/** Makes the Android system back key use the same path as the header back button. */
export function useHardwareBack(fallback = "/(app)"): void {
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
        goBack(fallback);
        return true;
      });
      return () => subscription.remove();
    }, [fallback])
  );
}
