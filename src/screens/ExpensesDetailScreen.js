import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
  Modal,
  TextInput,
  Platform,
  Alert,
  KeyboardAvoidingView,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import IOSSpinner from "../components/IOSSpinner";
import { getCurrentUser } from "../services/authService";
import {
  getExpenses,
  getMonthlySummary,
  addSpending,
  getSpending,
  getUserProfile,
} from "../services/firestoreService";
import { useFocusEffect } from "@react-navigation/native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

const getCurrentMonth = () => new Date().toISOString().slice(0, 7);

const ExpensesDetailScreen = ({ navigation, route }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const user = getCurrentUser();
  const [profile, setProfile] = useState(null);

  // Fetch profile for currency
  useEffect(() => {
    if (!user?.uid) return;
    getUserProfile(user.uid).then(setProfile).catch(() => {});
  }, [user?.uid]);

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

  // State for dynamic data
  const [expenses, setExpenses] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(
    route?.params?.selectedMonth || getCurrentMonth(),
  ); // YYYY-MM format
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [monthlyData, setMonthlyData] = useState(null);
  const [allSpending, setAllSpending] = useState([]);

  // Spending modal state
  const [showSpendingModal, setShowSpendingModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [spendingAmount, setSpendingAmount] = useState("");
  const [spendingDescription, setSpendingDescription] = useState("");
  const [spendingItemName, setSpendingItemName] = useState("");
  const [spendingDate, setSpendingDate] = useState(new Date());
  const [transactionCosts, setTransactionCosts] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerMonthDate, setPickerMonthDate] = useState(new Date());

  // Load expenses data from database
  const loadExpensesData = useCallback(async () => {
    try {
      // Get monthly summary first to get total allocated amount
      const data = await getMonthlySummary(user.uid, selectedMonth);
      setMonthlyData(data);
      const totalAllocatedAmount = data?.expensesAmount || 0;

      // Get expenses from dedicated expenses collection
      const expensesData = await getExpenses(user.uid, selectedMonth);

      // Get all spending records
      const spendingData = await getSpending(user.uid, selectedMonth);
      setAllSpending(spendingData);

      // Calculate percentages based on total allocated amount from monthly summary
      const expensesList = expensesData.map((expense) => ({
        ...expense,
        percentage:
          totalAllocatedAmount > 0
            ? ((expense.amount / totalAllocatedAmount) * 100).toFixed(1)
            : 0,
      }));

      setExpenses(expensesList);
    } catch (error) {
      console.error("Failed to load expenses data:", error);
      setExpenses([]);
      setMonthlyData(null);
      setAllSpending([]);
    }
  }, [user.uid, selectedMonth]);

  useEffect(() => {
    setLoading(true);
    loadExpensesData().finally(() => setLoading(false));
  }, [loadExpensesData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadExpensesData();
    setRefreshing(false);
  }, [loadExpensesData]);

  const fetchFreshSpending = useCallback(async () => {
    try {
      if (!user?.uid) return;
      const spendingData = await getSpending(user.uid, selectedMonth);
      setAllSpending(spendingData);
    } catch (error) {
      console.error("Failed to update spending data on focus:", error);
    }
  }, [user?.uid, selectedMonth]);

  useFocusEffect(
    useCallback(() => {
      fetchFreshSpending();
    }, [fetchFreshSpending]),
  );

  const totalAllocated = monthlyData?.expensesAmount || 0;

  // Get custom allocation names to exclude from expenses
  const customAllocationNames = Array.isArray(monthlyData?.allocations)
    ? monthlyData.allocations
        .filter((a) => a.key === "custom")
        .map((a) => a.name)
    : [];

  const totalSpent = allSpending
    .filter((s) => s.category !== "Unallocated" && !customAllocationNames.includes(s.category))
    .reduce(
      (sum, spending) => sum + (spending.totalSpending || spending.amount || 0),
      0,
    );
  const totalRemaining = totalAllocated - totalSpent;

  // Calculate total spending for each category
  const calculateCategorySpent = (category) => {
    const categorySpending = allSpending.filter(
      (spending) => spending.category === category,
    );
    return categorySpending.reduce(
      (sum, spending) => sum + (spending.totalSpending || spending.amount || 0),
      0,
    );
  };

  // Handle add spending
  const handleAddSpending = (category) => {
    setSelectedCategory(category);
    setShowSpendingModal(true);
    setSpendingAmount("");
    setSpendingDescription("");
    setSpendingItemName("");
    setTransactionCosts("");
    setSpendingDate(new Date());
  };

  // Calculate the first day of the selected month for date validation
  const getFirstDayOfMonth = () => {
    if (!selectedMonth) return new Date(0);
    const [year, month] = selectedMonth.split("-").map(Number);
    return new Date(year, month - 1, 1);
  };

  // Handle date selection
  const handleDateSelect = (date) => {
    const firstDay = getFirstDayOfMonth();
    if (date < firstDay) {
      Alert.alert("Invalid Date", "Cannot select a date before the start of the record month.");
      return;
    }
    setSpendingDate(date);
    setShowDatePicker(false);
  };

  // Show date picker
  const showDatePickerModal = () => {
    setPickerMonthDate(new Date(spendingDate.getTime()));
    setShowDatePicker(true);
  };

  const changePickerMonth = (direction) => {
    const newDate = new Date(pickerMonthDate.getTime());
    newDate.setMonth(newDate.getMonth() + direction);
    setPickerMonthDate(newDate);
  };

  // PDF Generator block mapping complete expenditures
  const generatePDF = async () => {
    try {
      const todayDate = new Date().toLocaleDateString();
      const totalTxnCosts = allSpending
        .filter((s) => s.category !== "Unallocated" && !customAllocationNames.includes(s.category))
        .reduce(
          (sum, s) => sum + (s.transactionCosts || 0),
          0,
        );
      let tableHTML = "";

      expenses.forEach((expense) => {
        const categorySpendings = allSpending.filter(
          (s) => s.category === expense.category,
        );
        const catSpent = categorySpendings.reduce(
          (sum, s) => sum + (s.totalSpending || s.amount || 0),
          0,
        );

        tableHTML += `
          <h3 style="margin-top: 20px; color: #1e3a8a;">${expense.category} (Allocated: ${fmt(expense.amount)} | Spent: ${fmt(catSpent)})</h3>
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
            <tr>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f3f4f6;">Date</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f3f4f6;">Item</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: right; background-color: #f3f4f6;">Amount (${currencyCode})</th>
            </tr>
        `;

        if (categorySpendings.length === 0) {
          tableHTML += `<tr><td colspan="3" style="border: 1px solid #ddd; padding: 8px; text-align: center; color: #6b7280;">No spendings recorded</td></tr>`;
        } else {
          categorySpendings.forEach((s) => {
            const rowDate = new Date(
              s.date?.toDate ? s.date.toDate() : s.date,
            ).toLocaleDateString();
            tableHTML += `
              <tr>
                <td style="border: 1px solid #ddd; padding: 8px;">${rowDate}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${s.itemName || s.description || "N/A"}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${(s.totalSpending || s.amount || 0).toFixed(2)}</td>
              </tr>
            `;
          });
        }
        tableHTML += `</table>`;
      });

      const htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; color: #1f2937; }
              h1 { color: #111827; text-align: center; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }
              p { margin: 5px 0; }
              .summary-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin-bottom: 20px; }
            </style>
          </head>
          <body>
            <h1>Expense Expenditures Report</h1>
            <div class="summary-box">
              <p><strong>Generated on:</strong> ${todayDate}</p>
              <p><strong>Total Allocated:</strong> ${fmt(totalAllocated)}</p>
              <p><strong>Total Spent:</strong> ${fmt(totalSpent)}</p>
              <p><strong>Total Transaction Costs:</strong> ${fmt(totalTxnCosts)}</p>
              <p><strong>Remaining:</strong> ${fmt(totalRemaining)}</p>
            </div>
            <h2>Breakdown by Category</h2>
            ${tableHTML}
          </body>
        </html>
      `;

      const filename = `Expenses-${selectedMonth.replace("-", "-")}.pdf`;
      const { uri } = await Print.printToFileAsync({ html: htmlContent, base64: false });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      } else {
        Alert.alert("PDF Generated", `File saved to: ${uri}`);
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to generate PDF");
    }
  };

  const renderCalendar = () => {
    const year = pickerMonthDate.getFullYear();
    const month = pickerMonthDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();

    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <View
          key={`empty-${i}`}
          style={{ width: "14.28%", height: 36, marginBottom: 4 }}
        />,
      );
    }
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      const isSelected = date.toDateString() === spendingDate.toDateString();
      const isToday = date.toDateString() === new Date().toDateString();
      const isBeforeMonth = date < getFirstDayOfMonth();
      days.push(
        <TouchableOpacity
          key={i}
          disabled={isBeforeMonth}
          style={[
            {
              width: "14.28%",
              height: 36,
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 4,
              borderRadius: 18,
              opacity: isBeforeMonth ? 0.3 : 1,
            },
            isSelected && { backgroundColor: theme.colors.tabBarActive },
          ]}
          onPress={() => handleDateSelect(date)}
        >
          <Text
            style={[
              {
                fontSize: 14,
                color: isSelected
                  ? "#fff"
                  : isToday
                    ? theme.colors.tabBarActive
                    : theme.colors.text,
              },
              isToday && { fontWeight: "bold" },
            ]}
          >
            {i}
          </Text>
        </TouchableOpacity>,
      );
    }
    return days;
  };

  // Handle save spending
  const handleSaveSpending = async () => {
    if (!spendingAmount || parseFloat(spendingAmount) <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }

    setSaving(true);
    try {
      const amount = parseFloat(spendingAmount);
      const transactionCost = parseFloat(transactionCosts) || 0;
      const totalSpending = amount + transactionCost;

      await addSpending(user.uid, {
        category: selectedCategory,
        amount: amount,
        description: spendingDescription,
        itemName: spendingItemName,
        date: spendingDate,
        month: selectedMonth,
        transactionCosts: transactionCost,
        totalSpending: totalSpending,
      });

      setAllSpending((prev) => [
        ...prev,
        {
          category: selectedCategory,
          amount: amount,
          description: spendingDescription,
          itemName: spendingItemName,
          date: spendingDate,
          month: selectedMonth,
          transactionCosts: transactionCost,
          totalSpending: totalSpending,
        },
      ]);

      Alert.alert("Success", "Spending added successfully!");
      setShowSpendingModal(false);
      setSpendingAmount("");
      setSpendingDescription("");
      setSpendingItemName("");
      setTransactionCosts("");
    } catch (error) {
      console.error("Error saving spending:", error);
      Alert.alert("Error", "Failed to save spending");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background, paddingTop: insets.top },
      ]}
    >
      <StatusBar style={theme.isDark ? "light" : "dark"} />

      {/* Header */}
      <View style={styles.headerContainer}>
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
          Expense Details
        </Text>
        <TouchableOpacity
          style={styles.placeholder}
          onPress={generatePDF}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name="print-outline"
            size={24}
            color={theme.colors.tabBarActive}
            style={{ textAlign: "right" }}
          />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <IOSSpinner size={40} color={theme.colors.tabBarActive} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.tabBarActive]} progressBackgroundColor={theme.colors.card} tintColor={theme.colors.tabBarActive} />
          }
        >
          {/* Summary */}
          <View
            style={[
              styles.summaryCard,
              {
                backgroundColor: theme.colors.background,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <View style={styles.summaryRow}>
              <View style={{ flex: 1, alignItems: "center" }}>
                <Text
                  style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}
                >
                  Allocated
                </Text>
                <Text
                  style={[styles.summaryValue, { color: theme.colors.tabBarActive }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {fmt(totalAllocated)}
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
                  style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}
                >
                  Spent
                </Text>
                <Text
                  style={[styles.summaryValue, { color: theme.colors.text }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {fmt(totalSpent)}
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
                  style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}
                >
                  Remaining
                </Text>
                <Text
                  style={[
                    styles.summaryValue,
                    {
                      color:
                        totalRemaining >= 0 ? "#10b981" : "#ef4444",
                    },
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {fmt(totalRemaining)}
                </Text>
              </View>
            </View>
          </View>

          {/* Categories */}
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Expense Categories {expenses.length > 0 && `(${expenses.length})`}
          </Text>
          {expenses.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="cart-outline" size={48} color={theme.colors.textSecondary} style={{ marginBottom: 12 }} />
              <Text
                style={[
                  styles.emptyText,
                  { color: theme.colors.textSecondary, marginBottom: 20 },
                ]}
              >
                No expense categories recorded yet. Add expense categories to
                see them here.
              </Text>
              <TouchableOpacity
                style={{
                  backgroundColor: theme.colors.tabBarActive,
                  paddingHorizontal: 24,
                  paddingVertical: 14,
                  borderRadius: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                }}
                onPress={() => navigation.navigate("AddExpense", { selectedMonth })}
              >
                <Ionicons name="add-circle-outline" size={20} color="#fff" />
                <Text style={{ color: "#fff", fontWeight: "600", fontSize: 16 }}>Add Expense Category</Text>
              </TouchableOpacity>
            </View>
          ) : (
            expenses.map((expense, index) => (
              <View
                key={`${expense.category}-${index}`}
                style={[
                  styles.expenseCard,
                  { backgroundColor: theme.colors.card },
                ]}
              >
                <View style={styles.expenseHeader}>
                  <Text
                    style={[
                      styles.expenseCategory,
                      { color: theme.colors.text },
                    ]}
                  >
                    {expense.category}
                  </Text>
                  <Text
                    style={[
                      styles.expensePercentage,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {expense.percentage}% of total expenses
                  </Text>
                </View>

                <View style={styles.expenseDetails}>
                  <View style={styles.detailRow}>
                    <Text
                      style={[
                        styles.detailLabel,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      Allocated:
                    </Text>
                    <Text
                      style={[styles.detailValue, { color: theme.colors.text }]}
                    >
                      {fmt(expense.amount)}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text
                      style={[
                        styles.detailLabel,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      Spent:
                    </Text>
                    <Text
                      style={[styles.detailValue, { color: theme.colors.text }]}
                    >
                      {fmt(calculateCategorySpent(expense.category))}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text
                      style={[
                        styles.detailLabel,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      Remaining:
                    </Text>
                    <Text
                      style={[
                        styles.detailValue,
                        expense.amount -
                          calculateCategorySpent(expense.category) >=
                        0
                          ? styles.positive
                          : styles.negative,
                      ]}
                    >
                      {fmt(expense.amount - calculateCategorySpent(expense.category))}
                    </Text>
                  </View>
                  <View style={styles.spendingButtonContainer}>
                    <TouchableOpacity
                      style={[
                        styles.addSpendingButton,
                        { backgroundColor: theme.colors.tabBarActive },
                      ]}
                      onPress={() => handleAddSpending(expense.category)}
                    >
                      <Ionicons
                        name="add-circle-outline"
                        size={16}
                        color="#fff"
                      />
                      <Text style={styles.addSpendingButtonText}>
                        Add Spending
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.viewSpendingButton,
                        { borderColor: theme.colors.border },
                      ]}
                      onPress={() =>
                        navigation.navigate("SpendingDetails", {
                          category: expense.category,
                          selectedMonth,
                        })
                      }
                    >
                      <Text
                        style={[
                          styles.viewSpendingButtonText,
                          { color: theme.colors.tabBarActive },
                        ]}
                      >
                        View All
                      </Text>
                      <Ionicons
                        name="chevron-forward"
                        size={14}
                        color={theme.colors.tabBarActive}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Spending Modal */}
      <Modal
        visible={showSpendingModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSpendingModal(false)}
      >
        <KeyboardAvoidingView
          behavior={
            Platform.OS === "ios"
              ? "padding"
              : Platform.OS === "android"
                ? "height"
                : undefined
          }
          style={[styles.modalOverlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}
        >
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.colors.card, maxHeight: "90%" },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                Add Spending - {selectedCategory}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowSpendingModal(false)}
              >
                <Ionicons
                  name="close"
                  size={24}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.inputGroup}>
                <Text
                  style={[
                    styles.inputLabel,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Item Name:
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
                  placeholder="e.g., Coffee, Groceries, etc."
                  placeholderTextColor={theme.colors.textSecondary}
                  value={spendingItemName}
                  onChangeText={setSpendingItemName}
                />
              </View>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 0.7 }}>
                  <Text
                    style={[
                      styles.inputLabel,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    Amount:
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
                    keyboardType="numeric"
                    value={spendingAmount}
                    onChangeText={setSpendingAmount}
                  />
                </View>
                <View style={{ flex: 0.3 }}>
                  <Text
                    style={[
                      styles.inputLabel,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    Txn Cost:
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
                  style={[
                    styles.inputLabel,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Description:
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
                  placeholder="What did you spend on?"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={spendingDescription}
                  onChangeText={setSpendingDescription}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text
                  style={[
                    styles.inputLabel,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Date:
                </Text>
                <TouchableOpacity
                  style={[
                    styles.dateInput,
                    {
                      backgroundColor: theme.colors.background,
                      borderColor: theme.colors.border,
                      color: theme.colors.text,
                    },
                  ]}
                  onPress={showDatePickerModal}
                >
                  <Text style={[styles.dateText, { color: theme.colors.text }]}>
                    {spendingDate.toLocaleDateString()}
                  </Text>
                  <Ionicons
                    name="calendar-outline"
                    size={16}
                    color={theme.colors.textSecondary}
                    style={{ marginLeft: 8 }}
                  />
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[
                  styles.cancelModalButton,
                  { borderColor: theme.colors.border },
                ]}
                onPress={() => setShowSpendingModal(false)}
              >
                <Text
                  style={[
                    styles.cancelModalButtonText,
                    { color: theme.colors.text },
                  ]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.saveModalButton,
                  { backgroundColor: saving ? theme.colors.textSecondary : theme.colors.tabBarActive },
                ]}
                onPress={handleSaveSpending}
                disabled={saving}
              >
                {saving ? (
                  <IOSSpinner size={18} color="#fff" />
                ) : (
                  <Text style={styles.saveModalButtonText}>Save Spending</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View
          style={[styles.modalOverlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}
        >
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.colors.card },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                Select Date
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowDatePicker(false)}
              >
                <Ionicons
                  name="close"
                  size={24}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.datePickerContainer}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <TouchableOpacity
                  onPress={() => changePickerMonth(-1)}
                  style={{ padding: 8 }}
                >
                  <Ionicons
                    name="chevron-back"
                    size={24}
                    color={theme.colors.text}
                  />
                </TouchableOpacity>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "bold",
                    color: theme.colors.text,
                  }}
                >
                  {pickerMonthDate.toLocaleString("default", {
                    month: "long",
                    year: "numeric",
                  })}
                </Text>
                <TouchableOpacity
                  onPress={() => changePickerMonth(1)}
                  style={{ padding: 8 }}
                >
                  <Ionicons
                    name="chevron-forward"
                    size={24}
                    color={theme.colors.text}
                  />
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d, i) => (
                  <Text
                    key={i}
                    style={{
                      width: "14.28%",
                      textAlign: "center",
                      marginBottom: 8,
                      color: theme.colors.textSecondary,
                      fontWeight: "bold",
                      fontSize: 12,
                    }}
                  >
                    {d}
                  </Text>
                ))}
                {renderCalendar()}
              </View>

              <TouchableOpacity
                style={{
                  marginTop: 12,
                  paddingVertical: 12,
                  alignItems: "center",
                  backgroundColor: theme.colors.background,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }}
                onPress={() => handleDateSelect(new Date())}
              >
                <Text style={{ color: theme.colors.text, fontWeight: "500" }}>
                  Select Today
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[
                  styles.cancelModalButton,
                  { borderColor: theme.colors.border },
                ]}
                onPress={() => setShowDatePicker(false)}
              >
                <Text
                  style={[
                    styles.cancelModalButtonText,
                    { color: theme.colors.text },
                  ]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
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
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    fontWeight: "500",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
  },
  summaryCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: "bold",
  },
  expenseCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  expenseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  expenseCategory: {
    fontSize: 16,
    fontWeight: "600",
  },
  expensePercentage: {
    fontSize: 14,
    fontWeight: "500",
  },
  expenseDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  positive: {
    color: "#10b981",
  },
  negative: {
    color: "#ef4444",
  },
  spendingButtonContainer: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  addSpendingButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  addSpendingButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  viewSpendingButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  viewSpendingButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    maxWidth: 400,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    gap: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 6,
    color: "#666",
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    minHeight: 48,
  },
  dateInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 48,
  },
  dateText: {
    fontSize: 16,
  },
  modalFooter: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  cancelModalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  cancelModalButtonText: {
    fontSize: 16,
    fontWeight: "500",
  },
  saveModalButton: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  saveModalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  // Date picker styles
  datePickerContainer: {
    gap: 12,
  },
});

export default ExpensesDetailScreen;
