import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { getCurrentUser } from "../services/authService";
import {
  addCredit,
  getCredits,
  updateCredit,
  deleteCredit,
  repayCredit,
  getUserProfile,
} from "../services/firestoreService";
import IOSSpinner from "../components/IOSSpinner";

const getCurrentMonth = () => new Date().toISOString().slice(0, 7);

const AddCreditScreen = ({ navigation, route }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const user = getCurrentUser();
  const uid = user?.uid;

  const [amount, setAmount] = useState("");
  const [source, setSource] = useState("");
  const [description, setDescription] = useState("");
  const [credits, setCredits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(
    route?.params?.selectedMonth || getCurrentMonth()
  );
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!uid) return;
    getUserProfile(uid).then(setProfile).catch(() => {});
  }, [uid]);

  const currencyCode = profile?.currency || "KES";
  const fmt = (amount) => {
    const num = typeof amount === "number" ? amount : parseFloat(amount) || 0;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 2,
    }).format(num);
  };

  const isFormValid =
    amount.trim() !== "" &&
    !isNaN(parseFloat(amount)) &&
    parseFloat(amount) > 0 &&
    source.trim() !== "";

  useEffect(() => {
    if (uid) loadCredits();
  }, [uid, selectedMonth]);

  const loadCredits = async () => {
    try {
      setLoading(true);
      const data = await getCredits(uid, selectedMonth);
      setCredits(data);
    } catch (error) {
      console.error("Failed to load credits:", error);
      setCredits([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadCredits();
    } catch (error) {
      console.error(error);
    } finally {
      setRefreshing(false);
    }
  }, [uid, selectedMonth]);

  const clearForm = () => {
    setAmount("");
    setSource("");
    setDescription("");
    setEditingId(null);
  };

  const handleAddCredit = async () => {
    if (!isFormValid) return;

    setLoading(true);
    try {
      const creditData = {
        amount: parseFloat(amount),
        source: source.trim(),
        description: description.trim(),
        month: selectedMonth,
      };

      if (editingId) {
        await updateCredit(uid, editingId, creditData);
        setCredits(
          credits.map((c) => (c.id === editingId ? { ...c, ...creditData } : c))
        );
        Alert.alert("Success", "Credit updated successfully!");
      } else {
        const ref = await addCredit(uid, creditData);
        setCredits([{ id: ref.id, ...creditData, used: 0, remaining: creditData.amount }, ...credits]);
        Alert.alert("Success", "Credit added successfully!");
      }
      clearForm();
    } catch (error) {
      console.error("Error saving credit:", error);
      Alert.alert("Error", "Failed to save credit");
    } finally {
      setLoading(false);
    }
  };

  const editCredit = (credit) => {
    setAmount(credit.amount ? credit.amount.toString() : "");
    setSource(credit.source || "");
    setDescription(credit.description || "");
    setEditingId(credit.id);
  };

  const handleDeleteCredit = (id) => {
    Alert.alert("Delete Credit", "Are you sure you want to delete this credit?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteCredit(uid, id);
            setCredits(credits.filter((c) => c.id !== id));
            if (editingId === id) clearForm();
            Alert.alert("Success", "Credit deleted successfully!");
          } catch (error) {
            console.error("Error deleting credit:", error);
            Alert.alert("Error", "Failed to delete credit");
          }
        },
      },
    ]);
  };

  const handleRepay = (credit) => {
    const repayAmount = credit.remaining || 0;
    if (repayAmount <= 0) {
      Alert.alert("Info", "This credit is fully repaid.");
      return;
    }
    Alert.alert(
      "Repay Credit",
      `Repay ${fmt(repayAmount)} to clear this credit?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Repay",
          onPress: async () => {
            try {
              await repayCredit(uid, credit.id, repayAmount);
              setCredits(
                credits.map((c) =>
                  c.id === credit.id
                    ? { ...c, used: 0, remaining: c.amount }
                    : c
                )
              );
              Alert.alert("Success", "Credit repaid successfully!");
            } catch (error) {
              console.error("Error repaying credit:", error);
              Alert.alert("Error", "Failed to repay credit");
            }
          },
        },
      ]
    );
  };

  const renderCreditItem = ({ item: credit }) => {
    const usedPercent =
      credit.amount > 0 ? ((credit.used || 0) / credit.amount) * 100 : 0;
    const isFullyRepaid = (credit.remaining || 0) <= 0;

    return (
      <View
        style={[
          styles.creditItem,
          {
            backgroundColor: theme.colors.card,
            borderColor: isFullyRepaid ? theme.colors.border : "#f59e0b",
            opacity: isFullyRepaid ? 0.6 : 1,
          },
        ]}
      >
        <View style={styles.creditInfo}>
          <View style={styles.creditHeader}>
            <Text style={[styles.creditSource, { color: theme.colors.text }]}>
              {credit.source || "Credit"}
            </Text>
            <Text style={[styles.creditAmount, { color: theme.colors.text }]}>
              {fmt(credit.amount)}
            </Text>
          </View>

          <View style={styles.progressContainer}>
            <View
              style={[
                styles.progressBar,
                { backgroundColor: theme.colors.border },
              ]}
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(usedPercent, 100)}%`,
                    backgroundColor: isFullyRepaid ? "#10b981" : "#f59e0b",
                  },
                ]}
              />
            </View>
            <Text
              style={[styles.progressText, { color: theme.colors.textSecondary }]}
            >
              {fmt(credit.used || 0)} used / {fmt(credit.remaining)} remaining
            </Text>
          </View>

          {credit.description ? (
            <Text
              style={[styles.creditDescription, { color: theme.colors.textSecondary }]}
              numberOfLines={1}
            >
              {credit.description}
            </Text>
          ) : null}
        </View>

        <View style={styles.creditActions}>
          {!isFullyRepaid && (
            <TouchableOpacity
              style={[styles.actionButton, { borderColor: "#10b981" }]}
              onPress={() => handleRepay(credit)}
            >
              <Ionicons name="cash-outline" size={16} color="#10b981" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionButton, { borderColor: theme.colors.border }]}
            onPress={() => editCredit(credit)}
          >
            <Ionicons name="create-outline" size={16} color={theme.colors.tabBarActive} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { borderColor: theme.colors.border }]}
            onPress={() => handleDeleteCredit(credit.id)}
          >
            <Ionicons name="trash-outline" size={16} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.headerContainer, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity
          style={[styles.backButton, { borderColor: theme.colors.border }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          {editingId ? "Edit Credit" : "Add Credit"}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContainer,
          { paddingBottom: insets.bottom + 120 },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Add credit for {selectedMonth}. Track borrowed money or loans.
        </Text>

        {/* Amount */}
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: theme.colors.text }]}>
            Amount *
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
                color: theme.colors.text,
              },
            ]}
            placeholder="0.00"
            placeholderTextColor={theme.colors.textSecondary}
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
          />
        </View>

        {/* Source */}
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: theme.colors.text }]}>
            Source *
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
                color: theme.colors.text,
              },
            ]}
            placeholder="e.g., Bank Loan, Friend, Credit Card"
            placeholderTextColor={theme.colors.textSecondary}
            value={source}
            onChangeText={setSource}
          />
        </View>

        {/* Description */}
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: theme.colors.text }]}>
            Description
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
                color: theme.colors.text,
              },
            ]}
            placeholder="Optional note..."
            placeholderTextColor={theme.colors.textSecondary}
            value={description}
            onChangeText={setDescription}
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            {
              backgroundColor: theme.colors.tabBarActive,
              opacity: isFormValid && !loading ? 1 : 0.5,
            },
          ]}
          onPress={handleAddCredit}
          disabled={!isFormValid || loading}
        >
          {loading ? (
            <IOSSpinner size={20} color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>
              {editingId ? "Update Credit" : "Add Credit"}
            </Text>
          )}
        </TouchableOpacity>

        {/* Credits List */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Credits ({credits.length})
          </Text>
        </View>

        {credits.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="card-outline"
              size={48}
              color={theme.colors.textSecondary}
            />
            <Text
              style={[styles.emptyText, { color: theme.colors.textSecondary }]}
            >
              No credits yet. Add your first credit above.
            </Text>
          </View>
        ) : (
          credits.map((credit) => (
            <View key={credit.id}>{renderCreditItem({ item: credit })}</View>
          ))
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  placeholder: {
    width: 40,
  },
  scrollContainer: {
    paddingHorizontal: 20,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  submitButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 24,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  creditItem: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  creditInfo: {
    marginBottom: 10,
  },
  creditHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  creditSource: {
    fontSize: 15,
    fontWeight: "600",
  },
  creditAmount: {
    fontSize: 15,
    fontWeight: "700",
  },
  progressContainer: {
    marginBottom: 4,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 4,
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
  },
  creditDescription: {
    fontSize: 12,
    marginTop: 4,
  },
  creditActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
  },
});

export default AddCreditScreen;
