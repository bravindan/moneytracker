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
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { getCurrentUser, changePassword, updateUserPhoto } from '../services/authService';
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
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
          setProfilePhoto(data.photoURL || user?.photoURL || null);
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

  const handlePickImage = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        setProfilePhoto(asset.uri);
        
        // Update user profile photo
        await updateUserPhoto(asset.uri);
        // Update Firestore profile
        await updateUserProfile(uid, { photoURL: asset.uri });
        Alert.alert('Success', 'Profile photo updated');
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Could not update profile photo');
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Validation Error', 'All password fields are required');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Validation Error', 'New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Validation Error', 'New passwords do not match');
      return;
    }

    try {
      setSaving(true);
      await changePassword(currentPassword, newPassword);
      Alert.alert('Success', 'Password changed successfully');
      // Clear password fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordSection(false);
    } catch (error) {
      console.error('Failed to change password:', error);
      Alert.alert('Error', error.message || 'Could not change password');
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

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary, textAlign: 'center' }]}>Manage your account details</Text>

        {/* Profile Photo Section */}
        <View style={styles.photoSection}>
          <TouchableOpacity onPress={handlePickImage}>
            {profilePhoto ? (
              <Image source={{ uri: profilePhoto }} style={styles.profilePhoto} />
            ) : (
              <View style={[styles.profilePhotoPlaceholder, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <Ionicons name="camera-outline" size={40} color={theme.colors.textSecondary} />
              </View>
            )}
          </TouchableOpacity>
          <Text style={[styles.photoText, { color: theme.colors.textSecondary }]}>Tap to change photo</Text>
        </View>

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

        {/* Password Change Section */}
        <View style={styles.formGroup}>
          <TouchableOpacity
            style={[styles.passwordToggle, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
            onPress={() => setShowPasswordSection(!showPasswordSection)}
          >
            <Text style={[styles.passwordToggleText, { color: theme.colors.text }]}>Change Password</Text>
            <Ionicons 
              name={showPasswordSection ? 'chevron-up-outline' : 'chevron-down-outline'} 
              size={20} 
              color={theme.colors.text} 
            />
          </TouchableOpacity>
          
          {showPasswordSection && (
            <View style={styles.passwordSection}>
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.colors.text }]}>Current Password</Text>
                <View style={[styles.input, { flexDirection: 'row', alignItems: 'center', paddingVertical: 0, backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                  <TextInput
                    style={{ flex: 1, paddingVertical: 10, fontSize: 16, color: theme.colors.text }}
                    placeholder="Enter current password"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    secureTextEntry={!showCurrentPassword}
                  />
                  <TouchableOpacity onPress={() => setShowCurrentPassword(!showCurrentPassword)} style={{ padding: 10 }}>
                    <Ionicons name={showCurrentPassword ? "eye-off-outline" : "eye-outline"} size={20} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.colors.text }]}>New Password</Text>
                <View style={[styles.input, { flexDirection: 'row', alignItems: 'center', paddingVertical: 0, backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                  <TextInput
                    style={{ flex: 1, paddingVertical: 10, fontSize: 16, color: theme.colors.text }}
                    placeholder="Enter new password"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showNewPassword}
                  />
                  <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)} style={{ padding: 10 }}>
                    <Ionicons name={showNewPassword ? "eye-off-outline" : "eye-outline"} size={20} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.colors.text }]}>Confirm New Password</Text>
                <View style={[styles.input, { flexDirection: 'row', alignItems: 'center', paddingVertical: 0, backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                  <TextInput
                    style={{ flex: 1, paddingVertical: 10, fontSize: 16, color: theme.colors.text }}
                    placeholder="Confirm new password"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={{ padding: 10 }}>
                    <Ionicons name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} size={20} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>
              
              <TouchableOpacity
                style={[styles.changePasswordButton, { backgroundColor: saving ? theme.colors.textSecondary : theme.colors.tabBarActive }]}
                onPress={handleChangePassword}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.changePasswordButtonText}>Change Password</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: saving ? theme.colors.textSecondary : theme.colors.tabBarActive }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Profile Changes</Text>
          )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingBottom: 300, // Increased buffer space so keyboard never blocks bottom fields
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
  photoSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  profilePhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 8,
  },
  profilePhotoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  photoText: {
    fontSize: 12,
    color: '#666',
  },
  passwordToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  passwordToggleText: {
    fontSize: 16,
    fontWeight: '500',
  },
  passwordSection: {
    marginTop: 16,
  },
  changePasswordButton: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  changePasswordButtonText: {
    color: '#ffffff',
    fontSize: 16,
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
