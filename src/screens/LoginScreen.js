import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { loginUser, registerUser } from "../services/authService";
import { createUserProfile, isEmailTaken } from "../services/firestoreService";
import { useTheme } from "../contexts/ThemeContext";
import {
  isBiometricAvailable,
  authenticateWithBiometrics,
  saveCredentials,
  getSavedCredentials,
} from "../services/biometricService";

// Firebase Email/Password auth uses a synthetic email built from the phone number.
// The phone number itself is stored in the Firestore user profile.
const PHONE_EMAIL_SUFFIX = "@auth.moneytracker";

const firebaseError = (code) =>
  ({
    "auth/invalid-credential": "Invalid email or password.",
    "auth/user-not-found": "Invalid email or password.",
    "auth/wrong-password": "Invalid email or password.",
    "auth/email-already-in-use": "An account with this email already exists.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/too-many-requests": "Too many attempts. Please try again.",
    "auth/network-request-failed": "Network error. Check your connection.",
    "auth/operation-not-allowed": "This sign-in method is not enabled.",
    "auth/invalid-email": "Please enter a valid email address.",
  })[code] ?? "Something went wrong. Please try again.";

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoiding: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  brandContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  logoContainer: {
    width: 96,
    height: 96,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  logoText: {
    fontSize: 48,
  },
  title: {
    fontSize: 30,
    fontWeight: "bold",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: "row",
    borderRadius: 16,
    padding: 4,
    marginBottom: 28,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
  },
  tabButtonActive: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: {
    textAlign: "center",
    fontWeight: "600",
    fontSize: 14,
  },
  tabTextActive: {
    color: "#ffffff",
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  inputWithIcon: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  iconButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  iconButtonText: {
    fontWeight: "600",
    fontSize: 14,
  },
  helperText: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  errorContainer: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  errorText: {
    fontSize: 14,
  },
  submitButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonDisabled: {},
  submitText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 16,
  },
});

export default function LoginScreen({ navigation }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState("login"); // 'login' | 'register'
  const [loginEmail, setLoginEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricLoginEnabled, setBiometricLoginEnabled] = useState(false);

  useEffect(() => {
    const checkBiometrics = async () => {
      const available = await isBiometricAvailable();
      setBiometricAvailable(available);
      // Check if user has enabled biometric login
      if (available) {
        const saved = await getSavedCredentials();
        setBiometricLoginEnabled(!!saved);
      }
    };
    checkBiometrics();
  }, []);

  const handleBiometricLogin = async () => {
    setError("");
    const authenticated = await authenticateWithBiometrics();
    if (!authenticated) return;

    const credentials = await getSavedCredentials();
    if (!credentials) {
      setError("No saved credentials. Please sign in with your password first.");
      return;
    }

    setLoading(true);
    try {
      await loginUser(credentials.email, credentials.password);
    } catch (e) {
      setError("Biometric login failed. Please sign in with your password.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setError("");

    if (mode === "login") {
      // Login with email
      if (!loginEmail.trim()) {
        setError("Please enter your email address.");
        return;
      }
      if (password.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }
      setLoading(true);
      try {
        await loginUser(loginEmail.trim(), password);
        // Save credentials if biometric is enabled (for fingerprint login)
        if (biometricAvailable) {
          await saveCredentials(loginEmail.trim(), password);
          setBiometricLoginEnabled(true);
        }
      } catch {
        setError("Invalid credentials.");
      } finally {
        setLoading(false);
      }
    } else {
      // Registration
      const cleanPhone = phone.replace(/\D/g, "");
      if (username.trim().length === 0) {
        setError("Please choose a username.");
        return;
      }
      if (!email.trim()) {
        setError("Please enter your email address.");
        return;
      }
      if (cleanPhone.length !== 10) {
        setError("Phone number must be exactly 10 digits.");
        return;
      }
      if (password.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }
      setLoading(true);
      try {
        // Check if email is already taken (ignore if Firestore query fails)
        try {
          const emailExists = await isEmailTaken(email.trim());
          if (emailExists) {
            setError("An account with this email already exists.");
            setLoading(false);
            return;
          }
        } catch {
          // Firestore query failed — proceed, Firebase Auth will catch duplicates
        }

        const { user } = await registerUser(email.trim(), password, username.trim());
        await createUserProfile(user.uid, {
          displayName: username.trim(),
          email: email.trim(),
          phone: cleanPhone,
          authProvider: "email",
          username: username.trim(),
        });
      } catch (e) {
        setError(firebaseError(e.code));
      } finally {
        setLoading(false);
      }
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
          {/* ── Brand ── */}
          <View style={styles.brandContainer}>
            <View
              style={[
                styles.logoContainer,
                { backgroundColor: theme.colors.tabBarActive },
              ]}
            >
              <Text style={styles.logoText}>💰</Text>
            </View>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              MoneyTracker
            </Text>
            <Text
              style={[styles.subtitle, { color: theme.colors.textSecondary }]}
            >
              Take control of your finances
            </Text>
          </View>

          {/* ── Tab Switcher ── */}
          <View
            style={[
              styles.tabContainer,
              { backgroundColor: theme.colors.border },
            ]}
          >
            {[
              { key: "login", label: "Sign In" },
              { key: "register", label: "Register" },
            ].map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                onPress={() => {
                  setMode(key);
                  setError("");
                }}
                style={[
                  styles.tabButton,
                  mode === key && [
                    styles.tabButtonActive,
                    { backgroundColor: theme.colors.tabBarActive },
                  ],
                ]}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: theme.colors.textSecondary },
                    mode === key && styles.tabTextActive,
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Email (login) / Phone + Email + Username (register) ── */}
          {mode === "login" ? (
            <View style={{ marginBottom: 16 }}>
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
                value={loginEmail}
                onChangeText={(t) => {
                  setLoginEmail(t);
                  setError("");
                }}
              />
            </View>
          ) : (
            <>
              <View style={{ marginBottom: 16 }}>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                  Username
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
                  placeholder="Choose a username"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={username}
                  onChangeText={(t) => {
                    setUsername(t);
                    setError("");
                  }}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
                <Text
                  style={[
                    styles.helperText,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  This will be used to greet you
                </Text>
              </View>

              <View style={{ marginBottom: 16 }}>
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
                <Text
                  style={[
                    styles.helperText,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Used for password recovery
                </Text>
              </View>

              <View style={{ marginBottom: 16 }}>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                  Phone Number
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
                  placeholder="0712 345 678"
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={phone}
                  onChangeText={(t) => {
                    setPhone(t.replace(/\D/g, ""));
                    setError("");
                  }}
                />
                <Text
                  style={[styles.helperText, { color: theme.colors.textSecondary }]}
                >
                  10-digit mobile number (no country code)
                </Text>
              </View>
            </>
          )}

          {/* ── Password ── */}
          <View style={{ marginBottom: 20 }}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
              Password
            </Text>
            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <TextInput
                style={[styles.inputWithIcon, { color: theme.colors.text }]}
                placeholder="Enter your password"
                placeholderTextColor={theme.colors.textSecondary}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  setError("");
                }}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.iconButton}
              >
                <Text
                  style={[
                    styles.iconButtonText,
                    { color: theme.colors.tabBarActive },
                  ]}
                >
                  {showPassword ? "Hide" : "Show"}
                </Text>
              </TouchableOpacity>
            </View>
            {mode === "login" && (
              <TouchableOpacity
                onPress={() => navigation.navigate("ForgotPassword")}
                style={{ alignSelf: "flex-end", marginTop: 8 }}
              >
                <Text
                  style={{
                    color: theme.colors.tabBarActive,
                    fontSize: 13,
                    fontWeight: "600",
                  }}
                >
                  Forgot Password?
                </Text>
              </TouchableOpacity>
            )}
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

          {/* ── Submit ── */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            style={[
              styles.submitButton,
              {
                backgroundColor: loading
                  ? theme.colors.textSecondary
                  : theme.colors.tabBarActive,
              },
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>
                {mode === "login" ? "Sign In" : "Create Account"}
              </Text>
            )}
          </TouchableOpacity>

          {/* ── Biometric Login ── */}
          {mode === "login" && biometricAvailable && biometricLoginEnabled && (
            <TouchableOpacity
              onPress={handleBiometricLogin}
              disabled={loading}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                marginTop: 16,
                paddingVertical: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.card,
              }}
            >
              <Ionicons
                name="finger-print-outline"
                size={22}
                color={theme.colors.tabBarActive}
                style={{ marginRight: 8 }}
              />
              <Text
                style={{
                  color: theme.colors.text,
                  fontWeight: "600",
                  fontSize: 15,
                }}
              >
                Sign in with Fingerprint
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
