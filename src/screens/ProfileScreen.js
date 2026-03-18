import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { getCurrentUser } from '../services/authService';
import { getUserProfile, updateUserProfile } from '../services/firestoreService';
import CustomAlert from '../components/CustomAlert';

const ProfileScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
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
      Alert.alert('Validation Error', 'Username cannot be empty');
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
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={theme.colors.tabBarActive} />
        <Text style={{ marginTop: 12, color: theme.colors.textSecondary }}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <StatusBar style="auto" />
      
      <View style={styles.headerContainer}>
        <TouchableOpacity
          style={[styles.backButton, { borderColor: theme.colors.border }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Profile</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary, textAlign: 'center' }]}>Manage your account details</Text>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Username</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
            placeholder="Enter username"
            placeholderTextColor={theme.colors.textSecondary}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={[styles.helperText, { color: theme.colors.textSecondary }]}>
            This will be used in welcome greeting
          </Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Phone Number</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.textSecondary }]}
            value={phone}
            editable={false}
          />
          <Text style={[styles.helperText, { color: theme.colors.textSecondary }]}>
            Phone number cannot be changed
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: saving ? theme.colors.textSecondary : theme.colors.tabBarActive }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
    height: 40,
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 100, // Space for tab bar
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 24,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  helperText: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  saveButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  infoBox: {
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    marginBottom: 4,
  },
});

export default ProfileScreen;
