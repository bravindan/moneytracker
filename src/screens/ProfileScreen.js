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
  Platform,
  KeyboardAvoidingView,
  Modal,
  Image,
} from 'react-native';
import IOSSpinner from '../components/IOSSpinner';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { getCurrentUser, changePassword, updateUserEmail, deleteCurrentUser } from '../services/authService';
import { getUserProfile, updateUserProfile, deleteAllUserData } from '../services/firestoreService';
import { storage } from '../config/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';

const ProfileScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [showEmailPassword, setShowEmailPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteStep, setDeleteStep] = useState(1); // 1 = confirm, 2 = password
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const user = getCurrentUser();
  const uid = user?.uid;

  // Generate avatar from first letter of username
  const generateAvatar = (name) => {
    const firstLetter = name ? name.charAt(0).toUpperCase() : '?';
    return {
      text: firstLetter,
      color: theme.colors.primary,
      backgroundColor: theme.colors.card,
      borderColor: theme.colors.border,
    };
  };

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
          setEmail(data.email || '');
          setProfileImage(data.profileImage || null);
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

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant camera roll access to change your profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      uploadImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri) => {
    if (!uid) return;
    setUploading(true);
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const filename = `profilePictures/${uid}.jpg`;
      const storageRef = ref(storage, filename);
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      await updateUserProfile(uid, { profileImage: downloadURL });
      setProfileImage(downloadURL);
      Alert.alert('Success', 'Profile picture updated!');
    } catch (error) {
      console.error('Failed to upload image:', error);
      Alert.alert('Error', 'Could not upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!uid) return;
    if (!username.trim()) {
      Alert.alert('Validation Error', 'Username cannot be empty');
      return;
    }

    const newEmail = email.trim();
    const emailChanged = newEmail && newEmail !== (profile?.email || '');

    if (emailChanged && !emailPassword) {
      Alert.alert('Required', 'Enter your current password to update your email address.');
      return;
    }

    setSaving(true);
    try {
      // Update Firebase Auth email if changed
      if (emailChanged) {
        await updateUserEmail(newEmail, emailPassword);
        setEmailPassword('');
        Alert.alert(
          'Verification Email Sent',
          `A verification link has been sent to ${newEmail}. Click the link to confirm your new email address.`
        );
      }

      // Update Firestore profile
      await updateUserProfile(uid, { username: username.trim(), email: newEmail });
      if (!emailChanged) {
        Alert.alert('Success', 'Profile updated');
      }
      const updated = await getUserProfile(uid);
      setProfile(updated);
    } catch (error) {
      console.error('Failed to update profile:', error);
      Alert.alert('Error', error.message || 'Could not update profile');
    } finally {
      setSaving(false);
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

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      Alert.alert('Required', 'Please enter your password to confirm deletion.');
      return;
    }

    setDeleting(true);
    try {
      // Delete Firestore data first
      await deleteAllUserData(uid);
      // Then delete the Firebase Auth account
      await deleteCurrentUser(deletePassword);
      setShowDeleteModal(false);
      // User will be automatically signed out via onAuthStateChanged
    } catch (error) {
      console.error('Failed to delete account:', error);
      Alert.alert('Error', error.message || 'Could not delete account. Please check your password.');
    } finally {
      setDeleting(false);
    }
  };

  const openDeleteModal = () => {
    setDeleteStep(1);
    setDeletePassword('');
    setShowDeleteModal(true);
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
        <IOSSpinner size={40} color={theme.colors.tabBarActive} />
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

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      <ScrollView
        contentContainerStyle={[styles.scrollContainer, { paddingBottom: insets.bottom + 120 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary, textAlign: 'center' }]}>Manage your account details</Text>

        <View style={styles.photoSection}>
          <TouchableOpacity onPress={pickImage} disabled={uploading}>
            <View style={[styles.avatarContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              {uploading ? (
                <IOSSpinner size={32} color={theme.colors.tabBarActive} />
              ) : profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.avatarImage} />
              ) : (
                <Text style={[styles.avatarText, { color: generateAvatar(username).color }]}>
                  {generateAvatar(username).text}
                </Text>
              )}
              <View style={[styles.cameraOverlay, { backgroundColor: theme.colors.tabBarActive }]}>
                <Ionicons name="camera-outline" size={16} color="#fff" />
              </View>
            </View>
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

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Email Address</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
            placeholder="Enter email address"
            placeholderTextColor={theme.colors.textSecondary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {email && email !== (profile?.email || '') && (
            <View style={{ marginTop: 8 }}>
              <Text style={[styles.label, { color: theme.colors.text, fontSize: 14 }]}>Current Password (to confirm email change)</Text>
              <View style={[styles.input, { flexDirection: 'row', alignItems: 'center', paddingVertical: 0, backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <TextInput
                  style={{ flex: 1, paddingVertical: 10, fontSize: 16, color: theme.colors.text }}
                  placeholder="Enter current password"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={emailPassword}
                  onChangeText={setEmailPassword}
                  secureTextEntry={!showEmailPassword}
                />
                <TouchableOpacity onPress={() => setShowEmailPassword(!showEmailPassword)} style={{ padding: 10 }}>
                  <Ionicons name={showEmailPassword ? "eye-off-outline" : "eye-outline"} size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>
          )}
          <Text style={[styles.helperText, { color: theme.colors.textSecondary }]}>
            Used for password recovery
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
                  <IOSSpinner size={18} color="#fff" />
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
            <IOSSpinner size={18} color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Profile Changes</Text>
          )}
          </TouchableOpacity>

        {/* Delete Account Section */}
        <View style={[styles.formGroup, { marginTop: 20 }]}>
          <TouchableOpacity
            style={[styles.passwordToggle, { backgroundColor: theme.isDark ? '#450a0a' : '#fef2f2', borderColor: theme.isDark ? '#7f1d1d' : '#fee2e2' }]}
            onPress={openDeleteModal}
          >
            <Text style={[styles.passwordToggleText, { color: theme.isDark ? '#fca5a5' : '#dc2626' }]}>Delete Account</Text>
            <Ionicons name="trash-outline" size={20} color={theme.isDark ? '#fca5a5' : '#dc2626'} />
          </TouchableOpacity>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Delete Account Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            {deleteStep === 1 ? (
              <>
                <View style={[styles.modalIcon, { backgroundColor: theme.isDark ? '#450a0a' : '#fef2f2' }]}>
                  <Ionicons name="warning-outline" size={40} color={theme.isDark ? '#fca5a5' : '#dc2626'} />
                </View>
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Delete Account?</Text>
                <Text style={[styles.modalText, { color: theme.colors.textSecondary }]}>
                  This action is permanent and cannot be undone. All your data including transactions, budgets, investments, and expenses will be permanently deleted.
                </Text>
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: theme.colors.border }]}
                    onPress={() => setShowDeleteModal(false)}
                  >
                    <Text style={[styles.modalButtonText, { color: theme.colors.text }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: theme.isDark ? '#7f1d1d' : '#dc2626' }]}
                    onPress={() => setDeleteStep(2)}
                  >
                    <Text style={[styles.modalButtonText, { color: '#ffffff' }]}>Continue</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <View style={[styles.modalIcon, { backgroundColor: theme.isDark ? '#450a0a' : '#fef2f2' }]}>
                  <Ionicons name="lock-closed-outline" size={40} color={theme.isDark ? '#fca5a5' : '#dc2626'} />
                </View>
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Confirm Password</Text>
                <Text style={[styles.modalText, { color: theme.colors.textSecondary }]}>
                  Enter your password to permanently delete your account.
                </Text>
                <View style={[styles.modalInput, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
                  <TextInput
                    style={{ flex: 1, fontSize: 16, color: theme.colors.text }}
                    placeholder="Enter your password"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={deletePassword}
                    onChangeText={setDeletePassword}
                    secureTextEntry={!showDeletePassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowDeletePassword(!showDeletePassword)} style={{ padding: 10 }}>
                    <Ionicons name={showDeletePassword ? "eye-off-outline" : "eye-outline"} size={20} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: theme.colors.border }]}
                    onPress={() => setShowDeleteModal(false)}
                    disabled={deleting}
                  >
                    <Text style={[styles.modalButtonText, { color: theme.colors.text }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: deleting ? theme.colors.textSecondary : (theme.isDark ? '#7f1d1d' : '#dc2626') }]}
                    onPress={handleDeleteAccount}
                    disabled={deleting}
                  >
                    {deleting ? (
                      <IOSSpinner size={18} color="#fff" />
                    ) : (
                      <Text style={[styles.modalButtonText, { color: '#ffffff' }]}>Delete Forever</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
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
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  modalIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  modalInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    width: '100%',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProfileScreen;
