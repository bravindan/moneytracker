import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import IOSSpinner from "../components/IOSSpinner";
import * as Updates from "expo-updates";

const APP_VERSION = "3.0.0";

const AboutScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [checking, setChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  const checkForUpdates = async () => {
    setChecking(true);
    setUpdateAvailable(false);
    try {
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        setUpdateAvailable(true);
        Alert.alert(
          "Update Available",
          "A new version is available. Would you like to download and install it now?",
          [
            { text: "Later", style: "cancel" },
            {
              text: "Update Now",
              onPress: async () => {
                setChecking(true);
                try {
                  await Updates.fetchUpdateAsync();
                  await Updates.reloadAsync();
                } catch (error) {
                  console.error("Failed to apply update:", error);
                  Alert.alert("Error", "Failed to apply update. Please try again.");
                }
              },
            },
          ]
        );
      } else {
        setUpdateAvailable(false);
        Alert.alert("Up to Date", "You are running the latest version.");
      }
      setLastChecked(new Date().toLocaleString());
    } catch (error) {
      console.error("Failed to check for updates:", error);
      Alert.alert("Error", "Failed to check for updates. Please try again.");
    } finally {
      setChecking(false);
    }
  };

  const menuItems = [
    {
      title: "Check for Updates",
      subtitle: checking
        ? "Checking..."
        : lastChecked
          ? `Last checked: ${lastChecked}`
          : "Tap to check for updates",
      icon: "sync-outline",
      onPress: checkForUpdates,
    },
    {
      title: "App Version",
      subtitle: `Version ${APP_VERSION}`,
      icon: "information-circle-outline",
    },
    {
      title: "Privacy Policy",
      subtitle: "Read our privacy policy",
      icon: "document-text-outline",
      onPress: () => Linking.openURL("https://your-privacy-policy-url.com"),
    },
    {
      title: "Terms of Service",
      subtitle: "Read our terms of service",
      icon: "document-outline",
      onPress: () => Linking.openURL("https://your-terms-url.com"),
    },
  ];

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background, paddingTop: insets.top },
      ]}
    >
      <View style={[styles.headerContainer, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.tabBarActive} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          About
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          App information and updates
        </Text>

        {/* Check for Updates Card */}
        <TouchableOpacity
          style={[
            styles.updateCard,
            {
              backgroundColor: updateAvailable ? "#052e16" : theme.colors.card,
              borderColor: updateAvailable ? "#16a34a" : theme.colors.border,
            },
          ]}
          onPress={checkForUpdates}
          disabled={checking}
        >
          <View style={styles.updateRow}>
            <View style={styles.updateLeft}>
              <Ionicons
                name={updateAvailable ? "cloud-download-outline" : "checkmark-circle-outline"}
                size={28}
                color={updateAvailable ? "#16a34a" : theme.colors.tabBarActive}
              />
              <View style={{ marginLeft: 12 }}>
                <Text style={[styles.updateTitle, { color: theme.colors.text }]}>
                  {checking ? "Checking for updates..." : updateAvailable ? "Update Available" : "You're up to date"}
                </Text>
                <Text style={[styles.updateSubtitle, { color: theme.colors.textSecondary }]}>
                  {checking ? "Please wait" : updateAvailable ? "Tap to update now" : `Version ${APP_VERSION}`}
                </Text>
              </View>
            </View>
            {checking ? (
              <IOSSpinner size={24} color={theme.colors.tabBarActive} />
            ) : (
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
            )}
          </View>
        </TouchableOpacity>

        {/* Other Menu Items */}
        <View style={[styles.menuList, { backgroundColor: theme.colors.card }]}>
          {menuItems.slice(1).map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.menuItem, { borderBottomColor: theme.colors.border }]}
              onPress={item.onPress}
              disabled={!item.onPress}
            >
              <View style={[styles.menuIconContainer, { backgroundColor: theme.colors.tabBarFocused }]}>
                <Ionicons name={item.icon} size={20} color={theme.isDark ? "#ffffff" : theme.colors.tabBarActive} />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={[styles.menuTitle, { color: theme.colors.text }]}>
                  {item.title}
                </Text>
                <Text style={[styles.menuSubtitle, { color: theme.colors.textSecondary }]}>
                  {item.subtitle}
                </Text>
              </View>
              {item.onPress && (
                <Ionicons name="chevron-forward-outline" size={18} color={theme.colors.textSecondary} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Footer */}
        <Text style={[styles.footer, { color: theme.colors.textSecondary }]}>
          MoneyTracker - Your Personal Finance Companion
        </Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: { fontSize: 17, fontWeight: "600" },
  scrollContainer: { padding: 20, paddingBottom: 100 },
  subtitle: { fontSize: 14, marginBottom: 24, textAlign: "center" },
  updateCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  updateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  updateLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  updateTitle: { fontSize: 16, fontWeight: "600", marginBottom: 2 },
  updateSubtitle: { fontSize: 12 },
  menuList: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 20,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  menuTextContainer: { flex: 1 },
  menuTitle: { fontSize: 15, fontWeight: "500", marginBottom: 2 },
  menuSubtitle: { fontSize: 12 },
  footer: { fontSize: 12, textAlign: "center", marginTop: 20 },
});

export default AboutScreen;
