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
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../config/firebase';
import { loginUser, registerUser } from '../services/authService';
import { createUserProfile, getUserProfile } from '../services/firestoreService';

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
    backgroundColor: '#f9fafb', // bg-gray-50
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
    backgroundColor: '#6366f1', // indigo-500
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
    color: '#111827', // gray-900
    letterSpacing: -0.5,
  },
  subtitle: {
    color: '#6b7280', // gray-500
    fontSize: 14,
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#e5e7eb', // gray-200
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
    backgroundColor: '#4f46e5', // indigo-600
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
    color: '#4b5563', // gray-600
  },
  tabTextActive: {
    color: '#ffffff',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151', // gray-700
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db', // gray-300
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#111827', // gray-900
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
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
    color: '#111827',
  },
  iconButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  iconButtonText: {
    color: '#4f46e5',
    fontWeight: '600',
    fontSize: 14,
  },
  helperText: {
    color: '#9ca3af', // gray-400
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  errorContainer: {
    backgroundColor: '#fef2f2', // red-50
    borderWidth: 1,
    borderColor: '#fee2e2', // red-100
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
    color: '#dc2626', // red-600
    fontSize: 14,
  },
  submitButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#4f46e5', // indigo-600
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonDisabled: {
    backgroundColor: '#818cf8', // indigo-400
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
    backgroundColor: '#d1d5db', // gray-300
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#6b7280', // gray-500
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 1,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db', // gray-300
    borderRadius: 16,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
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
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  googleIconText: {
    color: '#4285F4',
    fontWeight: '800',
    fontSize: 15,
  },
  googleButtonText: {
    color: '#1f2937', // gray-800
    fontWeight: '600',
    fontSize: 14,
  },
});

export default function LoginScreen() {
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
    <SafeAreaView style={styles.container}>
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
            <View style={styles.logoContainer}>
              <Text style={styles.logoText}>💰</Text>
            </View>
            <Text style={styles.title}>MoneyTracker</Text>
            <Text style={styles.subtitle}>Take control of your finances</Text>
          </View>

          {/* ── Tab Switcher ── */}
          <View style={styles.tabContainer}>
            {[
              { key: 'login', label: 'Sign In' },
              { key: 'register', label: 'Register' },
            ].map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                onPress={() => { setMode(key); setError(''); }}
                style={[
                  styles.tabButton,
                  mode === key && styles.tabButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.tabText,
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
            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="0712 345 678"
              placeholderTextColor="#9ca3af"
              keyboardType="phone-pad"
              maxLength={10}
              value={phone}
              onChangeText={(t) => { setPhone(t.replace(/\D/g, '')); setError(''); }}
            />
            <Text style={styles.helperText}>
              10-digit mobile number (no country code)
            </Text>
          </View>

          {/* ── Username (only for registration) ── */}
          {mode === 'register' && (
            <View style={{ marginBottom: 16 }}>
              <Text style={styles.inputLabel}>Username</Text>
              <TextInput
                style={styles.input}
                placeholder="Choose a username"
                placeholderTextColor="#9ca3af"
                value={username}
                onChangeText={(t) => { setUsername(t); setError(''); }}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={styles.helperText}>
                This will be used to greet you
              </Text>
            </View>
          )}

          {/* ── Password ── */}
          <View style={{ marginBottom: 20 }}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.inputWithIcon}
                placeholder="Enter your password"
                placeholderTextColor="#9ca3af"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={(t) => { setPassword(t); setError(''); }}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.iconButton}
              >
                <Text style={styles.iconButtonText}>{showPassword ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Error ── */}
          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* ── Submit ── */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            style={[
              styles.submitButton,
              loading && styles.submitButtonDisabled,
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
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* ── Google Sign-In ── */}
          <TouchableOpacity
            onPress={() => promptAsync()}
            disabled={!request || loading}
            style={styles.googleButton}
          >
            <View style={styles.googleIconContainer}>
              <Text style={styles.googleIconText}>G</Text>
            </View>
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}