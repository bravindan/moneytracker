import { useState, useEffect } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../config/firebase';
import { loginUser, registerUser } from '../services/authService';
import { createUserProfile, getUserProfile } from '../services/firestoreService';
import { useTheme } from '../contexts/ThemeContext';

// Required to complete the Google auth redirect back into the app
WebBrowser.maybeCompleteAuthSession();

// Firebase Email/Password auth uses a synthetic email built from the phone number.
// The phone number itself is stored in the Firestore user profile.
const PHONE_EMAIL_SUFFIX = '@auth.moneytracker';

const firebaseError = (code) =>
  ({
    'auth/user-not-found': 'No account found for this phone number.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/invalid-credential': 'Invalid phone number or password.',
    'auth/email-already-in-use': 'This phone number is already registered.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/too-many-requests': 'Too many attempts. Please try again.',
    'auth/network-request-failed': 'Network error. Check your connection.',
  }[code] ?? 'Something went wrong. Please try again.');

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoiding: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 96,
    height: 96,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
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
    fontWeight: 'bold',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: {
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 14,
  },
  tabTextActive: {
    color: '#ffffff',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    shadowColor: '#000',
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
    fontWeight: '600',
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
    shadowColor: '#000',
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
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonDisabled: {
  },
  submitText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 1,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  googleIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  googleIconText: {
    fontWeight: '800',
    fontSize: 15,
  },
  googleButtonText: {
    fontWeight: '600',
    fontSize: 14,
  },
});

export default function LoginScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID,
  });

  // Handle Google OAuth response
  useEffect(() => {
    if (response?.type === 'success') {
      const idToken = response.authentication?.idToken;
      if (idToken) handleGoogleSignIn(idToken);
    } else if (response?.type === 'error') {
      setError('Google sign-in failed. Please try again.');
    }
  }, [response]);

  const handleGoogleSignIn = async (idToken) => {
    setLoading(true);
    setError('');
    try {
      const credential = GoogleAuthProvider.credential(idToken);
      const { user } = await signInWithCredential(auth, credential);
      // Create Firestore profile on first Google sign-in
      const existing = await getUserProfile(user.uid);
      if (!existing) {
        await createUserProfile(user.uid, {
          displayName: user.displayName ?? '',
          email: user.email ?? '',
          phone: null,
          authProvider: 'google',
        });
      }
    } catch (e) {
      setError('Google sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setError('');
    const cleanPhone = phone.replace(/\D/g, '');

    if (cleanPhone.length !== 10) {
      setError('Phone number must be exactly 10 digits.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    const email = `${cleanPhone}${PHONE_EMAIL_SUFFIX}`;
    setLoading(true);
    try {
      if (mode === 'login') {
        await loginUser(email, password);
      } else {
        // Registration: validate username
        if (username.trim().length === 0) {
          setError('Please choose a username');
          return;
        }
        const { user } = await registerUser(email, password, username.trim());
        await createUserProfile(user.uid, {
          displayName: username.trim(),
          email: '',
          phone: cleanPhone,
          authProvider: 'phone-password',
          username: username.trim(),
        });
      }
    } catch (e) {
      setError(firebaseError(e.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoiding}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Brand ── */}
          <View style={styles.brandContainer}>
            <View style={[styles.logoContainer, { backgroundColor: theme.colors.tabBarActive }]}>
              <Text style={styles.logoText}>💰</Text>
            </View>
            <Text style={[styles.title, { color: theme.colors.text }]}>MoneyTracker</Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>Take control of your finances</Text>
          </View>

          {/* ── Tab Switcher ── */}
          <View style={[styles.tabContainer, { backgroundColor: theme.colors.border }]}>
            {[
              { key: 'login', label: 'Sign In' },
              { key: 'register', label: 'Register' },
            ].map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                onPress={() => { setMode(key); setError(''); }}
                style={[
                  styles.tabButton,
                  mode === key && [styles.tabButtonActive, { backgroundColor: theme.colors.tabBarActive }],
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

          {/* ── Phone Number ── */}
          <View style={{ marginBottom: 16 }}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Phone Number</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
              placeholder="0712 345 678"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="phone-pad"
              maxLength={10}
              value={phone}
              onChangeText={(t) => { setPhone(t.replace(/\D/g, '')); setError(''); }}
            />
            <Text style={[styles.helperText, { color: theme.colors.textSecondary }]}>
              10-digit mobile number (no country code)
            </Text>
          </View>

          {/* ── Username (only for registration) ── */}
          {mode === 'register' && (
            <View style={{ marginBottom: 16 }}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Username</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
                placeholder="Choose a username"
                placeholderTextColor={theme.colors.textSecondary}
                value={username}
                onChangeText={(t) => { setUsername(t); setError(''); }}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={[styles.helperText, { color: theme.colors.textSecondary }]}>
                This will be used to greet you
              </Text>
            </View>
          )}

          {/* ── Password ── */}
          <View style={{ marginBottom: 20 }}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Password</Text>
            <View style={[styles.inputContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <TextInput
                style={[styles.inputWithIcon, { color: theme.colors.text }]}
                placeholder="Enter your password"
                placeholderTextColor={theme.colors.textSecondary}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={(t) => { setPassword(t); setError(''); }}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.iconButton}
              >
                <Text style={[styles.iconButtonText, { color: theme.colors.tabBarActive }]}>{showPassword ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Error ── */}
          {error ? (
            <View style={[styles.errorContainer, { backgroundColor: theme.isDark ? '#450a0a' : '#fef2f2', borderColor: theme.isDark ? '#7f1d1d' : '#fee2e2' }]}>
              <Text style={[styles.errorText, { color: theme.isDark ? '#fca5a5' : '#dc2626' }]}>{error}</Text>
            </View>
          ) : null}

          {/* ── Submit ── */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            style={[
              styles.submitButton,
              { backgroundColor: loading ? theme.colors.textSecondary : theme.colors.tabBarActive },
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>
                {mode === 'login' ? 'Sign In' : 'Create Account'}
              </Text>
            )}
          </TouchableOpacity>

          {/* ── Divider ── */}
          <View style={styles.dividerContainer}>
            <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
            <Text style={[styles.dividerText, { color: theme.colors.textSecondary }]}>OR</Text>
            <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
          </View>

          {/* ── Google Sign-In ── */}
          <TouchableOpacity
            onPress={() => promptAsync()}
            disabled={!request || loading}
            style={[styles.googleButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
          >
            <View style={[styles.googleIconContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <Text style={styles.googleIconText}>G</Text>
            </View>
            <Text style={[styles.googleButtonText, { color: theme.colors.text }]}>Continue with Google</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}