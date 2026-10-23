import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useCallback } from "react";
import { BackHandler, Pressable } from "react-native";
import { colors } from "./theme";

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
