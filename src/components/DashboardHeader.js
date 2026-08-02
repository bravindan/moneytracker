import React from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";

// Strip the cache-busting query param — file:// URIs with a query string
// fail to render on Android (esp. after a reload like the month switch).
const cleanImageUri = (uri) => (uri ? uri.split("?")[0] : null);

const DashboardHeader = ({
  displayName,
  profileImageUri,
  selectedMonth,
  autoMonthSwitch,
  hasRecord,
  onChangeMonth,
  onOpenMonthPicker,
  onToggleAutoMonthSwitch,
  onOpenRecordMenu,
  onLogout,
  onOpenProfile,
}) => {
  const { theme } = useTheme();
  const imageUri = cleanImageUri(profileImageUri);

  return (
    <View style={[styles.headerContainer, { backgroundColor: theme.colors.card }]}>
      <View style={styles.headerRow}>
        <View style={styles.userInfo}>
          <View style={styles.userHeader}>
            <TouchableOpacity onPress={onOpenProfile}>
              <View
                style={[
                  styles.profilePhotoPlaceholder,
                  { backgroundColor: theme.colors.tabBarActive },
                ]}
              >
                {imageUri ? (
                  <Image source={{ uri: imageUri }} style={styles.profileImage} />
                ) : (
                  <Text style={{ color: "#fff", fontSize: 20, fontWeight: "bold" }}>
                    {displayName ? displayName.charAt(0).toUpperCase() : "?"}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
            <View style={styles.userText}>
              <Text
                style={[
                  styles.headerWelcome,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Welcome back 👋
              </Text>
              <Text style={[styles.headerName, { color: theme.colors.text }]}>
                {displayName}
              </Text>
            </View>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.signOutButton, { borderColor: theme.colors.border }]}
          onPress={onLogout}
        >
          <Ionicons name="log-out-outline" size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>
      <Text
        style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}
      >
        Monthly Financial Overview
      </Text>
      <View style={styles.monthPickerContainer}>
        <TouchableOpacity
          style={[
            styles.monthButton,
            { backgroundColor: theme.colors.tabBarActive },
          ]}
          onPress={() => onChangeMonth(-1)}
        >
          <Text style={[styles.monthButtonText, { color: "#ffffff" }]}>‹</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onOpenMonthPicker}
          style={{ paddingHorizontal: 10, paddingVertical: 4 }}
        >
          <Text style={[styles.monthText, { color: theme.colors.text }]}>
            {selectedMonth} ▾
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.monthButton,
            { backgroundColor: theme.colors.tabBarActive },
          ]}
          onPress={() => onChangeMonth(1)}
        >
          <Text style={[styles.monthButtonText, { color: "#ffffff" }]}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onToggleAutoMonthSwitch}
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginLeft: 8,
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 8,
            backgroundColor: autoMonthSwitch
              ? theme.colors.tabBarActive + "20"
              : "transparent",
          }}
        >
          <View
            style={{
              width: 36,
              height: 20,
              borderRadius: 10,
              backgroundColor: autoMonthSwitch
                ? theme.colors.tabBarActive
                : theme.colors.border,
              justifyContent: "center",
              paddingHorizontal: 2,
            }}
          >
            <View
              style={{
                width: 16,
                height: 16,
                borderRadius: 8,
                backgroundColor: "#fff",
                alignSelf: autoMonthSwitch ? "flex-end" : "flex-start",
              }}
            />
          </View>
          <Ionicons
            name="sync-outline"
            size={14}
            color={
              autoMonthSwitch
                ? theme.colors.tabBarActive
                : theme.colors.textSecondary
            }
            style={{ marginLeft: 4 }}
          />
        </TouchableOpacity>
        {hasRecord && (
          <TouchableOpacity
            style={[styles.recordMenuButton, { borderColor: theme.colors.border }]}
            onPress={onOpenRecordMenu}
          >
            <Ionicons
              name="ellipsis-vertical"
              size={18}
              color={theme.colors.text}
            />
          </TouchableOpacity>
        )}
      </View>
      <Text
        style={{
          fontSize: 11,
          color: theme.colors.textSecondary,
          textAlign: "center",
          marginTop: 4,
        }}
      >
        {autoMonthSwitch
          ? "Auto-switch ON — app opens to current month"
          : "Auto-switch OFF — stays on selected month"}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  userInfo: {
    flex: 1,
  },
  userHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  profilePhotoPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    overflow: "hidden",
  },
  userText: {
    flex: 1,
  },
  headerWelcome: {
    fontSize: 12,
    marginBottom: 2,
  },
  headerName: {
    fontSize: 20,
    fontWeight: "bold",
  },
  signOutButton: {
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 8,
  },
  monthPickerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    paddingHorizontal: 4,
  },
  monthText: {
    fontSize: 14,
    fontWeight: "600",
  },
  monthButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  monthButtonText: {
    fontWeight: "600",
  },
  recordMenuButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
});

export default DashboardHeader;
