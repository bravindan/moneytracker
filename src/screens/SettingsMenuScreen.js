import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch, Alert, Linking, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { getCurrentUser } from '../services/authService';
import { getUserProfile, updateUserProfile } from '../services/firestoreService';
import { isBiometricAvailable, getBiometricSetting, setBiometricSetting } from '../services/biometricService';

const SettingsMenuScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const user = getCurrentUser();
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const enabled = await getBiometricSetting();
      setBiometricEnabled(enabled);
      const available = await isBiometricAvailable();
      setBiometricAvailable(available);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const toggleBiometric = async (value) => {
    if (value) {
      const available = await isBiometricAvailable();
      if (!available) {
        Alert.alert(
          'Biometric Not Available',
          'No fingerprint or face ID is enrolled on this device. Please set up biometrics in your device settings first.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: () => {
                if (Platform.OS === 'android') {
                  Linking.openSettings();
                } else {
                  Linking.openURL('app-settings:');
                }
              },
            },
          ]
        );
        return;
      }
      setBiometricEnabled(true);
      await setBiometricSetting(true);
      Alert.alert(
        'Fingerprint Login Enabled',
        'You can now use your fingerprint to sign in. Make sure you have saved your password at least once.'
      );
    } else {
      setBiometricEnabled(false);
      await setBiometricSetting(false);
    }
  };

  const menuItems = [
    {
      title: 'Profile',
      subtitle: 'Manage your username and account details',
      icon: 'person-outline',
      screen: 'Profile',
    },
    {
      title: 'Notifications',
      subtitle: 'Set spending reminders and alerts',
      icon: 'notifications-outline',
      screen: 'Notifications',
    },
    {
      title: 'Fingerprint Login',
      subtitle: biometricAvailable
        ? (biometricEnabled ? 'Enabled — tap to disable' : 'Disabled — tap to enable')
        : 'Not available on this device',
      icon: 'finger-print-outline',
      toggle: true,
      value: biometricEnabled,
      onToggle: toggleBiometric,
      disabled: !biometricAvailable,
    },
    {
      title: 'Currency',
      subtitle: 'Select your preferred currency',
      icon: 'cash-outline',
      screen: 'Currency',
    },
    {
      title: 'Theme',
      subtitle: 'Choose your app appearance',
      icon: 'color-palette-outline',
      screen: 'Theme',
    },
    {
      title: 'About',
      subtitle: 'App info, updates, and more',
      icon: 'information-circle-outline',
      screen: 'About',
    },
  ];

  return (
    <View style={[
      styles.container,
      {
        backgroundColor: theme.colors.background,
        paddingTop: insets.top
      }
    ]}>
      {/* Header with Title */}
      <View style={styles.headerContainer}>
        <View style={styles.placeholder} />
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary, textAlign: 'center' }]}>
          Customize your app experience
        </Text>

        <View style={[styles.menuList, { backgroundColor: theme.colors.card }]}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.menuItem,
                { borderBottomColor: theme.colors.border }
              ]}
              onPress={() => {
                if (item.toggle) {
                  if (!item.disabled) {
                    item.onToggle(!item.value);
                  }
                } else {
                  navigation.navigate(item.screen);
                }
              }}
              disabled={item.disabled}
            >
              <View style={[styles.menuIconContainer, { backgroundColor: theme.colors.tabBarFocused }]}>
                <Ionicons name={item.icon} size={24} color={item.disabled ? theme.colors.textSecondary : (theme.isDark ? '#ffffff' : theme.colors.tabBarActive)} />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={[styles.menuTitle, { color: item.disabled ? theme.colors.textSecondary : theme.colors.text }]}>
                  {item.title}
                </Text>
                <Text style={[styles.menuSubtitle, { color: theme.colors.textSecondary }]}>
                  {item.subtitle}
                </Text>
              </View>
              {item.toggle ? (
                <Switch
                  value={item.value}
                  onValueChange={() => {
                    if (!item.disabled) {
                      item.onToggle(!item.value);
                    }
                  }}
                  trackColor={{ false: theme.colors.border, true: theme.colors.tabBarActive + '60' }}
                  thumbColor={item.value ? theme.colors.tabBarActive : '#f4f3f4'}
                  disabled={item.disabled}
                />
              ) : (
                <Ionicons name="chevron-forward-outline" size={20} color={theme.colors.textSecondary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
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
    paddingBottom: 100,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 24,
  },
  menuList: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 12,
  },
});

export default SettingsMenuScreen;
