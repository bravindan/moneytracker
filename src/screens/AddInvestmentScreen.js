import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import IOSSpinner from "../components/IOSSpinner";
import { useTheme } from "../contexts/ThemeContext";
import { getCurrentUser } from "../services/authService";
import {
  addInvestment,
  getInvestments,
  updateInvestment,
  deleteInvestment,
  getMonthlySummary,
  getSpending,
  getUserProfile,
  getWallets,
  ensureDefaultWallets,
  useCreditAmount,
} from "../services/firestoreService";

const getCurrentMonth = () => new Date().toISOString().slice(0, 7);

const AddInvestmentScreen = ({ navigation, route }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [platform, setPlatform] = useState("");
  const [amount, setAmount] = useState("");
  const [transactionCosts, setTransactionCosts] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(
    route?.params?.selectedMonth || getCurrentMonth(),
  ); // YYYY-MM format;
  const [allocatedAmount, setAllocatedAmount] = useState(0);
  // Wallet selection ("Paid From")
  const [wallets, setWallets] = useState([]);
  const [selectedWalletId, setSelectedWalletId] = useState(null);
  const [showWalletPicker, setShowWalletPicker] = useState(false);
  const [monthlySummary, setMonthlySummary] = useState(null);
  const [monthSpending, setMonthSpending] = useState([]);

  const user = getCurrentUser();
  const uid = user?.uid;
  const [profile, setProfile] = useState(null);

  // Fetch profile for currency
  useEffect(() => {
    if (!uid) return;
    getUserProfile(uid).then(setProfile).catch(() => {});
    (async () => {
      try {
        await ensureDefaultWallets(uid);
        const all = await getWallets(uid);
        setWallets(all || []);
      } catch (error) {
        console.error("Failed to load wallets:", error);
      }
    })();
  }, [uid]);

  const currencyCode = profile?.currency || "KES";
  const fmt = (amount) => {
    const num = typeof amount === "number" ? amount : parseFloat(amount) || 0;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const [pendingBalance, setPendingBalance] = useState(0);

  // Available balance per wallet for the selected month:
  // asset: funded (from monthly summary walletFunding) − spent (from month spending)
  // credit: remaining
  const walletBalances = (() => {
    const walletList = wallets || [];
    const fundingMap = {};
    (monthlySummary?.walletFunding || []).forEach((f) => {
      fundingMap[f.walletId] = f.amount || 0;
    });
    const walletIds = new Set(walletList.map((w) => w.id));
    const spentByWallet = {};
    (monthSpending || []).forEach((s) => {
      if (!s.walletId || !walletIds.has(s.walletId)) return;
      spentByWallet[s.walletId] =
        (spentByWallet[s.walletId] || 0) + (s.totalSpending || s.amount || 0);
    });
    const balances = {};
    walletList.forEach((w) => {
      if (w.type === "credit") {
        balances[w.id] = w.remaining || 0;
      } else {
        balances[w.id] = (fundingMap[w.id] || 0) - (spentByWallet[w.id] || 0);
      }
    });
    return balances;
  })();

  // Load investments data from database
  useEffect(() => {
    if (uid) {
      loadInvestments();
      loadMonthlyData();
    }
  }, [uid, selectedMonth]);

  const loadMonthlyData = async () => {
    try {
      const monthlyData = await getMonthlySummary(uid, selectedMonth);
      const spending = await getSpending(uid, selectedMonth);

      setMonthlySummary(monthlyData || null);
      setMonthSpending(spending || []);

      const income = monthlyData?.income || 0;
      const expensesAmount = monthlyData?.expensesAmount || 0;
      const investmentAllocated = monthlyData?.investmentAmount || 0;

      setAllocatedAmount(investmentAllocated);

      // Balance = income - expenses allocation - investment allocation
      const balance = income - expensesAmount - investmentAllocated;

      setPendingBalance(balance > 0 ? balance : 0);
    } catch (error) {
      console.error("Failed to load monthly data:", error);
      setAllocatedAmount(0);
      setPendingBalance(0);
    }
  };

  const loadInvestments = async () => {
    try {
      const data = await getInvestments(uid, selectedMonth);
      const sorted = (data || []).sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return dateB - dateA;
      });
      setInvestments(sorted);
    } catch (error) {
      console.error("Failed to load investments:", error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadInvestments(), loadMonthlyData()]);
    setRefreshing(false);
  }, [uid, selectedMonth]);

  const resetForm = () => {
    setPlatform("");
    setAmount("");
    setTransactionCosts("");
    setDescription("");
    setCategory("");
    setSelectedWalletId(null);
    setEditingId(null);
  };

  const handleAddInvestment = async () => {
    if (!category.trim() || !platform.trim() || !amount.trim()) {
      Alert.alert("Error", "Please fill in category, platform name and amount");
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }

    const transactionCostNum = parseFloat(transactionCosts) || 0;
    if (transactionCostNum < 0) {
      Alert.alert("Error", "Transaction cost cannot be negative");
      return;
    }

    const wallet = (wallets || []).find((w) => w.id === selectedWalletId) || null;
    if (!wallet) {
      Alert.alert("Required", "Please select the account you're investing from.");
      return;
    }

    const total = amountNum + transactionCostNum;
    // Warn but allow: exceeding an asset wallet's available balance.
    if (wallet.type === "asset" && !editingId && total > (walletBalances[wallet.id] || 0)) {
      Alert.alert(
        "Insufficient Balance",
        `This investment (${fmt(total)}) is more than your ${wallet.name} available balance (${fmt(walletBalances[wallet.id] || 0)}). You can still record it, but the balance will go negative.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Record Anyway", onPress: () => saveInvestment(wallet, amountNum, transactionCostNum) },
        ],
      );
      return;
    }
    // Warn if a credit wallet would exceed its remaining limit.
    if (wallet.type === "credit" && !editingId && total > (wallet.remaining || 0)) {
      Alert.alert(
        "Exceeds Credit Limit",
        `This investment (${fmt(total)}) is more than your remaining credit (${fmt(wallet.remaining || 0)}). You can still record it, but you'll exceed the limit.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Record Anyway", onPress: () => saveInvestment(wallet, amountNum, transactionCostNum) },
        ],
      );
      return;
    }
    saveInvestment(wallet, amountNum, transactionCostNum);
  };

  const saveInvestment = async (wallet, amountNum, transactionCostNum) => {
    setLoading(true);
    try {
      if (!uid) throw new Error("User not authenticated");
      // Reduce credit wallet usage if investing from a credit account
      if (wallet.type === "credit" && !editingId) {
        try {
          await useCreditAmount(uid, wallet.id, amountNum + transactionCostNum);
        } catch (error) {
          console.error("Failed to update credit usage:", error);
        }
      }
      if (editingId) {
        await updateInvestment(uid, editingId, {
          category: category.trim(),
          platform: platform.trim(),
          amount: amountNum,
          transactionCosts: transactionCostNum,
          totalInvestment: amountNum + transactionCostNum,
          description: description.trim(),
          month: selectedMonth,
          walletId: wallet.id,
          walletType: wallet.type,
        });
        Alert.alert("Success", "Investment updated successfully!");
      } else {
        await addInvestment(uid, {
          category: category.trim(),
          platform: platform.trim(),
          amount: amountNum,
          transactionCosts: transactionCostNum,
          totalInvestment: amountNum + transactionCostNum,
          description: description.trim(),
          month: selectedMonth,
          walletId: wallet.id,
          walletType: wallet.type,
        });
        Alert.alert("Success", "Investment added successfully!");
      }
    } catch (error) {
      console.error("Failed to save investment:", error);
      Alert.alert("Error", "Failed to save investment");
    } finally {
      setLoading(false);
    }

    // Refresh the list and allocation totals after a successful save.
    // Kept outside the try/catch so a refresh failure never masks a
    // successful save with an error alert.
    try {
      resetForm();
      await Promise.all([loadInvestments(), loadMonthlyData()]);
    } catch (error) {
      console.error("Failed to refresh investments after save:", error);
    }
  };

  const handleEdit = (investment) => {
    setCategory(investment.category || "");
    setPlatform(investment.platform);
    setAmount(investment.amount.toString());
    setTransactionCosts((investment.transactionCosts || 0).toString());
    setDescription(investment.description || "");
    setSelectedWalletId(investment.walletId || null);
    setEditingId(investment.id);
  };

  const handleDelete = async (id) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this investment?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteInvestment(uid, id);
              Alert.alert("Success", "Investment deleted successfully!");
              await loadInvestments();
              await loadMonthlyData();
            } catch (error) {
              console.error("Failed to delete investment:", error);
              Alert.alert("Error", "Failed to delete investment");
            }
          },
        },
      ],
    );
  };

  const handleClearAll = () => {
    Alert.alert(
      "Confirm Clear",
      "Are you sure you want to clear all investments?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            try {
              for (const investment of investments) {
                await deleteInvestment(uid, investment.id);
              }
              Alert.alert("Success", "All investments cleared!");
              await loadInvestments();
              await loadMonthlyData();
            } catch (error) {
              console.error("Failed to clear investments:", error);
              Alert.alert("Error", "Failed to clear investments");
            }
          },
        },
      ],
    );
  };

  const renderInvestment = ({ item }) => (
    <View
      style={[
        styles.investmentItem,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <View style={styles.investmentInfo}>
        <View style={styles.investmentHeader}>
          <Text style={[styles.platformName, { color: theme.colors.text }]}>
            {item.category}
          </Text>
          <Text style={[styles.platformName, { color: theme.colors.text }]}>
            • {item.platform}
          </Text>
          <Text style={[styles.investmentAmount, { color: theme.colors.text }]}>
            {fmt(item.amount)}
          </Text>
        </View>
        <View style={styles.investmentDetails}>
          <Text
            style={[
              styles.percentageText,
              { color: theme.colors.textSecondary },
            ]}
          >
            {getInvestmentPercentage(
              item.totalInvestment ||
                item.amount + (item.transactionCosts || 0),
            )}
            % of allocated
          </Text>
          <Text
            style={[
              styles.investmentDescription,
              { color: theme.colors.textSecondary },
            ]}
          >
            Transaction Cost: {fmt(item.transactionCosts || 0)}
          </Text>
          {item.description && (
            <Text
              style={[
                styles.investmentDescription,
                { color: theme.colors.textSecondary },
              ]}
            >
              {item.description}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.investmentActions}>
        <TouchableOpacity
          style={[styles.actionButton, { borderColor: theme.colors.border }]}
          onPress={() => handleEdit(item)}
        >
          <Ionicons
            name="create-outline"
            size={16}
            color={theme.colors.tabBarActive}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { borderColor: theme.colors.border }]}
          onPress={() => handleDelete(item.id)}
        >
          <Ionicons name="trash-outline" size={16} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0);
  const totalTransactionCosts = investments.reduce(
    (sum, inv) => sum + (inv.transactionCosts || 0),
    0,
  );
  const totalOutlay = investments.reduce(
    (sum, inv) =>
      sum + (inv.totalInvestment || inv.amount + (inv.transactionCosts || 0)),
    0,
  );

  // Calculate percentage for each investment
  const getInvestmentPercentage = (amount) => {
    if (allocatedAmount <= 0) return 0;
    return ((amount / allocatedAmount) * 100).toFixed(1);
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background, paddingTop: insets.top },
      ]}
    >
      <StatusBar style="auto" />

      {/* Header */}
      <View
        style={[
          styles.headerContainer,
          { borderBottomColor: theme.colors.border },
        ]}
      >
        <TouchableOpacity
          style={[styles.backButton, { borderColor: theme.colors.border }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons
            name="chevron-back"
            size={20}
            color={theme.colors.tabBarActive}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Add Investments
        </Text>
        <View style={styles.placeholder} />
      </View>

      <KeyboardAvoidingView
        style={styles.mainContainer}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : Platform.OS === "android"
              ? "height"
              : undefined
        }
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContainer,
            { paddingBottom: insets.bottom + 140 },
          ]}
          scrollEnabled={true}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.tabBarActive]} progressBackgroundColor={theme.colors.card} tintColor={theme.colors.tabBarActive} />
          }
        >
          {/* Add Investment Form */}
          <View
            style={[
              styles.formContainer,
              { backgroundColor: theme.colors.card },
            ]}
          >
            {/* Allocated Amount Indicator */}
            <View
              style={[
                styles.allocatedAmountContainer,
                {
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <View style={styles.summaryRow}>
                <View style={{ flex: 1, alignItems: "center" }}>
                  <Text
                    style={[styles.allocatedAmountLabel, { color: theme.colors.textSecondary }]}
                  >
                    Allocated
                  </Text>
                  <Text
                    style={[styles.allocatedAmountValue, { color: theme.colors.tabBarActive }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {fmt(allocatedAmount)}
                  </Text>
                </View>
                <View
                  style={{
                    width: 1,
                    backgroundColor: theme.colors.border,
                    marginVertical: 4,
                  }}
                />
                <View style={{ flex: 1, alignItems: "center" }}>
                  <Text
                    style={[styles.allocatedAmountLabel, { color: theme.colors.textSecondary }]}
                  >
                    Outlay
                  </Text>
                  <Text
                    style={[styles.allocatedAmountValue, { color: theme.colors.text }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {fmt(totalOutlay)}
                  </Text>
                </View>
                <View
                  style={{
                    width: 1,
                    backgroundColor: theme.colors.border,
                    marginVertical: 4,
                  }}
                />
                <View style={{ flex: 1, alignItems: "center" }}>
                  <Text
                    style={[styles.allocatedAmountLabel, { color: theme.colors.textSecondary }]}
                  >
                    Balance
                  </Text>
                  <Text
                    style={[
                      styles.allocatedAmountValue,
                      {
                        color:
                          allocatedAmount - totalOutlay > 0
                            ? theme.colors.tabBarActive
                            : "#ef4444",
                      },
                    ]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {fmt(Math.max(allocatedAmount - totalOutlay, 0))}
                  </Text>
                </View>
              </View>
            </View>

            <Text style={[styles.formTitle, { color: theme.colors.text }]}>
              {editingId ? "Edit Investment" : "Add New Investment"}
            </Text>

            <View style={styles.inputGroup}>
              <Text
                style={[styles.label, { color: theme.colors.textSecondary }]}
              >
                Category *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                  },
                ]}
                placeholder="Type category name..."
                placeholderTextColor={theme.colors.textSecondary}
                value={category}
                onChangeText={setCategory}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text
                style={[styles.label, { color: theme.colors.textSecondary }]}
              >
                Platform *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                  },
                ]}
                placeholder="Enter platform name"
                placeholderTextColor={theme.colors.textSecondary}
                value={platform}
                onChangeText={setPlatform}
              />
            </View>

            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 0.7 }}>
                <Text
                  style={[styles.label, { color: theme.colors.textSecondary }]}
                >
                  Amount ({currencyCode}) *
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.colors.background,
                      borderColor: theme.colors.border,
                      color: theme.colors.text,
                    },
                  ]}
                  placeholder="Enter amount"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 0.3 }}>
                <Text
                  style={[styles.label, { color: theme.colors.textSecondary }]}
                >
                  Txn Cost ({currencyCode})
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.colors.background,
                      borderColor: theme.colors.border,
                      color: theme.colors.text,
                    },
                  ]}
                  placeholder="0.00"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={transactionCosts}
                  onChangeText={setTransactionCosts}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text
                style={[styles.label, { color: theme.colors.textSecondary }]}
              >
                Paid From:
              </Text>
              <TouchableOpacity
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.border,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  },
                ]}
                onPress={() => setShowWalletPicker(true)}
              >
                <Text style={{ color: theme.colors.text }}>
                  {(wallets || []).find((w) => w.id === selectedWalletId)?.name || "Select account"}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={16}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text
                style={[styles.label, { color: theme.colors.textSecondary }]}
              >
                Description
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                  },
                ]}
                placeholder="Enter description (optional)"
                placeholderTextColor={theme.colors.textSecondary}
                value={description}
                onChangeText={setDescription}
                multiline
              />
            </View>

            <TouchableOpacity
              style={[
                styles.addButton,
                {
                  backgroundColor: loading
                    ? theme.colors.textSecondary
                    : theme.colors.tabBarActive,
                },
              ]}
              onPress={handleAddInvestment}
              disabled={loading}
            >
              {loading ? (
                <IOSSpinner size={18} color="#fff" />
              ) : (
                <Text style={styles.addButtonText}>
                  {editingId ? "Update Investment" : "Add Investment"}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Investments List - Now inside ScrollView */}
          {investments.length > 0 && (
            <View style={styles.listContainer}>
              <View style={styles.listHeader}>
                <Text style={[styles.listTitle, { color: theme.colors.text }]}>
                  Your Investments ({investments.length})
                </Text>
                <Text
                  style={[styles.totalAmount, { color: theme.colors.text }]}
                >
                  Outlay: {fmt(totalOutlay)}
                </Text>
              </View>

              <Text
                style={[
                  styles.totalAmount,
                  { color: theme.colors.textSecondary, marginBottom: 12 },
                ]}
              >
                Principal: {fmt(totalInvested)} | Fees: {fmt(totalTransactionCosts)}
              </Text>

              {investments.map((investment) => (
                <View key={investment.id}>
                  {renderInvestment({ item: investment })}
                </View>
              ))}

              <TouchableOpacity
                style={[styles.clearButton, { backgroundColor: "#ef4444" }]}
                onPress={handleClearAll}
              >
                <Text style={styles.clearButtonText}>
                  Clear All Investments
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Wallet Picker Modal */}
      <Modal
        visible={showWalletPicker}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowWalletPicker(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
          }}
        >
          <View
            style={{
              backgroundColor: theme.colors.card,
              marginHorizontal: 20,
              borderRadius: 16,
              overflow: "hidden",
              elevation: 5,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottomColor: theme.colors.border,
                borderBottomWidth: 1,
                padding: 16,
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "bold",
                  color: theme.colors.text,
                }}
              >
                Invest From
              </Text>
              <TouchableOpacity onPress={() => setShowWalletPicker(false)}>
                <Ionicons
                  name="close"
                  size={24}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 320 }} bounces={false}>
              {(wallets || []).map((wallet) => {
                const isSelected = wallet.id === selectedWalletId;
                return (
                  <TouchableOpacity
                    key={wallet.id}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: 16,
                      borderBottomColor: theme.colors.border,
                      borderBottomWidth: 1,
                      backgroundColor: isSelected
                        ? theme.colors.tabBarActive + "15"
                        : theme.colors.card,
                    }}
                    onPress={() => {
                      setSelectedWalletId(wallet.id);
                      setShowWalletPicker(false);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{ color: theme.colors.text, fontSize: 16, fontWeight: "600" }}
                      >
                        {wallet.name}
                      </Text>
                      {wallet.type === "credit" ? (
                        <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                          Remaining: {fmt(wallet.remaining || 0)}
                        </Text>
                      ) : (
                        <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                          Available: {fmt(walletBalances[wallet.id] || 0)}
                        </Text>
                      )}
                    </View>
                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={22}
                        color={theme.colors.tabBarActive}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainContainer: {
    flex: 1,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    flex: 1,
    textAlign: "center",
  },
  placeholder: {
    width: 40,
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  formContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  allocatedAmountContainer: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  allocatedAmountLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 4,
  },
  allocatedAmountValue: {
    fontSize: 15,
    fontWeight: "bold",
  },
  formTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 16,
  },
  dropdownButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dropdownText: {
    fontSize: 16,
  },
  dropdownContainer: {
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 240,
    zIndex: 1000,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dropdownScroll: {
    maxHeight: 240,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  dropdownItemText: {
    fontSize: 16,
  },
  addButton: {
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 8,
  },
  addButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  listContainer: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  totalAmount: {
    fontSize: 14,
    fontWeight: "600",
  },
  investmentItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 6,
  },
  investmentInfo: {
    flex: 1,
  },
  investmentHeader: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 4,
  },
  platformName: {
    fontSize: 12,
    fontWeight: "600",
    marginRight: 8,
  },
  investmentAmount: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#2563eb",
  },
  investmentDetails: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  percentageText: {
    fontSize: 11,
    fontStyle: "italic",
    marginRight: 8,
  },
  investmentDescription: {
    fontSize: 11,
    flex: 1,
  },
  investmentActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  clearButton: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  clearButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default AddInvestmentScreen;
