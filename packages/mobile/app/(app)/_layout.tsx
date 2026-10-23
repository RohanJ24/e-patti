import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useTabScreenOptions } from "../../lib/navigation";
import { colors } from "../../lib/theme";

export default function AppLayout() {
  const headerOptions = useTabScreenOptions();
  return (
    <Tabs
      screenOptions={{
        ...headerOptions,
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.cream,
        tabBarStyle: { backgroundColor: colors.forestDark }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={size} color={color} />
          )
        }}
      />
      <Tabs.Screen
        name="games"
        options={{
          title: "My games",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "albums" : "albums-outline"} size={size} color={color} />
          )
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "person" : "person-outline"} size={size} color={color} />
          )
        }}
      />
    </Tabs>
  );
}
