import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";

const ChangelogModal = ({ visible, entries, onClose }) => {
  const { theme } = useTheme();

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity activeOpacity={1} style={[styles.panel, { backgroundColor: theme.colors.card }]}>
          <View style={[styles.headerRow, { borderBottomColor: theme.colors.border }]}>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
              What's New
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.scroll}
            showsVerticalScrollIndicator={false}
          >
            {entries.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                No changelog available yet.
              </Text>
            ) : (
              entries.map((entry, idx) => (
                <View
                  key={entry.version}
                  style={[
                    styles.entry,
                    idx < entries.length - 1 && {
                      borderBottomColor: theme.colors.border,
                      borderBottomWidth: 1,
                    },
                  ]}
                >
                  <View style={styles.entryHeader}>
                    <Text style={[styles.versionText, { color: theme.colors.tabBarActive }]}>
                      v{entry.version}
                    </Text>
                    {entry.date && (
                      <Text style={[styles.dateText, { color: theme.colors.textSecondary }]}>
                        {entry.date}
                      </Text>
                    )}
                  </View>
                  {entry.title ? (
                    <Text style={[styles.entryTitle, { color: theme.colors.text }]}>
                      {entry.title}
                    </Text>
                  ) : null}
                  {Array.isArray(entry.notes) &&
                    entry.notes.map((note, i) => (
                      <View key={i} style={styles.noteRow}>
                        <View style={[styles.bullet, { backgroundColor: theme.colors.tabBarActive }]} />
                        <Text style={[styles.noteText, { color: theme.colors.textSecondary }]}>
                          {note}
                        </Text>
                      </View>
                    ))}
                </View>
              ))
            )}
          </ScrollView>
          <TouchableOpacity
            style={[styles.doneButton, { backgroundColor: theme.colors.tabBarActive }]}
            onPress={onClose}
          >
            <Text style={styles.doneButtonText}>Got it</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  panel: {
    width: "86%",
    maxWidth: 400,
    maxHeight: "75%",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  closeButton: {
    padding: 4,
  },
  scroll: {
    flexGrow: 0,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 24,
  },
  entry: {
    paddingBottom: 16,
    marginBottom: 16,
  },
  entryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  versionText: {
    fontSize: 15,
    fontWeight: "bold",
  },
  dateText: {
    fontSize: 12,
  },
  entryTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  noteRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
    marginRight: 8,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  doneButton: {
    marginTop: 16,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  doneButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default ChangelogModal;
