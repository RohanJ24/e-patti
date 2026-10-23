import { Link, router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { API_URL, api, setToken } from "../lib/api";
import { colors } from "../lib/theme";

export default function LoginScreen() {
  const [mobileNumber, setMobileNumber] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    try {
      const result = await api.login({ mobileNumber, password });
      await setToken(result.accessToken);
      router.replace("/(app)");
    } catch (error) {
      Alert.alert("Login failed", error instanceof Error ? error.message : "Try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.brand}>E-Patti</Text>
      <Text style={styles.title}>Log in</Text>
      <TextInput style={styles.input} placeholder="Mobile number" keyboardType="phone-pad" value={mobileNumber} onChangeText={setMobileNumber} />
      <TextInput style={styles.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
      <Pressable style={styles.button} onPress={submit} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? "Signing in…" : "Log in"}</Text>
      </Pressable>
      <Link href="/register" style={styles.link}>
        Create an account
      </Link>
      {__DEV__ ? <Text style={styles.hint}>{API_URL}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 24, justifyContent: "center", backgroundColor: colors.cream },
  brand: { fontSize: 28, fontWeight: "800", color: colors.forest },
  title: { fontSize: 22, marginBottom: 16, color: colors.ink },
  input: { backgroundColor: colors.white, borderRadius: 12, padding: 14, marginBottom: 12 },
  button: { backgroundColor: colors.forest, borderRadius: 12, padding: 14, alignItems: "center" },
  buttonText: { color: colors.cream, fontWeight: "700" },
  link: { marginTop: 16, color: colors.forest, fontWeight: "700" },
  hint: { marginTop: 12, fontSize: 12, color: colors.ink, opacity: 0.55 }
});
