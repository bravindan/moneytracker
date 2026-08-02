import React from "react";
import { View, Text, TouchableOpacity, Modal, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";

const MonthPickerModal = ({
  visible,
  selectedMonth,
  pickerYear,
  onChangeYear,
  onSelectMonth,
  onClose,
}) => {
  const { theme } = useTheme();

  const selectMonth = (year, monthIndex) => {
    const month = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
    if (selectedMonth !== month) {
      onSelectMonth(month);
    }
    onClose();
  };

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
        <TouchableOpacity
          activeOpacity={1}
          style={[styles.panel, { backgroundColor: theme.colors.card }]}
        >
          <View style={styles.yearRow}>
            <TouchableOpacity
              onPress={() => onChangeYear(pickerYear - 1)}
              style={styles.yearButton}
            >
              <Ionicons
                name="chevron-back"
                size={24}
                color={theme.colors.text}
              />
            </TouchableOpacity>
            <Text
              style={[styles.yearText, { color: theme.colors.text }]}
            >
              {pickerYear}
            </Text>
            <TouchableOpacity
              onPress={() => onChangeYear(pickerYear + 1)}
              style={styles.yearButton}
            >
              <Ionicons
                name="chevron-forward"
                size={24}
                color={theme.colors.text}
              />
            </TouchableOpacity>
          </View>
          <View style={styles.grid}>
            {Array.from({ length: 12 }).map((_, i) => {
              const month = `${pickerYear}-${String(i + 1).padStart(2, "0")}`;
              const isSelected = selectedMonth === month;
              return (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.monthCell,
                    {
                      backgroundColor: isSelected
                        ? theme.colors.tabBarActive
                        : theme.colors.background,
                    },
                  ]}
                  onPress={() => selectMonth(pickerYear, i)}
                >
                  <Text
                    style={{
                      color: isSelected ? "#fff" : theme.colors.text,
                      fontWeight: isSelected ? "bold" : "normal",
                    }}
                  >
                    {new Date(2000, i).toLocaleString("default", {
                      month: "short",
                    })}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
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
    width: "80%",
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  yearRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  yearButton: {
    padding: 10,
  },
  yearText: {
    fontSize: 20,
    fontWeight: "bold",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  monthCell: {
    width: "30%",
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    borderRadius: 8,
  },
});

export default MonthPickerModal;
