import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import IOSSpinner from "../components/IOSSpinner";
import { resetPassword } from "../services/authService";

export default function ForgotPasswordScreen({ navigation }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setError("");
    setSuccess(false);

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email.trim());
      setSuccess(true);
    } catch (e) {
      // Firebase returns success even if account doesn't exist (security).
      // Only show error for actual failures like invalid email format.
      if (e.code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else if (e.code === "auth/too-many-requests") {
        setError("Too many attempts. Please try again later.");
      } else {
        // For user-not-found, still show success (security — don't reveal account existence)
        setSuccess(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background, paddingTop: insets.top },
      ]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoiding}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Header ── */}
          <TouchableOpacity
            style={[styles.backButton, { borderColor: theme.colors.border }]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
          </TouchableOpacity>

          <Text style={[styles.title, { color: theme.colors.text }]}>
            Reset Password
          </Text>
          <Text
            style={[styles.subtitle, { color: theme.colors.textSecondary }]}
          >
            Enter the email address associated with your account and we'll send
            you a link to reset your password.
          </Text>

          {/* ── Email ── */}
          <View style={{ marginBottom: 24 }}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
              Email Address
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                },
              ]}
              placeholder="you@example.com"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                setError("");
              }}
            />
          </View>

          {/* ── Error ── */}
          {error ? (
            <View
              style={[
                styles.errorContainer,
                {
                  backgroundColor: theme.isDark ? "#450a0a" : "#fef2f2",
                  borderColor: theme.isDark ? "#7f1d1d" : "#fee2e2",
                },
              ]}
            >
              <Text
                style={[
                  styles.errorText,
                  { color: theme.isDark ? "#fca5a5" : "#dc2626" },
                ]}
              >
                {error}
              </Text>
            </View>
          ) : null}

          {/* ── Success ── */}
          {success ? (
            <View
              style={[
                styles.errorContainer,
                {
                  backgroundColor: theme.isDark ? "#052e16" : "#f0fdf4",
                  borderColor: theme.isDark ? "#14532d" : "#bbf7d0",
                },
              ]}
            >
              <Text
                style={{
                  color: theme.isDark ? "#86efac" : "#16a34a",
                  fontSize: 14,
                  lineHeight: 20,
                }}
              >
                If an account exists with that email, a password reset link has
                been sent. Check your inbox.
              </Text>
            </View>
          ) : null}

          {/* ── Submit ── */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading || success}
            style={[
              styles.submitButton,
              {
                backgroundColor:
                  loading || success
                    ? theme.colors.textSecondary
                    : theme.colors.tabBarActive,
              },
            ]}
          >
            {loading ? (
              <IOSSpinner size={18} color="#fff" />
            ) : (
              <Text style={styles.submitText}>Send Reset Link</Text>
            )}
          </TouchableOpacity>

          {/* ── Back to Login ── */}
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ alignItems: "center", marginTop: 16 }}
          >
            <Text
              style={{ color: theme.colors.tabBarActive, fontWeight: "600" }}
            >
              Back to Sign In
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardAvoiding: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: 24 },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  title: { fontSize: 28, fontWeight: "bold", marginBottom: 8 },
  subtitle: { fontSize: 14, marginBottom: 32, lineHeight: 20 },
  inputLabel: { fontSize: 14, fontWeight: "600", marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
  },
  errorContainer: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
  },
  errorText: { fontSize: 14 },
  submitButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  submitText: { color: "#ffffff", fontWeight: "bold", fontSize: 16 },
});
