import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const ThemeScreen = ({ navigation }) => {
  const { themeMode, setThemePreference, theme } = useTheme();
  const insets = useSafeAreaInsets();

  const themeOptions = [
    {
      key: 'light',
      title: 'Light',
      subtitle: 'Always use light theme',
      icon: 'sunny-outline',
    },
    {
      key: 'dark',
      title: 'Dark',
      subtitle: 'Always use dark theme',
      icon: 'moon-outline',
    },
    {
      key: 'system',
      title: 'System',
      subtitle: 'Follow device settings',
      icon: 'phone-portrait-outline',
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
        <TouchableOpacity
          style={[styles.backButton, { borderColor: theme.colors.border }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={20} color={theme.colors.tabBarActive} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Theme</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary, textAlign: 'center' }]}>
          Choose your preferred theme
        </Text>

        <View style={[styles.menuList, { backgroundColor: theme.colors.card }]}>
          {themeOptions.map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.menuItem,
                { borderBottomColor: theme.colors.border }
              ]}
              onPress={() => setThemePreference(option.key)}
            >
              <View style={[styles.menuIconContainer, { backgroundColor: themeMode === option.key ? theme.colors.tabBarActive : theme.colors.border }]}>
                <Ionicons 
                  name={option.icon} 
                  size={24} 
                  color={themeMode === option.key ? '#ffffff' : theme.colors.tabBarActive} 
                />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={[styles.menuTitle, { color: theme.colors.text }]}>
                  {option.title}
                </Text>
                <Text style={[styles.menuSubtitle, { color: theme.colors.textSecondary }]}>
                  {option.subtitle}
                </Text>
              </View>
              {themeMode === option.key && (
                <Ionicons name="checkmark-circle" size={20} color={theme.colors.tabBarActive} />
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
    borderBottomWidth: 1,
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

export default ThemeScreen;
