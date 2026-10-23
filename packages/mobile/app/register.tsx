import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput } from "react-native";
import { api, setToken } from "../lib/api";
import { KeyboardScreen } from "../lib/keyboard";
import { colors } from "../lib/theme";

export default function RegisterScreen() {
  const [fullName, setFullName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    try {
      const result = await api.register({ fullName, mobileNumber, password, confirmPassword });
      await setToken(result.accessToken);
      router.replace("/(app)");
    } catch (error) {
      Alert.alert("Registration failed", error instanceof Error ? error.message : "Try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardScreen style={styles.wrap} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Create account</Text>
      <TextInput style={styles.input} placeholder="Full name" value={fullName} onChangeText={setFullName} />
      <TextInput style={styles.input} placeholder="Mobile number" keyboardType="phone-pad" value={mobileNumber} onChangeText={setMobileNumber} />
      <TextInput style={styles.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
      <TextInput style={styles.input} placeholder="Confirm password" secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} />
      <Pressable style={styles.button} onPress={submit} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? "Creating…" : "Register"}</Text>
      </Pressable>
    </KeyboardScreen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.cream },
  content: { padding: 24, justifyContent: "center", flexGrow: 1 },
  title: { fontSize: 28, fontWeight: "800", color: colors.forest, marginBottom: 16 },
  input: { backgroundColor: colors.white, borderRadius: 12, padding: 14, marginBottom: 12 },
  button: { backgroundColor: colors.forest, borderRadius: 12, padding: 14, alignItems: "center" },
  buttonText: { color: colors.cream, fontWeight: "700" }
});
