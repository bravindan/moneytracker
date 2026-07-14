import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { getCurrentUser } from "../services/authService";
import {
  getUserProfile,
  updateUserProfile,
} from "../services/firestoreService";
import * as Notifications from "expo-notifications";

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const REMINDER_INTERVALS = [
  { label: "Every Hour", value: 60, icon: "time-outline" },
  { label: "Every 2 Hours", value: 120, icon: "time-outline" },
  { label: "Every 4 Hours", value: 240, icon: "time-outline" },
  { label: "Every 6 Hours", value: 360, icon: "time-outline" },
  { label: "Every 8 Hours", value: 480, icon: "time-outline" },
  { label: "Twice a Day", value: 720, icon: "time-outline" },
  { label: "Once a Day", value: 1440, icon: "time-outline" },
];

const REMINDER_MESSAGES = [
  "Don't forget to log your expenses for today!",
  "Keep your finances on track — log your spending now.",
  "Quick check: Have you recorded today's transactions?",
  "Stay on top of your budget — log your expenses!",
  "Time to update your financial records.",
  "Your budget is waiting — log your spending!",
  "Don't let expenses slip through — record them now.",
];

const NotificationsScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const user = getCurrentUser();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [selectedInterval, setSelectedInterval] = useState(360); // Default 6 hours
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const profile = await getUserProfile(user.uid);
      if (profile?.notifications) {
        setNotificationsEnabled(profile.notifications.enabled || false);
        setSelectedInterval(profile.notifications.interval || 360);
      }
      // Check system permission status
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== "granted") {
        setNotificationsEnabled(false);
      }
    } catch (error) {
      console.error("Failed to load notification settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const requestPermission = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Please enable notifications in your device settings to receive spending reminders.",
        [{ text: "OK" }]
      );
      return false;
    }
    return true;
  };

  const scheduleNotifications = async (intervalMinutes) => {
    // Cancel all existing scheduled notifications
    await Notifications.cancelAllScheduledNotificationsAsync();

    const messages = REMINDER_MESSAGES;

    // Schedule recurring notifications
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "MoneyTracker Reminder",
        body: messages[Math.floor(Math.random() * messages.length)],
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        interval: intervalMinutes * 60,
      },
    });
  };

  const toggleNotifications = async (value) => {
    if (value) {
      const hasPermission = await requestPermission();
      if (!hasPermission) return;

      setNotificationsEnabled(true);
      await scheduleNotifications(selectedInterval);
      await saveSettings(true, selectedInterval);
      Alert.alert(
        "Notifications Enabled",
        `You'll receive reminders every ${getIntervalLabel(selectedInterval).toLowerCase()}.`
      );
    } else {
      setNotificationsEnabled(false);
      await Notifications.cancelAllScheduledNotificationsAsync();
      await saveSettings(false, selectedInterval);
    }
  };

  const changeInterval = async (interval) => {
    setSelectedInterval(interval);
    if (notificationsEnabled) {
      await scheduleNotifications(interval);
    }
    await saveSettings(notificationsEnabled, interval);
  };

  const saveSettings = async (enabled, interval) => {
    try {
      await updateUserProfile(user.uid, {
        notifications: { enabled, interval },
      });
    } catch (error) {
      console.error("Failed to save notification settings:", error);
    }
  };

  const getIntervalLabel = (value) => {
    const found = REMINDER_INTERVALS.find((i) => i.value === value);
    return found ? found.label : "Custom";
  };

  const sendTestNotification = async () => {
    const hasPermission = await requestPermission();
    if (!hasPermission) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "MoneyTracker Test",
        body: "Notifications are working! You'll receive reminders at your configured interval.",
        sound: true,
      },
      trigger: null, // Immediate
    });
  };

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
          Notifications
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Configure spending reminders to stay on track with your budget.
        </Text>

        {/* Main Toggle */}
        <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons
                name="notifications-outline"
                size={24}
                color={theme.colors.tabBarActive}
                style={{ marginRight: 12 }}
              />
              <View>
                <Text style={[styles.rowTitle, { color: theme.colors.text }]}>
                  Spending Reminders
                </Text>
                <Text style={[styles.rowSubtitle, { color: theme.colors.textSecondary }]}>
                  Get reminded to log your expenses
                </Text>
              </View>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={toggleNotifications}
              trackColor={{ false: theme.colors.border, true: theme.colors.tabBarActive + "60" }}
              thumbColor={notificationsEnabled ? theme.colors.tabBarActive : "#f4f3f4"}
            />
          </View>
        </View>

        {/* Interval Selection */}
        {notificationsEnabled && (
          <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Reminder Frequency
            </Text>
            {REMINDER_INTERVALS.map((interval) => (
              <TouchableOpacity
                key={interval.value}
                style={[
                  styles.intervalItem,
                  { borderBottomColor: theme.colors.border },
                  selectedInterval === interval.value && {
                    backgroundColor: theme.colors.tabBarActive + "10",
                  },
                ]}
                onPress={() => changeInterval(interval.value)}
              >
                <Ionicons
                  name={interval.icon}
                  size={20}
                  color={
                    selectedInterval === interval.value
                      ? theme.colors.tabBarActive
                      : theme.colors.textSecondary
                  }
                  style={{ marginRight: 12 }}
                />
                <Text
                  style={[
                    styles.intervalText,
                    {
                      color:
                        selectedInterval === interval.value
                          ? theme.colors.tabBarActive
                          : theme.colors.text,
                      fontWeight: selectedInterval === interval.value ? "600" : "400",
                    },
                  ]}
                >
                  {interval.label}
                </Text>
                {selectedInterval === interval.value && (
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={theme.colors.tabBarActive}
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Test Notification */}
        {notificationsEnabled && (
          <TouchableOpacity
            style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
            onPress={sendTestNotification}
          >
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Ionicons
                  name="flash-outline"
                  size={24}
                  color="#f59e0b"
                  style={{ marginRight: 12 }}
                />
                <View>
                  <Text style={[styles.rowTitle, { color: theme.colors.text }]}>
                    Send Test Notification
                  </Text>
                  <Text style={[styles.rowSubtitle, { color: theme.colors.textSecondary }]}>
                    Verify notifications are working
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward-outline" size={20} color={theme.colors.textSecondary} />
            </View>
          </TouchableOpacity>
        )}

        {/* Info */}
        <View style={[styles.infoCard, { backgroundColor: theme.colors.tabBarActive + "10", borderColor: theme.colors.tabBarActive + "30" }]}>
          <Ionicons name="information-circle-outline" size={20} color={theme.colors.tabBarActive} style={{ marginRight: 8 }} />
          <Text style={[styles.infoText, { color: theme.colors.text }]}>
            Reminders help you stay consistent with logging expenses. You can disable them at any time.
          </Text>
        </View>
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
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 17, fontWeight: "600" },
  scrollContainer: { padding: 20, paddingBottom: 100 },
  subtitle: { fontSize: 14, marginBottom: 24, textAlign: "center" },
  card: {
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  rowTitle: { fontSize: 16, fontWeight: "600", marginBottom: 2 },
  rowSubtitle: { fontSize: 12 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    padding: 16,
    paddingBottom: 8,
  },
  intervalItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  intervalText: { flex: 1, fontSize: 15 },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  infoText: { fontSize: 13, lineHeight: 18, flex: 1 },
});

export default NotificationsScreen;
