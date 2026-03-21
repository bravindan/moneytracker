import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const SettingsMenuScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  
  const menuItems = [
    {
      title: 'Profile',
      subtitle: 'Manage your username and account details',
      icon: 'person-outline',
      screen: 'Profile',
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
              onPress={() => navigation.navigate(item.screen)}
            >
              <View style={[styles.menuIconContainer, { backgroundColor: theme.colors.tabBarFocused }]}>
                <Ionicons name={item.icon} size={24} color={theme.isDark ? '#ffffff' : theme.colors.tabBarActive} />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={[styles.menuTitle, { color: theme.colors.text }]}>
                  {item.title}
                </Text>
                <Text style={[styles.menuSubtitle, { color: theme.colors.textSecondary }]}>
                  {item.subtitle}
                </Text>
              </View>
              <Ionicons name="chevron-forward-outline" size={20} color={theme.colors.textSecondary} />
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

export default SettingsMenuScreen;
