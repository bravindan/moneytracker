import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  StatusBar,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { getCurrentUser } from "../services/authService";
import {
  addInvestment,
  getInvestments,
  updateInvestment,
  deleteInvestment,
  getMonthlySummary,
  getSpending,
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
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(
    route?.params?.selectedMonth || getCurrentMonth(),
  ); // YYYY-MM format;
  const [allocatedAmount, setAllocatedAmount] = useState(0);

  const categories = [
    "Stocks & Shares",
    "Real Estate",
    "MMF",
    "FIF",
    "Sinking fund",
    "Special fund",
  ];

  const user = getCurrentUser();
  const uid = user?.uid;

  const [pendingBalance, setPendingBalance] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);

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

      const income = monthlyData?.income || 0;
      const expensesAmount = monthlyData?.expensesAmount || 0;
      const savingsInvestments =
        (monthlyData?.savingsAmount || 0) +
        (monthlyData?.investmentAmount || 0);

      setAllocatedAmount(savingsInvestments);

      const spending = await getSpending(uid, selectedMonth);
      const totalCategorySpends = spending.reduce(
        (sum, s) => sum + (parseFloat(s.amount) || 0),
        0,
      );

      const reservedOutlay =
        (parseFloat(monthlyData?.investmentAmount) || 0) +
        (parseFloat(monthlyData?.savingsAmount) || 0);

      const balance = income - expensesAmount - reservedOutlay - totalCategorySpends;

      setTotalSpent(totalCategorySpends);
      setPendingBalance(balance > 0 ? balance : 0);
    } catch (error) {
      console.error("Failed to load monthly data:", error);
      setAllocatedAmount(0);
      setPendingBalance(0);
      setTotalSpent(0);
    }
  };

  const loadInvestments = async () => {
    try {
      const data = await getInvestments(uid, selectedMonth);
      setInvestments(data || []);
    } catch (error) {
      console.error("Failed to load investments:", error);
    }
  };

  const resetForm = () => {
    setPlatform("");
    setAmount("");
    setTransactionCosts("");
    setDescription("");
    setCategory("");
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

    setLoading(true);
    try {
      if (editingId) {
        await updateInvestment(uid, editingId, {
          category: category.trim(),
          platform: platform.trim(),
          amount: amountNum,
          transactionCosts: transactionCostNum,
          totalInvestment: amountNum + transactionCostNum,
          description: description.trim(),
          month: selectedMonth,
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
        });
        Alert.alert("Success", "Investment added successfully!");
      }

      resetForm();
      await loadInvestments();
      await loadMonthlyData();
    } catch (error) {
      console.error("Failed to save investment:", error);
      Alert.alert("Error", "Failed to save investment");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (investment) => {
    setCategory(investment.category || "");
    setPlatform(investment.platform);
    setAmount(investment.amount.toString());
    setTransactionCosts((investment.transactionCosts || 0).toString());
    setDescription(investment.description || "");
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
            KES {item.amount.toLocaleString()}
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
            Transaction Cost: KES{" "}
            {(item.transactionCosts || 0).toLocaleString()}
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

  const renderCategoryItem = ({ item }) => (
    <TouchableOpacity
      style={styles.dropdownItem}
      onPress={() => {
        setCategory(item);
        setShowCategoryDropdown(false);
      }}
    >
      <Text style={[styles.dropdownItemText, { color: theme.colors.text }]}>
        {item}
      </Text>
    </TouchableOpacity>
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
          scrollEnabled={!showCategoryDropdown}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
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
                    style={[
                      styles.allocatedAmountLabel,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    Allocated
                  </Text>
                  <Text
                    style={[
                      styles.allocatedAmountValue,
                      { color: theme.colors.tabBarActive },
                    ]}
                  >
                    KES {allocatedAmount.toLocaleString()}
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
                    style={[
                      styles.allocatedAmountLabel,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    Outlay
                  </Text>
                  <Text
                    style={[
                      styles.allocatedAmountValue,
                      { color: theme.colors.text },
                    ]}
                  >
                    KES {totalOutlay.toLocaleString()}
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
                    style={[
                      styles.allocatedAmountLabel,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    Balance
                  </Text>
                  <Text
                    style={[
                      styles.allocatedAmountValue,
                      {
                        color:
                          pendingBalance > 0
                            ? theme.colors.tabBarActive
                            : "#ef4444",
                      },
                    ]}
                  >
                    KES {Math.max(pendingBalance - totalOutlay, 0).toLocaleString()}
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
              <TouchableOpacity
                style={[
                  styles.dropdownButton,
                  {
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.border,
                  },
                ]}
                onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
              >
                <Text
                  style={[
                    styles.dropdownText,
                    {
                      color: category
                        ? theme.colors.text
                        : theme.colors.textSecondary,
                    },
                  ]}
                >
                  {category || "Select category"}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={16}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>

              {showCategoryDropdown && (
                <View
                  style={[
                    styles.dropdownContainer,
                    {
                      backgroundColor: theme.colors.card,
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  <ScrollView
                    nestedScrollEnabled={true}
                    showsVerticalScrollIndicator={true}
                    style={styles.dropdownScroll}
                  >
                    {categories.map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setCategory(cat);
                          setShowCategoryDropdown(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.dropdownItemText,
                            { color: theme.colors.text },
                          ]}
                        >
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
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

            <View style={styles.inputGroup}>
              <Text
                style={[styles.label, { color: theme.colors.textSecondary }]}
              >
                Amount (KES) *
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

            <View style={styles.inputGroup}>
              <Text
                style={[styles.label, { color: theme.colors.textSecondary }]}
              >
                Transaction Cost (KES)
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
                placeholder="Enter transaction cost"
                placeholderTextColor={theme.colors.textSecondary}
                value={transactionCosts}
                onChangeText={setTransactionCosts}
                keyboardType="numeric"
              />
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
              <Text style={styles.addButtonText}>
                {loading
                  ? "Saving..."
                  : editingId
                    ? "Update Investment"
                    : "Add Investment"}
              </Text>
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
                  Outlay: KES {totalOutlay.toLocaleString()}
                </Text>
              </View>

              <Text
                style={[
                  styles.totalAmount,
                  { color: theme.colors.textSecondary, marginBottom: 12 },
                ]}
              >
                Principal: KES {totalInvested.toLocaleString()} | Fees: KES{" "}
                {totalTransactionCosts.toLocaleString()}
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
    borderBottomWidth: 1,
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
  dropdownList: {
    maxHeight: 240,
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
  textArea: {
    height: 80,
    textAlignVertical: "top",
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
  list: {
    marginBottom: 16,
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
