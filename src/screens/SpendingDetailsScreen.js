import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
  FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { getCurrentUser } from "../services/authService";
import {
  getSpendingByCategory,
  deleteSpending,
  updateSpending,
  addSpending,
} from "../services/firestoreService";
import {
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

const SpendingDetailsScreen = ({ route, navigation }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const user = getCurrentUser();

  const { category, selectedMonth } = route.params || {};

  // State for spending data
  const [spendingList, setSpendingList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [item, setItem] = useState("");
  const [amount, setAmount] = useState("");
  const [transactionCosts, setTransactionCosts] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerMonthDate, setPickerMonthDate] = useState(new Date());

  // Date picker helpers (mirrors the picker on the expenses detail screen)
  const handleDateSelect = (selected) => {
    setDate(selected);
    setShowDatePicker(false);
  };

  const showDatePickerModal = () => {
    setPickerMonthDate(new Date(date.getTime()));
    setShowDatePicker(true);
  };

  const changePickerMonth = (direction) => {
    const newDate = new Date(pickerMonthDate.getTime());
    newDate.setMonth(newDate.getMonth() + direction);
    setPickerMonthDate(newDate);
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
      const dayDate = new Date(year, month, i);
      const isSelected = dayDate.toDateString() === date.toDateString();
      const isToday = dayDate.toDateString() === new Date().toDateString();
      days.push(
        <TouchableOpacity
          key={i}
          style={[
            {
              width: "14.28%",
              height: 36,
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 4,
              borderRadius: 18,
            },
            isSelected && { backgroundColor: theme.colors.tabBarActive },
          ]}
          onPress={() => handleDateSelect(dayDate)}
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

  const handleEditSpending = (spending) => {
    setEditingId(spending.id);
    setItem(spending.itemName || "");
    setAmount(spending.amount.toString());
    setTransactionCosts((spending.transactionCosts || 0).toString());
    setDescription(spending.description || "");
    setDate(
      spending.date?.toDate ? spending.date.toDate() : new Date(spending.date),
    );
    setShowAddModal(true);
  };

  const handleOpenAddModal = () => {
    setEditingId(null);
    setItem("");
    setAmount("");
    setTransactionCosts("");
    setDescription("");
    setDate(new Date());
    setShowAddModal(true);
  };

  // Handle save spending
  const handleSaveSpending = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }

    try {
      const spendingData = {
        category: category,
        amount: parseFloat(amount),
        description: description,
        itemName: item,
        date: date,
        month: selectedMonth,
        transactionCosts: parseFloat(transactionCosts) || 0,
        totalSpending: parseFloat(amount) + parseFloat(transactionCosts || 0),
      };

      if (editingId) {
        await updateSpending(user.uid, editingId, spendingData);
        setSpendingList((prev) =>
          prev.map((s) =>
            s.id === editingId ? { ...s, ...spendingData, id: editingId } : s,
          ),
        );
        Alert.alert("Success", "Spending updated successfully!");
      } else {
        const result = await addSpending(user.uid, spendingData);
        setSpendingList((prev) => [
          {
            ...spendingData,
            id: result.id,
            createdAt: { toDate: () => new Date() },
          },
          ...prev,
        ]);
        Alert.alert("Success", "Spending added successfully!");
      }

      setShowAddModal(false);
      setItem("");
      setAmount("");
      setTransactionCosts("");
      setDescription("");
      setDate(new Date());
      setEditingId(null);
    } catch (error) {
      console.error("Error saving spending:", error);
      Alert.alert("Error", "Failed to save spending");
    }
  };

  const handleDeleteSpending = (id) => {
    Alert.alert(
      "Delete Spending",
      "Are you sure you want to delete this record? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteSpending(user.uid, id);
              setSpendingList((prev) => prev.filter((item) => item.id !== id));
            } catch (error) {
              console.error("Delete error", error);
              Alert.alert("Error", "Could not delete record");
            }
          },
        },
      ],
    );
  };

  // Load spending data for the specific category
  useEffect(() => {
    const loadSpendingData = async () => {
      try {
        setLoading(true);
        const spendingData = await getSpendingByCategory(
          user.uid,
          category,
          selectedMonth,
        );
        setSpendingList(spendingData);
      } catch (error) {
        console.error("Failed to load spending data:", error);
        setSpendingList([]);
      } finally {
        setLoading(false);
      }
    };

    if (category) {
      loadSpendingData();
    }
  }, [user.uid, category, selectedMonth]);

  const renderSpendingItem = ({ item: spending }) => (
    <View
      style={[
        styles.spendingItem,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <View style={styles.spendingHeader}>
        <Text style={[styles.spendingCategory, { color: theme.colors.text }]}>
          {new Date(
            spending.date?.toDate ? spending.date.toDate() : spending.date,
          ).toLocaleDateString()}
        </Text>
        <View style={{ flexDirection: "row", gap: 16 }}>
          <TouchableOpacity onPress={() => handleEditSpending(spending)}>
            <Ionicons
              name="pencil-outline"
              size={20}
              color={theme.colors.tabBarActive}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDeleteSpending(spending.id)}>
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.spendingDetails}>
        <View style={styles.detailRow}>
          <Text
            style={[styles.detailLabel, { color: theme.colors.textSecondary }]}
          >
            Item:
          </Text>
          <Text style={[styles.detailValue, { color: theme.colors.text }]}>
            {spending.itemName || "No item specified"}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text
            style={[styles.detailLabel, { color: theme.colors.textSecondary }]}
          >
            Amount:
          </Text>
          <Text style={[styles.detailValue, { color: theme.colors.text }]}>
            KES{" "}
            {spending.amount.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text
            style={[styles.detailLabel, { color: theme.colors.textSecondary }]}
          >
            Transaction Cost:
          </Text>
          <Text style={[styles.detailValue, { color: theme.colors.text }]}>
            KES{" "}
            {spending.transactionCosts.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
        </View>

        {spending.description && (
          <View style={styles.detailRow}>
            <Text
              style={[
                styles.detailLabel,
                { color: theme.colors.textSecondary },
              ]}
            >
              Description:
            </Text>
            <Text style={[styles.detailValue, { color: theme.colors.text }]}>
              {spending.description}
            </Text>
          </View>
        )}

        <View style={styles.detailRow}>
          <Text
            style={[styles.detailLabel, { color: theme.colors.textSecondary }]}
          >
            Total Spending:
          </Text>
          <Text
            style={[
              styles.detailValue,
              { color: theme.colors.tabBarActive, fontWeight: "bold" },
            ]}
          >
            KES{" "}
            {spending.totalSpending.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background, paddingTop: insets.top },
      ]}
    >
      <StatusBar style="auto" />

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
          Spending Details - {category}
        </Text>
        <TouchableOpacity
          style={styles.placeholder}
          onPress={handleOpenAddModal}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name="add"
            size={28}
            color={theme.colors.tabBarActive}
            style={{ textAlign: "right" }}
          />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <Text
            style={[styles.loadingText, { color: theme.colors.textSecondary }]}
          >
            Loading spending details...
          </Text>
        </View>
      ) : spendingList.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text
            style={[styles.emptyText, { color: theme.colors.textSecondary }]}
          >
            No spending records found for {category}.
          </Text>
          <TouchableOpacity
            style={[
              styles.addSpendingButton,
              { backgroundColor: theme.colors.tabBarActive },
            ]}
            onPress={handleOpenAddModal}
          >
            <Ionicons name="add-circle-outline" size={16} color="#fff" />
            <Text style={styles.addSpendingButtonText}>Add Spending</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={spendingList}
            renderItem={renderSpendingItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
          />
        </>
      )}

      {/* Dynamic Edit/Add Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <KeyboardAvoidingView
          behavior={
            Platform.OS === "ios"
              ? "padding"
              : Platform.OS === "android"
                ? "height"
                : undefined
          }
          style={[
            {
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.5)",
              justifyContent: "center",
            },
          ]}
        >
          <View
            style={[
              {
                backgroundColor: theme.colors.card,
                maxHeight: "90%",
                marginHorizontal: 20,
                borderRadius: 16,
                overflow: "hidden",
                elevation: 5,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 4,
              },
            ]}
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
                {editingId ? `Edit Spending` : `Add Spending`}
              </Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons
                  name="close"
                  size={24}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ padding: 16 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={{ marginBottom: 16 }}>
                <Text
                  style={{ marginBottom: 8, color: theme.colors.textSecondary }}
                >
                  Item Name:
                </Text>
                <TextInput
                  style={[
                    { borderWidth: 1, borderRadius: 8, padding: 12 },
                    {
                      backgroundColor: theme.colors.background,
                      borderColor: theme.colors.border,
                      color: theme.colors.text,
                    },
                  ]}
                  placeholder="e.g., Coffee, Groceries, etc."
                  placeholderTextColor={theme.colors.textSecondary}
                  value={item}
                  onChangeText={setItem}
                />
              </View>

              <View style={{ marginBottom: 16 }}>
                <Text
                  style={{ marginBottom: 8, color: theme.colors.textSecondary }}
                >
                  Amount:
                </Text>
                <TextInput
                  style={[
                    { borderWidth: 1, borderRadius: 8, padding: 12 },
                    {
                      backgroundColor: theme.colors.background,
                      borderColor: theme.colors.border,
                      color: theme.colors.text,
                    },
                  ]}
                  placeholder="0.00"
                  keyboardType="numeric"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={amount}
                  onChangeText={setAmount}
                />
              </View>

              <View style={{ marginBottom: 16 }}>
                <Text
                  style={{ marginBottom: 8, color: theme.colors.textSecondary }}
                >
                  Transaction Cost (Optional):
                </Text>
                <TextInput
                  style={[
                    { borderWidth: 1, borderRadius: 8, padding: 12 },
                    {
                      backgroundColor: theme.colors.background,
                      borderColor: theme.colors.border,
                      color: theme.colors.text,
                    },
                  ]}
                  placeholder="0.00"
                  keyboardType="numeric"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={transactionCosts}
                  onChangeText={setTransactionCosts}
                />
              </View>

              <View style={{ marginBottom: 16 }}>
                <Text
                  style={{ marginBottom: 8, color: theme.colors.textSecondary }}
                >
                  Description:
                </Text>
                <TextInput
                  style={[
                    { borderWidth: 1, borderRadius: 8, padding: 12 },
                    {
                      backgroundColor: theme.colors.background,
                      borderColor: theme.colors.border,
                      color: theme.colors.text,
                    },
                  ]}
                  placeholder="What did you spend on?"
                  placeholderTextColor={theme.colors.textSecondary}
                  multiline
                  numberOfLines={3}
                  value={description}
                  onChangeText={setDescription}
                />
              </View>

              <View style={{ marginBottom: 16 }}>
                <Text
                  style={{ marginBottom: 8, color: theme.colors.textSecondary }}
                >
                  Date:
                </Text>
                <TouchableOpacity
                  style={[
                    {
                      borderWidth: 1,
                      borderRadius: 8,
                      padding: 12,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    },
                    {
                      backgroundColor: theme.colors.background,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  onPress={showDatePickerModal}
                >
                  <Text style={{ color: theme.colors.text }}>
                    {date.toLocaleDateString()}
                  </Text>
                  <Ionicons
                    name="calendar-outline"
                    size={16}
                    color={theme.colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View
              style={{
                flexDirection: "row",
                padding: 16,
                borderTopWidth: 1,
                borderTopColor: theme.colors.border,
              }}
            >
              <TouchableOpacity
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  alignItems: "center",
                  marginRight: 8,
                }}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={{ color: theme.colors.text, fontWeight: "600" }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 8,
                  backgroundColor: theme.colors.tabBarActive,
                  alignItems: "center",
                  marginLeft: 8,
                }}
                onPress={handleSaveSpending}
              >
                <Text style={{ color: "#fff", fontWeight: "bold" }}>
                  {editingId ? "Update" : "Save"}
                </Text>
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
                Select Date
              </Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Ionicons
                  name="close"
                  size={24}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 16 }}>
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
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
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
  listContainer: {
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
  spendingItem: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  spendingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  spendingCategory: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  spendingDate: {
    fontSize: 14,
    color: "#666",
  },
  spendingDetails: {
    gap: 12,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
  },
});

export default SpendingDetailsScreen;
