import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  StatusBar,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { getCurrentUser } from "../services/authService";
import {
  addExpense,
  getExpenses,
  getMonthlySummary,
  updateExpense,
  deleteExpense,
} from "../services/firestoreService";

const getCurrentMonth = () => new Date().toISOString().slice(0, 7);

const AddExpenseScreen = ({ navigation, route }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const user = getCurrentUser();

  // Predefined categories
  const [predefinedCategories, setPredefinedCategories] = useState([
    "Food & Groceries",
    "Transportation",
    "Utilities",
    "Entertainment",
    "Healthcare",
    "Shopping",
    "Education",
    "Insurance",
    "Savings",
    "Other",
  ]);

  // Form state
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(
    route?.params?.selectedMonth || getCurrentMonth(),
  ); // YYYY-MM format
  const [allocatedAmount, setAllocatedAmount] = useState(0);

  // Month picker state
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(
    new Date().getFullYear(),
  );

  // Expenses list
  const [expenses, setExpenses] = useState([]);

  // Dropdown states
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Load expenses data from database
  useEffect(() => {
    const loadExpensesData = async () => {
      try {
        setLoading(true);

        // Get expenses from dedicated expenses collection
        const expensesData = await getExpenses(user.uid, selectedMonth);
        setExpenses(expensesData);

        // Get monthly summary for allocation data
        const monthlyData = await getMonthlySummary(user.uid, selectedMonth);
        const expenseAllocation = monthlyData?.expensesAmount || 0;
        setAllocatedAmount(expenseAllocation);

        // Update predefined categories with user-created ones
        const userCategories = [
          ...new Set(expensesData.map((expense) => expense.category)),
        ];
        setPredefinedCategories((prev) => [
          ...new Set([...prev, ...userCategories]),
        ]);
      } catch (error) {
        console.error("Failed to load expenses data:", error);
        setExpenses([]);
        setAllocatedAmount(0);
      } finally {
        setLoading(false);
      }
    };

    loadExpensesData();
  }, [user.uid, selectedMonth]);

  // Calculate allocation percentage based on overall expense allocation
  const calculateAllocation = (expenseAmount) => {
    if (allocatedAmount <= 0) return "0";

    // For editing, exclude current expense from total
    const currentExpensesTotal = expenses.reduce((sum, expense) => {
      if (editingId === expense.id) {
        return sum; // Exclude current editing expense
      }
      return sum + expense.amount;
    }, 0);

    const newTotal = currentExpensesTotal + parseFloat(expenseAmount || 0);
    return newTotal > 0
      ? ((parseFloat(expenseAmount || 0) / allocatedAmount) * 100).toFixed(1)
      : "0";
  };

  // Filter categories based on input
  const filterCategories = (text) => {
    // Combine predefined categories with user-created categories from expenses
    const userCategories = [
      ...new Set(expenses.map((expense) => expense.category)),
    ];
    const allCategories = [...predefinedCategories, ...userCategories];

    const filtered = allCategories.filter(
      (cat) =>
        cat.toLowerCase().includes(text.toLowerCase()) && text.length > 0,
    );
    setFilteredCategories(filtered);
    setShowDropdown(true);
  };

  // Select category from dropdown
  const selectCategory = (selectedCategory) => {
    setCategory(selectedCategory);
    setShowDropdown(false);
    setFilteredCategories([]);
  };

  // Clear form
  const clearForm = () => {
    setCategory("");
    setAmount("");
    setEditingId(null);
  };

  // Add or update expense
  const handleAddExpense = async () => {
    if (!category || !amount || parseFloat(amount) <= 0) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    setLoading(true);

    try {
      const expenseData = {
        category: category.trim(),
        amount: parseFloat(amount),
        month: selectedMonth,
        createdAt: new Date(),
      };

      if (editingId) {
        // Update existing expense
        await updateExpense(user.uid, editingId, expenseData);
        setExpenses(
          expenses.map((expense) =>
            expense.id === editingId ? { ...expense, ...expenseData } : expense,
          ),
        );
        Alert.alert("Success", "Expense updated successfully!");
      } else {
        // Add new expense to database
        const expenseRef = await addExpense(user.uid, expenseData);
        const newExpense = {
          id: expenseRef.id,
          ...expenseData,
        };
        setExpenses([...expenses, newExpense]);
        Alert.alert("Success", "Expense added successfully!");
      }

      clearForm();
    } catch (error) {
      console.error("Error saving expense:", error);
      Alert.alert("Error", "Failed to save expense");
    } finally {
      setLoading(false);
    }
  };

  // Edit expense
  const editExpense = (expense) => {
    setCategory(expense.category);
    setAmount(expense.amount.toString());
    setEditingId(expense.id);
  };

  // Delete expense
  const handleDeleteExpense = (id) => {
    Alert.alert(
      "Delete Expense",
      "Are you sure you want to delete this expense?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteExpense(user.uid, id);
              setExpenses(expenses.filter((expense) => expense.id !== id));
              if (editingId === id) {
                clearForm();
              }
              Alert.alert("Success", "Expense deleted successfully!");
            } catch (error) {
              console.error("Error deleting expense:", error);
              Alert.alert("Error", "Failed to delete expense");
            }
          },
        },
      ],
    );
  };

  // Render dropdown item
  const renderDropdownItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.dropdownItem,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
        },
      ]}
      onPress={() => selectCategory(item)}
    >
      <Text style={[styles.dropdownItemText, { color: theme.colors.text }]}>
        {item}
      </Text>
    </TouchableOpacity>
  );

  // Render expense item
  const renderExpenseItem = ({ item: expense }) => {
    const allocationPercentage = calculateAllocation(expense.amount);

    return (
      <View
        style={[
          styles.expenseItem,
          {
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <View style={styles.expenseInfo}>
          <Text style={[styles.expenseCategory, { color: theme.colors.text }]}>
            {expense.category}
          </Text>
          <Text style={[styles.expenseAmount, { color: theme.colors.text }]}>
            KES {expense.amount.toLocaleString()}
          </Text>
          {parseFloat(allocationPercentage) > 0 && (
            <Text
              style={[
                styles.expenseAllocation,
                { color: theme.colors.textSecondary },
              ]}
            >
              {allocationPercentage}% allocation
            </Text>
          )}
        </View>
        <View style={styles.expenseActions}>
          <TouchableOpacity
            style={[styles.actionButton, { borderColor: theme.colors.border }]}
            onPress={() => editExpense(expense)}
          >
            <Ionicons
              name="create-outline"
              size={16}
              color={theme.colors.tabBarActive}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { borderColor: theme.colors.border }]}
            onPress={() => handleDeleteExpense(expense.id)}
          >
            <Ionicons name="trash-outline" size={16} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    );
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
          Add Expense
        </Text>
        <View style={styles.placeholder} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={
          Platform.OS === "ios" ? "padding" : Platform.OS === "android" ? "height" : undefined
        }
      >
        <FlatList
        style={[styles.scrollContainer, { flex: 1 }]}
        data={[{ key: "content" }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        renderItem={() => (
          <View>
            <Text
              style={[styles.subtitle, { color: theme.colors.textSecondary }]}
            >
              Add expense categories with allocated amounts
            </Text>

            {/* Add Expense Form */}
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
                <Text
                  style={[
                    styles.allocatedAmountLabel,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Expense Allocation
                </Text>
                <Text
                  style={[
                    styles.allocatedAmountValue,
                    { color: theme.colors.text },
                  ]}
                >
                  KES{" "}
                  {allocatedAmount.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
              </View>

              {/* Month Picker */}
              <TouchableOpacity
                style={[
                  styles.datePickerTrigger,
                  {
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.border,
                  },
                ]}
                onPress={() => {
                  setPickerYear(
                    parseInt(selectedMonth.split("-")[0]),
                  );
                  setShowMonthPicker(true);
                }}
              >
                <Ionicons
                  name="calendar"
                  size={18}
                  color={theme.colors.tabBarActive}
                />
                <Text
                  style={[
                    styles.datePickerText,
                    { color: theme.colors.text },
                  ]}
                >
                  {selectedMonth}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={16}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>

              <Text style={[styles.formTitle, { color: theme.colors.text }]}>
                {editingId ? "Edit Expense Category" : "Add Expense Category"}
              </Text>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.colors.text }]}>
                  Category:
                </Text>
                <View style={styles.inputWithDropdown}>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.colors.background,
                        borderColor: theme.colors.border,
                        color: theme.colors.text,
                        borderTopRightRadius: showDropdown ? 0 : 8,
                      },
                    ]}
                    placeholder="Type category name..."
                    placeholderTextColor={theme.colors.textSecondary}
                    value={category}
                    onChangeText={(text) => {
                      setCategory(text);
                      filterCategories(text);
                    }}
                    onFocus={() => {
                      if (category) {
                        filterCategories(category);
                      }
                    }}
                  />
                  {showDropdown && (
                    <View
                      style={[
                        styles.dropdownContainer,
                        {
                          backgroundColor: theme.colors.card,
                          borderColor: theme.colors.border,
                          borderTopWidth: 0,
                          borderTopRightRadius: 0,
                        },
                      ]}
                    >
                      <FlatList
                        data={filteredCategories}
                        renderItem={renderDropdownItem}
                        keyExtractor={(item, index) => `category-${index}`}
                        style={{ maxHeight: 150 }}
                        showsVerticalScrollIndicator={false}
                      />
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.colors.text }]}>
                  Amount:
                </Text>
                <View style={styles.amountAllocationRow}>
                  <TextInput
                    style={[
                      styles.amountInput,
                      {
                        backgroundColor: theme.colors.background,
                        borderColor: theme.colors.border,
                        color: theme.colors.text,
                      },
                    ]}
                    placeholder="0.00"
                    placeholderTextColor={theme.colors.textSecondary}
                    keyboardType="numeric"
                    value={amount}
                    onChangeText={setAmount}
                  />
                  <View
                    style={[
                      styles.allocationDisplay,
                      {
                        backgroundColor: theme.colors.background,
                        borderColor: theme.colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.allocationText,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {calculateAllocation(amount)}%
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[
                    styles.cancelButton,
                    { borderColor: theme.colors.border },
                  ]}
                  onPress={clearForm}
                >
                  <Text
                    style={[
                      styles.cancelButtonText,
                      { color: theme.colors.text },
                    ]}
                  >
                    Clear
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.addButton,
                    {
                      backgroundColor: loading
                        ? theme.colors.textSecondary
                        : theme.colors.tabBarActive,
                    },
                  ]}
                  onPress={handleAddExpense}
                  disabled={loading}
                >
                  <Text style={styles.addButtonText}>
                    {loading ? "Saving..." : editingId ? "Update" : "Add"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Expenses List */}
            {expenses.length > 0 && (
              <View style={styles.listContainer}>
                <View style={styles.listHeader}>
                  <Text
                    style={[styles.listTitle, { color: theme.colors.text }]}
                  >
                    Your Expenses ({expenses.length})
                  </Text>
                  <Text
                    style={[styles.totalAmount, { color: theme.colors.text }]}
                  >
                    Total: KES{" "}
                    {expenses
                      .reduce((sum, expense) => sum + expense.amount, 0)
                      .toLocaleString()}
                  </Text>
                </View>

                <FlatList
                  data={expenses}
                  renderItem={renderExpenseItem}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                />
              </View>
            )}
          </View>
        )}
        keyExtractor={() => "main-content"}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: insets.bottom + 140,
        }}
      />
      </KeyboardAvoidingView>

      {/* Month Picker Modal */}
      <Modal
        visible={showMonthPicker}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowMonthPicker(false)}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
          }}
          activeOpacity={1}
          onPress={() => setShowMonthPicker(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={{
              width: "80%",
              padding: 20,
              backgroundColor: theme.colors.card,
              borderRadius: 16,
              shadowColor: "#000",
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 5,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <TouchableOpacity
                onPress={() => setPickerYear(pickerYear - 1)}
                style={{ padding: 10 }}
              >
                <Ionicons
                  name="chevron-back"
                  size={24}
                  color={theme.colors.text}
                />
              </TouchableOpacity>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "bold",
                  color: theme.colors.text,
                }}
              >
                {pickerYear}
              </Text>
              <TouchableOpacity
                onPress={() => setPickerYear(pickerYear + 1)}
                style={{ padding: 10 }}
              >
                <Ionicons
                  name="chevron-forward"
                  size={24}
                  color={theme.colors.text}
                />
              </TouchableOpacity>
            </View>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                justifyContent: "space-between",
              }}
            >
              {Array.from({ length: 12 }).map((_, i) => {
                const isSelected =
                  selectedMonth ===
                  `${pickerYear}-${String(i + 1).padStart(2, "0")}`;
                return (
                  <TouchableOpacity
                    key={i}
                    style={{
                      width: "30%",
                      height: 40,
                      justifyContent: "center",
                      alignItems: "center",
                      marginBottom: 12,
                      borderRadius: 8,
                      backgroundColor: isSelected
                        ? theme.colors.tabBarActive
                        : theme.colors.background,
                    }}
                    onPress={() => {
                      if (
                        selectedMonth !==
                        `${pickerYear}-${String(i + 1).padStart(2, "0")}`
                      ) {
                        setLoading(true);
                      }
                      setSelectedMonth(
                        `${pickerYear}-${String(i + 1).padStart(2, "0")}`,
                      );
                      setShowMonthPicker(false);
                    }}
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
    flex: 1,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 20,
    textAlign: "center",
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  allocatedAmountLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  allocatedAmountValue: {
    fontSize: 16,
    fontWeight: "bold",
  },
  formTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  datePickerTrigger: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 12,
    gap: 10,
    minHeight: 48,
  },
  datePickerText: {
    fontSize: 16,
    flex: 1,
    fontWeight: "500",
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 6,
  },
  inputWithDropdown: {
    position: "relative",
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 16,
    minHeight: 48,
  },
  amountAllocationRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "stretch",
  },
  amountInput: {
    flex: 2,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 16,
    minHeight: 48,
  },
  allocationDisplay: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 48,
  },
  allocationText: {
    fontSize: 14,
    fontWeight: "600",
  },
  dropdownContainer: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    borderWidth: 1,
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    zIndex: 1000,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
  },
  dropdownItemText: {
    fontSize: 16,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "500",
  },
  addButton: {
    flex: 2,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  listContainer: {
    marginTop: 20,
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: "bold",
  },
  expenseItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 6,
  },
  expenseInfo: {
    flex: 1,
  },
  expenseCategory: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  expenseAmount: {
    fontSize: 13,
    fontWeight: "bold",
    marginBottom: 2,
  },
  expenseAllocation: {
    fontSize: 12,
  },
  expenseActions: {
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
});

export default AddExpenseScreen;
