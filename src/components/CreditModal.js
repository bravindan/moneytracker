import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";

const CreditModal = ({
  visible,
  onClose,
  onConfirm,
  overspendAmount,
  savingsBalance,
  creditRemaining,
  currencyCode = "KES",
}) => {
  const { theme } = useTheme();
  const [useSavings, setUseSavings] = useState(false);
  const [useCredit, setUseCredit] = useState(false);
  const [savingsAmount, setSavingsAmount] = useState(0);
  const [creditAmount, setCreditAmount] = useState(0);

  const fmt = (amount) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 2,
    }).format(amount || 0);

  const hasSavings = savingsBalance > 0;
  const hasCredit = creditRemaining > 0;

  const handleConfirm = () => {
    if (!useSavings && !useCredit) {
      Alert.alert("Selection Required", "Please select at least one funding source.");
      return;
    }

    const totalSelected = (useSavings ? savingsAmount : 0) + (useCredit ? creditAmount : 0);
    if (totalSelected < overspendAmount) {
      Alert.alert("Insufficient", "Selected amounts don't cover the overspend.");
      return;
    }

    onConfirm({
      useSavings,
      useCredit,
      savingsAmount: useSavings ? savingsAmount : 0,
      creditAmount: useCredit ? creditAmount : 0,
    });

    // Reset state
    setUseSavings(false);
    setUseCredit(false);
    setSavingsAmount(0);
    setCreditAmount(0);
  };

  const handleClose = () => {
    setUseSavings(false);
    setUseCredit(false);
    setSavingsAmount(0);
    setCreditAmount(0);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.modal,
            { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
          ]}
        >
          <View style={styles.header}>
            <Ionicons name="wallet-outline" size={28} color={theme.colors.tabBarActive} />
            <Text style={[styles.title, { color: theme.colors.text }]}>
              Overspend Detected
            </Text>
          </View>

          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            You're overspending by {fmt(overspendAmount)}. Choose how to cover it:
          </Text>

          {/* Savings Option */}
          {hasSavings && (
            <TouchableOpacity
              style={[
                styles.option,
                {
                  backgroundColor: useSavings ? theme.colors.tabBarActive + "15" : theme.colors.background,
                  borderColor: useSavings ? theme.colors.tabBarActive : theme.colors.border,
                },
              ]}
              onPress={() => {
                const newUseSavings = !useSavings;
                setUseSavings(newUseSavings);
                setSavingsAmount(newUseSavings ? Math.min(overspendAmount, savingsBalance) : 0);
              }}
            >
              <View style={styles.optionLeft}>
                <View
                  style={[
                    styles.checkbox,
                    {
                      backgroundColor: useSavings ? theme.colors.tabBarActive : "transparent",
                      borderColor: useSavings ? theme.colors.tabBarActive : theme.colors.border,
                    },
                  ]}
                >
                  {useSavings && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
                <View>
                  <Text style={[styles.optionLabel, { color: theme.colors.text }]}>
                    Use Savings
                  </Text>
                  <Text style={[styles.optionBalance, { color: theme.colors.textSecondary }]}>
                    Available: {fmt(savingsBalance)}
                  </Text>
                </View>
              </View>
              <Ionicons name="wallet-outline" size={20} color={theme.colors.tabBarActive} />
            </TouchableOpacity>
          )}

          {/* Credit Option */}
          {hasCredit && (
            <TouchableOpacity
              style={[
                styles.option,
                {
                  backgroundColor: useCredit ? "#f59e0b15" : theme.colors.background,
                  borderColor: useCredit ? "#f59e0b" : theme.colors.border,
                },
              ]}
              onPress={() => {
                const newUseCredit = !useCredit;
                setUseCredit(newUseCredit);
                setCreditAmount(newUseCredit ? Math.min(overspendAmount, creditRemaining) : 0);
              }}
            >
              <View style={styles.optionLeft}>
                <View
                  style={[
                    styles.checkbox,
                    {
                      backgroundColor: useCredit ? "#f59e0b" : "transparent",
                      borderColor: useCredit ? "#f59e0b" : theme.colors.border,
                    },
                  ]}
                >
                  {useCredit && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
                <View>
                  <Text style={[styles.optionLabel, { color: theme.colors.text }]}>
                    Use Credit
                  </Text>
                  <Text style={[styles.optionBalance, { color: theme.colors.textSecondary }]}>
                    Available: {fmt(creditRemaining)}
                  </Text>
                </View>
              </View>
              <Ionicons name="card-outline" size={20} color="#f59e0b" />
            </TouchableOpacity>
          )}

          {!hasSavings && !hasCredit && (
            <View style={[styles.noOptions, { backgroundColor: theme.colors.background }]}>
              <Ionicons name="alert-circle-outline" size={24} color={theme.colors.textSecondary} />
              <Text style={[styles.noOptionsText, { color: theme.colors.textSecondary }]}>
                No savings or credit available. Add credit first.
              </Text>
            </View>
          )}

          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { borderColor: theme.colors.border }]}
              onPress={handleClose}
            >
              <Text style={[styles.buttonText, { color: theme.colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                styles.confirmButton,
                {
                  backgroundColor: theme.colors.tabBarActive,
                  opacity: (!useSavings && !useCredit) ? 0.5 : 1,
                },
              ]}
              onPress={handleConfirm}
              disabled={!useSavings && !useCredit}
            >
              <Text style={[styles.buttonText, { color: "#fff" }]}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modal: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 10,
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  optionBalance: {
    fontSize: 12,
    marginTop: 2,
  },
  noOptions: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    gap: 10,
  },
  noOptionsText: {
    fontSize: 14,
    flex: 1,
  },
  buttons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  cancelButton: {
    borderWidth: 1,
  },
  confirmButton: {},
  buttonText: {
    fontSize: 15,
    fontWeight: "600",
  },
});

export default CreditModal;
