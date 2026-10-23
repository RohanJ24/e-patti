import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput } from "react-native";
import { api, setToken } from "../../lib/api";
import { KeyboardScreen } from "../../lib/keyboard";
import { colors } from "../../lib/theme";

export default function ProfileScreen() {
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.me().then((result) => {
      setName(result.user.fullName);
      setMobile(result.user.mobileNumber);
    });
  }, []);

  async function save() {
    if (newPassword || confirmPassword || currentPassword) {
      if (!currentPassword) {
        Alert.alert("Current password required", "Enter your current password to set a new one.");
        return;
      }
      if (newPassword !== confirmPassword) {
        Alert.alert("Passwords do not match", "New password and confirmation must be the same.");
        return;
      }
    }

    const changingPassword = Boolean(newPassword);
    setSaving(true);
    try {
      const body: Record<string, string> = { fullName: name };
      if (changingPassword) {
        body.currentPassword = currentPassword;
        body.newPassword = newPassword;
        body.confirmPassword = confirmPassword;
      }
      const result = await api.updateProfile(body);
      setName(result.user.fullName);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      Alert.alert("Saved", changingPassword ? "Password updated." : "Profile updated.");
    } catch (error) {
      Alert.alert("Unable to save", error instanceof Error ? error.message : "Try again");
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    try {
      await api.logout();
    } catch {
      // still clear local session
    }
    await setToken(null);
    router.replace("/login");
  }

  return (
    <KeyboardScreen style={styles.wrap} contentContainerStyle={styles.content}>
      <Text style={styles.name}>{name || "Profile"}</Text>
      <Text style={styles.meta}>{mobile}</Text>

      <Text style={styles.label}>Full name</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} autoCapitalize="words" />

      <Text style={styles.label}>Mobile number</Text>
      <TextInput style={[styles.input, styles.disabled]} value={mobile} editable={false} />

      <Text style={styles.section}>Change password</Text>
      <TextInput
        style={styles.input}
        placeholder="Current password"
        secureTextEntry
        value={currentPassword}
        onChangeText={setCurrentPassword}
      />
      <TextInput
        style={styles.input}
        placeholder="New password"
        secureTextEntry
        value={newPassword}
        onChangeText={setNewPassword}
      />
      <TextInput
        style={styles.input}
        placeholder="Confirm new password"
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />
      <Text style={styles.hint}>At least 8 characters, with a letter and a number.</Text>

      <Pressable style={styles.button} onPress={save} disabled={saving}>
        <Text style={styles.buttonText}>{saving ? "Saving…" : "Save changes"}</Text>
      </Pressable>
      <Pressable style={styles.ghost} onPress={logout}>
        <Text style={styles.ghostText}>Log out</Text>
      </Pressable>
    </KeyboardScreen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.cream },
  content: { padding: 24, paddingBottom: 40 },
  name: { fontSize: 28, fontWeight: "800", color: colors.forest },
  meta: { marginTop: 6, marginBottom: 20, color: colors.muted },
  section: { marginTop: 8, marginBottom: 12, fontSize: 18, fontWeight: "700", color: colors.forest },
  label: { marginBottom: 6, fontWeight: "600", color: colors.ink },
  input: { backgroundColor: colors.white, borderRadius: 12, padding: 14, marginBottom: 12 },
  disabled: { color: colors.muted },
  hint: { marginBottom: 16, color: colors.muted, fontSize: 12 },
  button: { backgroundColor: colors.forest, borderRadius: 12, padding: 14, alignItems: "center" },
  buttonText: { color: colors.cream, fontWeight: "700" },
  ghost: { marginTop: 12, borderWidth: 1, borderColor: colors.forest, borderRadius: 12, padding: 14, alignItems: "center" },
  ghostText: { color: colors.forest, fontWeight: "700" }
});
