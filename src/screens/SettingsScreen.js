import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getCurrentUser } from '../services/authService';
import { getUserProfile, updateUserProfile } from '../services/firestoreService';

const SettingsScreen = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');

  const user = getCurrentUser();
  const uid = user?.uid;

  useEffect(() => {
    if (!uid) return;
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const data = await getUserProfile(uid);
        if (data) {
          setProfile(data);
          setUsername(data.username || data.displayName || '');
          setPhone(data.phone || '');
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error);
        Alert.alert('Error', 'Could not load profile');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [uid]);

  const handleSave = async () => {
    if (!uid) return;
    if (!username.trim()) {
      Alert.alert('Validation', 'Username cannot be empty');
      return;
    }
    setSaving(true);
    try {
      await updateUserProfile(uid, { username: username.trim() });
      Alert.alert('Success', 'Profile updated');
      // Refresh profile
      const updated = await getUserProfile(uid);
      setProfile(updated);
    } catch (error) {
      console.error('Failed to update profile:', error);
      Alert.alert('Error', 'Could not update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={{ marginTop: 12, color: '#6b7280' }}>Loading profile...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>Profile Settings</Text>
        <Text style={styles.subtitle}>Manage your account details</Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={styles.helperText}>
            This will be used in the welcome greeting
          </Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={[styles.input, { color: '#9ca3af' }]}
            value={phone}
            editable={false}
          />
          <Text style={styles.helperText}>
            Phone number cannot be changed
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Account Information</Text>
          <Text style={styles.infoText}>Email: {user?.email || 'N/A'}</Text>
          <Text style={styles.infoText}>Auth Provider: {profile?.authProvider || 'N/A'}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollContainer: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 24,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
  },
  helperText: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  saveButton: {
    backgroundColor: '#4f46e5',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  saveButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: '#e0f2fe',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0369a1',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
});

export default SettingsScreen;
