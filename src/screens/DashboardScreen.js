import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { getCurrentUser, logoutUser } from "../services/authService";
import {
  getMonthlySummary,
  getMonthlySummaries,
  getUserProfile,
  getSpending,
  getInvestments,
  deleteMonthlySummary,
} from "../services/firestoreService";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useTheme } from "../contexts/ThemeContext";

const getCurrentMonth = () => new Date().toISOString().slice(0, 7); // YYYY-MM

const formatMonthName = (monthString) => {
  const [year, month] = monthString.split("-").map(Number);
  const date = new Date(year, month - 1);
  return date.toLocaleString("default", { month: "long", year: "numeric" });
};

const generateAvatar = (name, theme) => {
  const firstLetter = name ? name.charAt(0).toUpperCase() : "?";
  return {
    text: firstLetter,
    color: theme.colors.primary,
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
  };
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  stickyHeader: {
    position: "sticky",
    top: 0,
    zIndex: 100,
    backgroundColor: "transparent",
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
  signOutText: {
    fontWeight: "600",
    fontSize: 14,
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
  addRecordButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginLeft: 8,
  },
  addRecordButtonText: {
    fontWeight: "600",
    fontSize: 14,
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
  recordMenu: {
    position: "absolute",
    right: 16,
    minWidth: 180,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
  recordMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  recordMenuText: {
    fontSize: 15,
    fontWeight: "500",
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 100, // Space for tab bar
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardToggle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
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
  expenseSummary: {
    marginTop: 8,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  balanceRow: {
    borderTopWidth: 1,
    borderTopColor: "transparent",
    paddingTop: 8,
    marginTop: 4,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  amountWithPercentage: {
    alignItems: "flex-end",
  },
  summaryPercentage: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  cardGreen: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  cardBlue: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  cardPurple: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  cardWhite: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 11,
    marginBottom: 2,
  },
  cardValue: {
    fontSize: 18,
    fontWeight: "bold",
    flexShrink: 0,
    lineHeight: 24,
  },
  cardSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 12,
  },
  progressBarContainer: {
    height: 12,
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 6,
  },
  progressBarFillGreen: {
    height: "100%",
    backgroundColor: "#10b981",
  },
  progressBarFillRed: {
    height: "100%",
    backgroundColor: "#ef4444",
  },
  progressTextRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  progressText: {
    fontSize: 12,
  },
  breakdownTitle: {
    fontWeight: "bold",
    fontSize: 14,
    marginBottom: 12,
  },
  expenseItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  expenseItemLeft: {
    flex: 1,
  },
  expenseItemName: {
    fontWeight: "500",
    fontSize: 14,
  },
  expenseItemCategory: {
    fontSize: 12,
  },
  expenseItemRight: {
    alignItems: "flex-end",
    marginRight: 16,
  },
  expenseAmount: {
    fontWeight: "500",
    fontSize: 14,
  },
  expenseBudget: {
    fontSize: 12,
  },
  diffPositive: {
    fontWeight: "600",
    fontSize: 14,
    color: "#059669",
  },
  diffNegative: {
    fontWeight: "600",
    fontSize: 14,
    color: "#ef4444",
  },
  investmentItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  investmentPlatform: {
    fontWeight: "500",
    fontSize: 14,
  },
  investmentDescription: {
    fontSize: 12,
  },
  investmentAmount: {
    fontWeight: "500",
    fontSize: 14,
  },
  investmentCategory: {
    fontSize: 12,
  },
  investmentStatus: {
    color: "#059669",
    fontSize: 16,
  },
  totalContainer: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  totalText: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
  summaryContainer: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    lineHeight: 20,
  },
  footerContainer: {
    alignItems: "center",
    paddingVertical: 16,
  },
  footerText: {
    fontSize: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "bold",
  },
});

export default function DashboardScreen({ navigation }) {
  const user = getCurrentUser();
  const uid = user?.uid;
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [monthlyData, setMonthlyData] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());
  const [showIncomeAmount, setShowIncomeAmount] = useState(false);
  const [showBalanceAmount, setShowBalanceAmount] = useState(false);
  const [showSavingsAmount, setShowSavingsAmount] = useState(false);
  const [showExpenseAmount, setShowExpenseAmount] = useState(false);
  const [showOtherAllocations, setShowOtherAllocations] = useState(false);
  const [allSpending, setAllSpending] = useState([]);
  const [investments, setInvestments] = useState([]);
  const [showRecordMenu, setShowRecordMenu] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!uid) return;
    try {
      const data = await getUserProfile(uid);
      setProfile(data);
    } catch (error) {
      console.error("Failed to fetch profile:", error);
    } finally {
      setProfileLoading(false);
    }
  }, [uid]);

  const fetchMonthlyData = useCallback(async () => {
    if (!uid) return;
    try {
      const [data, spendingData, invData] = await Promise.all([
        getMonthlySummary(uid, selectedMonth),
        getSpending(uid, selectedMonth),
        getInvestments(uid, selectedMonth),
      ]);

      if (data) {
        setMonthlyData(data);
      } else {
        setMonthlyData(null);
      }

      setAllSpending(spendingData || []);
      setInvestments(invData || []);
    } catch (error) {
      console.error("Failed to fetch monthly data:", error);
      setMonthlyData(null);
      setAllSpending([]);
      setInvestments([]);
    } finally {
      setLoading(false);
    }
  }, [uid, selectedMonth]);

  // Fetch user profile on mount and when screen is focused
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
      fetchMonthlyData();
    }, [fetchProfile, fetchMonthlyData]),
  );

  // Fetch monthly summary for selected month
  useEffect(() => {
    fetchMonthlyData();
  }, [fetchMonthlyData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchProfile(), fetchMonthlyData()]);
    setRefreshing(false);
  }, [fetchProfile, fetchMonthlyData]);

  const financialData = monthlyData
    ? {
        income: monthlyData.income || 0,
        balance: monthlyData.balance || 0,
        savingsInvestments:
          (monthlyData.savingsAmount || 0) +
          (monthlyData.investmentAmount || 0),
        expenses: {
          allocated: monthlyData.expensesAmount || 0,
          spent: allSpending.reduce(
            (sum, spending) =>
              sum + (spending.totalSpending || spending.amount || 0),
            0,
          ),
          remaining:
            (monthlyData.expensesAmount || 0) -
            allSpending.reduce(
              (sum, spending) =>
                sum + (spending.totalSpending || spending.amount || 0),
              0,
            ),
        },
        expenseBreakdown: [], // we don't have breakdown in monthly summary yet
        investments: [], // we don't have investments in monthly summary yet
      }
    : null;

  const expenseProgress =
    financialData && financialData.expenses.allocated > 0
      ? financialData.expenses.spent / financialData.expenses.allocated
      : 0;

  const calculateDynamicExpensePercentage = () => {
    if (!financialData) return 0;
    const spent = financialData.expenses.spent;
    const remaining = financialData.expenses.remaining;
    const total = spent + remaining;
    if (total <= 0) return 0;
    return (spent / total) * 100;
  };
  const exactExpensePercentage = calculateDynamicExpensePercentage();

  // Currency from profile, default to KES
  const currencyCode = profile?.currency || "KES";

  // Dynamic currency formatter
  const fmt = useMemo(() => {
    return (amount) =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currencyCode,
        minimumFractionDigits: 2,
      }).format(amount);
  }, [currencyCode]);

  // Display name: prefer username from profile, then displayName from auth, then email prefix
  const displayName =
    profile?.username ||
    profile?.displayName ||
    user?.displayName ||
    user?.email?.split("@")[0] ||
    "User";

  const changeMonth = (direction) => {
    const [year, month] = selectedMonth.split("-").map(Number);
    let newYear = year;
    let newMonth = month + direction;
    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }
    setSelectedMonth(`${newYear}-${String(newMonth).padStart(2, "0")}`);
    setLoading(true);
  };

  const handleEditRecord = () => {
    setShowRecordMenu(false);
    navigation.navigate("MonthlyRecord", {
      month: selectedMonth,
      editing: true,
    });
  };

  const handleDeleteRecord = () => {
    setShowRecordMenu(false);
    Alert.alert(
      "Delete Monthly Record",
      `Delete the record for ${formatMonthName(selectedMonth)}? This removes the income and allocation for this month. Recorded expenses and investments are not deleted.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (!uid) return;
            try {
              await deleteMonthlySummary(uid, selectedMonth);
              await fetchMonthlyData();
              Alert.alert("Deleted", "Monthly record deleted.");
            } catch (error) {
              console.error("Failed to delete monthly record:", error);
              Alert.alert("Error", "Failed to delete monthly record");
            }
          },
        },
      ],
    );
  };

  if (loading || profileLoading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: theme.colors.background, paddingTop: insets.top },
        ]}
      >
        <ActivityIndicator size="large" color={theme.colors.tabBarActive} />
        <Text style={{ marginTop: 12, color: theme.colors.textSecondary }}>
          Loading monthly data...
        </Text>
      </View>
    );
  }

  if (!financialData) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: theme.colors.background, paddingTop: insets.top },
        ]}
      >
        <StatusBar style={theme.isDark ? "light" : "dark"} />
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View
            style={[
              styles.headerContainer,
              {
                backgroundColor: theme.colors.card,
                borderBottomColor: theme.colors.border,
              },
            ]}
          >
            <View style={styles.headerRow}>
              <View>
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
              <TouchableOpacity
                onPress={logoutUser}
                style={[
                  styles.signOutButton,
                  { borderColor: theme.colors.border },
                ]}
              >
                <Ionicons name="log-out-outline" size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>
            <Text
              style={[
                styles.headerSubtitle,
                { color: theme.colors.textSecondary },
              ]}
            >
              Monthly Financial Overview
            </Text>
            <View style={styles.monthPickerContainer}>
              <TouchableOpacity
                style={[
                  styles.monthButton,
                  { backgroundColor: theme.colors.tabBarActive },
                ]}
                onPress={() => changeMonth(-1)}
              >
                <Text style={[styles.monthButtonText, { color: "#ffffff" }]}>
                  ‹
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setPickerYear(parseInt(selectedMonth.split("-")[0]));
                  setShowMonthPicker(true);
                }}
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
                onPress={() => changeMonth(1)}
              >
                <Text style={[styles.monthButtonText, { color: "#ffffff" }]}>
                  ›
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.addRecordButton,
                  { backgroundColor: theme.colors.tabBarActive },
                ]}
                onPress={() => navigation.navigate("MonthlyRecord", { month: selectedMonth })}
              >
                <Text style={styles.addRecordButtonText}>+ Add Record</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.contentContainer}>
            <View
              style={[
                styles.cardWhite,
                {
                  backgroundColor: theme.colors.card,
                  alignItems: "center",
                  paddingVertical: 40,
                },
              ]}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "bold",
                  color: theme.colors.text,
                  marginBottom: 12,
                }}
              >
                No monthly data for {selectedMonth}
              </Text>
              <Text
                style={{
                  color: theme.colors.textSecondary,
                  textAlign: "center",
                  marginBottom: 24,
                }}
              >
                Create a monthly record to start tracking your income, savings,
                investments, and expenses.
              </Text>
              <TouchableOpacity
                style={[
                  styles.addRecordButton,
                  {
                    backgroundColor: "#10b981",
                    paddingHorizontal: 24,
                    paddingVertical: 12,
                  },
                ]}
                onPress={() => navigation.navigate("MonthlyRecord", { month: selectedMonth })}
              >
                <Text style={styles.addRecordButtonText}>
                  Create Monthly Record
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background, paddingTop: insets.top },
      ]}
    >
      <StatusBar style={theme.isDark ? "light" : "dark"} />

      {/* Header with Month Navigation */}
      <View
        style={[
          styles.headerContainer,
          {
            backgroundColor: theme.colors.card,
            borderBottomColor: theme.colors.border,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <View style={styles.userInfo}>
            <View style={styles.userHeader}>
              <TouchableOpacity onPress={() => navigation.navigate("Profile")}>
                <View
                  style={[
                    styles.profilePhotoPlaceholder,
                    {
                      backgroundColor: theme.colors.card,
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.avatarText,
                      { color: generateAvatar(displayName, theme).color },
                    ]}
                  >
                    {generateAvatar(displayName, theme).text}
                  </Text>
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
            onPress={logoutUser}
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
            onPress={() => changeMonth(-1)}
          >
            <Text style={[styles.monthButtonText, { color: "#ffffff" }]}>
              ‹
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setPickerYear(parseInt(selectedMonth.split("-")[0]));
              setShowMonthPicker(true);
            }}
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
            onPress={() => changeMonth(1)}
          >
            <Text style={[styles.monthButtonText, { color: "#ffffff" }]}>
              ›
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.addRecordButton,
              { backgroundColor: theme.colors.tabBarActive },
            ]}
            onPress={() => navigation.navigate("MonthlyRecord", { month: selectedMonth })}
          >
            <Text style={styles.addRecordButtonText}>+ Add Record</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.recordMenuButton, { borderColor: theme.colors.border }]}
            onPress={() => setShowRecordMenu(true)}
          >
            <Ionicons
              name="ellipsis-vertical"
              size={18}
              color={theme.colors.text}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.contentContainer}>
          {/* ── Income Card ── */}
          <View
            style={[styles.cardGreen, { backgroundColor: theme.colors.card }]}
          >
            <View style={styles.cardHeader}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons
                  name="wallet-outline"
                  size={20}
                  color={theme.colors.text}
                  style={{ marginRight: 8 }}
                />
                <Text
                  style={[styles.sectionTitle, { color: theme.colors.text }]}
                >
                  Income for {formatMonthName(selectedMonth)}
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.cardToggle,
                  { borderColor: theme.colors.border },
                ]}
                onPress={() => setShowIncomeAmount(!showIncomeAmount)}
              >
                <Ionicons
                  name={showIncomeAmount ? "eye-off-outline" : "eye-outline"}
                  size={16}
                  color={theme.colors.tabBarActive}
                />
              </TouchableOpacity>
            </View>
            <Text
              style={[styles.cardValue, { color: "#10b981" }]}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {showIncomeAmount ? fmt(financialData.income) : "••••••"}
            </Text>
            {showIncomeAmount &&
              Array.isArray(monthlyData?.incomeSources) &&
              monthlyData.incomeSources.length > 1 && (
                <View
                  style={{
                    marginTop: 12,
                    paddingTop: 12,
                    borderTopWidth: 1,
                    borderTopColor: theme.colors.border,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      color: theme.colors.textSecondary,
                      marginBottom: 8,
                      fontWeight: "600",
                    }}
                  >
                    Income Sources:
                  </Text>
                  {monthlyData.incomeSources.map((src, idx) => (
                    <View
                      key={idx}
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        marginBottom: 4,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          color: theme.colors.text,
                          flex: 1,
                        }}
                        numberOfLines={1}
                      >
                        {src.name}
                      </Text>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text
                          style={{
                            fontSize: 13,
                            color: theme.colors.text,
                            fontWeight: "500",
                          }}
                        >
                          {fmt(src.amount || 0)}
                        </Text>
                        <Text
                          style={{
                            fontSize: 11,
                            color: theme.colors.textSecondary,
                          }}
                        >
                          {financialData.income > 0
                            ? Math.round(
                                ((src.amount || 0) / financialData.income) * 100,
                              )
                            : 0}
                          %
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
          </View>

          {/* ── Savings & Investments Card ── */}
          <View
            style={[styles.cardPurple, { backgroundColor: theme.colors.card }]}
          >
            <View style={styles.cardHeader}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons
                  name="trending-up-outline"
                  size={20}
                  color={theme.colors.text}
                  style={{ marginRight: 8 }}
                />
                <Text
                  style={[styles.sectionTitle, { color: theme.colors.text }]}
                >
                  Investments
                </Text>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={[
                    styles.cardToggle,
                    { borderColor: theme.colors.border },
                  ]}
                  onPress={() => setShowSavingsAmount(!showSavingsAmount)}
                >
                  <Ionicons
                    name={showSavingsAmount ? "eye-off-outline" : "eye-outline"}
                    size={16}
                    color={theme.colors.tabBarActive}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    { borderColor: theme.colors.border },
                  ]}
                  onPress={() =>
                    navigation.navigate("AddInvestment", { selectedMonth })
                  }
                >
                  <Ionicons
                    name="add-outline"
                    size={16}
                    color={theme.colors.tabBarActive}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    { borderColor: theme.colors.border },
                  ]}
                  onPress={() =>
                    navigation.navigate("InvestmentsDetail", { selectedMonth })
                  }
                >
                  <Ionicons
                    name="chevron-forward-outline"
                    size={16}
                    color={theme.colors.tabBarActive}
                  />
                </TouchableOpacity>
              </View>
            </View>
            <Text
              style={[styles.cardValue, { color: theme.colors.text }]}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {showSavingsAmount
                ? fmt(financialData.savingsInvestments)
                : "••••••"}
            </Text>
            {showSavingsAmount && (
              <Text
                style={[
                  styles.cardSubtitle,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {financialData.income > 0
                  ? Math.round(
                      (financialData.savingsInvestments /
                        financialData.income) *
                        100,
                    )
                  : 0}
                % of income
              </Text>
            )}
            {investments.length > 0 && (
              <View
                style={{
                  marginTop: 12,
                  paddingTop: 12,
                  borderTopWidth: 1,
                  borderTopColor: theme.colors.border,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    color: theme.colors.textSecondary,
                    marginBottom: 8,
                    fontWeight: "600",
                  }}
                >
                  Portfolio Overview:
                </Text>
                {investments.slice(0, 3).map((inv, idx) => (
                  <View
                    key={idx}
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginBottom: 4,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        color: theme.colors.text,
                        flex: 1,
                      }}
                      numberOfLines={1}
                    >
                      {inv.platform} ({inv.category})
                    </Text>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text
                        style={{
                          fontSize: 13,
                          color: theme.colors.text,
                          fontWeight: "500",
                        }}
                      >
                        {showSavingsAmount ? fmt(inv.amount) : "•••"}
                      </Text>
                      {showSavingsAmount && (
                        <Text
                          style={{
                            fontSize: 11,
                            color: theme.colors.textSecondary,
                          }}
                        >
                          {financialData.savingsInvestments > 0
                            ? Math.round(
                                ((inv.amount || 0) /
                                  financialData.savingsInvestments) *
                                  100,
                              )
                            : 0}
                          %
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
                {investments.length > 3 && (
                  <Text
                    style={{
                      fontSize: 12,
                      color: theme.colors.tabBarActive,
                      marginTop: 4,
                    }}
                  >
                    + {investments.length - 3} more...
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* ── Expenses Overview ── */}
          <View
            style={[styles.cardWhite, { backgroundColor: theme.colors.card }]}
          >
            <View style={styles.cardHeader}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons
                  name="cart-outline"
                  size={20}
                  color={theme.colors.text}
                  style={{ marginRight: 8 }}
                />
                <Text
                  style={[styles.sectionTitle, { color: theme.colors.text }]}
                >
                  Expenses
                </Text>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    { borderColor: theme.colors.border },
                  ]}
                  onPress={() => setShowExpenseAmount(!showExpenseAmount)}
                >
                  <Ionicons
                    name={showExpenseAmount ? "eye-off-outline" : "eye-outline"}
                    size={16}
                    color={theme.colors.tabBarActive}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    { borderColor: theme.colors.border },
                  ]}
                  onPress={() =>
                    navigation.navigate("AddExpense", { selectedMonth })
                  }
                >
                  <Ionicons
                    name="add-outline"
                    size={16}
                    color={theme.colors.tabBarActive}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    { borderColor: theme.colors.border },
                  ]}
                  onPress={() =>
                    navigation.navigate("ExpensesDetail", { selectedMonth })
                  }
                >
                  <Ionicons
                    name="chevron-forward-outline"
                    size={16}
                    color={theme.colors.tabBarActive}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.expenseSummary}>
              <View style={styles.summaryRow}>
                <Text
                  style={[
                    styles.summaryLabel,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Allocated:
                </Text>
                <View style={styles.amountWithPercentage}>
                  <Text
                    style={[styles.summaryValue, { color: theme.colors.text }]}
                  >
                    {showExpenseAmount
                      ? fmt(financialData.expenses.allocated)
                      : "•••••"}
                  </Text>
                  {showExpenseAmount && (
                    <Text
                      style={[
                        styles.summaryPercentage,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      (
                      {financialData.income > 0
                        ? Math.round(
                            (financialData.expenses.allocated /
                              financialData.income) *
                              100,
                          )
                        : 0}
                      % of income)
                    </Text>
                  )}
                </View>
              </View>
              <View style={styles.summaryRow}>
                <Text
                  style={[
                    styles.summaryLabel,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Spent:
                </Text>
                <View style={styles.amountWithPercentage}>
                  <Text
                    style={[styles.summaryValue, { color: theme.colors.text }]}
                  >
                    {showExpenseAmount
                      ? fmt(financialData.expenses.spent)
                      : "•••••"}
                  </Text>
                  {showExpenseAmount && (
                    <Text
                      style={[
                        styles.summaryPercentage,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      ({Math.round(exactExpensePercentage)}%)
                    </Text>
                  )}
                </View>
              </View>
              <View style={[styles.summaryRow, styles.balanceRow]}>
                <Text
                  style={[
                    styles.summaryLabel,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Remaining:
                </Text>
                <View style={styles.amountWithPercentage}>
                  <Text
                    style={[
                      styles.summaryValue,
                      {
                        color:
                          financialData.expenses.allocated -
                            financialData.expenses.spent >=
                          0
                            ? "#10b981"
                            : "#ef4444",
                      },
                    ]}
                  >
                    {showExpenseAmount
                      ? fmt(financialData.expenses.remaining)
                      : "•••••"}
                  </Text>
                  {showExpenseAmount && (
                    <Text
                      style={[
                        styles.summaryPercentage,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      ({Math.round(100 - exactExpensePercentage)}%)
                    </Text>
                  )}
                </View>
              </View>
            </View>
          </View>

          {/* ── Other Allocations (custom categories) ── */}
          {Array.isArray(monthlyData?.allocations) &&
            monthlyData.allocations.filter((a) => a.key === "custom").length >
              0 && (
              <View
                style={[styles.cardWhite, { backgroundColor: theme.colors.card }]}
              >
                <View style={styles.cardHeader}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Ionicons
                      name="pricetags-outline"
                      size={20}
                      color={theme.colors.text}
                      style={{ marginRight: 8 }}
                    />
                    <Text
                      style={[styles.sectionTitle, { color: theme.colors.text }]}
                    >
                      Other Allocations
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.cardToggle,
                      { borderColor: theme.colors.border },
                    ]}
                    onPress={() =>
                      setShowOtherAllocations(!showOtherAllocations)
                    }
                  >
                    <Ionicons
                      name={
                        showOtherAllocations
                          ? "eye-off-outline"
                          : "eye-outline"
                      }
                      size={16}
                      color={theme.colors.tabBarActive}
                    />
                  </TouchableOpacity>
                </View>
                {monthlyData.allocations
                  .filter((a) => a.key === "custom")
                  .map((a, idx) => (
                    <View key={idx} style={styles.summaryRow}>
                      <Text
                        style={[
                          styles.summaryLabel,
                          { color: theme.colors.textSecondary },
                        ]}
                        numberOfLines={1}
                      >
                        {a.name}
                      </Text>
                      <View style={styles.amountWithPercentage}>
                        <Text
                          style={[
                            styles.summaryValue,
                            { color: theme.colors.text },
                          ]}
                        >
                          {showOtherAllocations ? fmt(a.amount || 0) : "•••••"}
                        </Text>
                        {showOtherAllocations && (
                          <Text
                            style={[
                              styles.summaryPercentage,
                              { color: theme.colors.textSecondary },
                            ]}
                          >
                            ({Math.round(a.percent || 0)}% of income)
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
              </View>
            )}

          {/* ── Balance Card ── */}
          <View
            style={[styles.cardBlue, { backgroundColor: theme.colors.card }]}
          >
            <View style={styles.cardHeader}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={20}
                  color={theme.colors.text}
                  style={{ marginRight: 8 }}
                />
                <Text
                  style={[styles.sectionTitle, { color: theme.colors.text }]}
                >
                  Savings/Unallocated
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.cardToggle,
                  { borderColor: theme.colors.border },
                ]}
                onPress={() => setShowBalanceAmount(!showBalanceAmount)}
              >
                <Ionicons
                  name={showBalanceAmount ? "eye-off-outline" : "eye-outline"}
                  size={16}
                  color={theme.colors.tabBarActive}
                />
              </TouchableOpacity>
            </View>
            <Text
              style={[styles.cardValue, { color: theme.colors.text }]}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {showBalanceAmount ? fmt(financialData.balance) : "••••••"}
            </Text>
            <Text
              style={[
                styles.cardSubtitle,
                { color: theme.colors.textSecondary },
              ]}
            >
              {financialData.income > 0
                ? Math.round(
                    (financialData.balance / financialData.income) * 100,
                  )
                : 0}
              % of income
            </Text>
          </View>

          {/* ── Summary ── */}
          <View
            style={[
              styles.summaryContainer,
              { backgroundColor: theme.colors.tabBarActive },
            ]}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <Text
                style={[
                  styles.summaryTitle,
                  { color: theme.colors.text, marginBottom: 0 },
                ]}
              >
                Monthly Summary
              </Text>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate("Reports", { selectedMonth })
                }
                style={{
                  backgroundColor: "rgba(255,255,255,0.2)",
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 16,
                }}
              >
                <Text
                  style={{ color: "#fff", fontSize: 13, fontWeight: "bold" }}
                >
                  View Reports
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.summaryText, { color: "#c7d2fe" }]}>
              You've invested {fmt(financialData.savingsInvestments)} this month
              —{" "}
              {financialData.income > 0
                ? Math.round(
                    (financialData.savingsInvestments / financialData.income) *
                      100,
                  )
                : 0}
              % of your income. Expenses are at{" "}
              {Math.round(exactExpensePercentage)}% with{" "}
              {fmt(financialData.expenses.remaining)} remaining.
            </Text>
          </View>

          {/* ── Footer ── */}
          <View style={styles.footerContainer}>
            <Text
              style={[styles.footerText, { color: theme.colors.textSecondary }]}
            >
              Updated: {selectedMonth}
            </Text>
          </View>
        </View>
      </ScrollView>

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

      {/* Monthly Record Actions Menu */}
      <Modal
        visible={showRecordMenu}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowRecordMenu(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)" }}
          activeOpacity={1}
          onPress={() => setShowRecordMenu(false)}
        >
          <View
            style={[
              styles.recordMenu,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
                top: insets.top + 60,
              },
            ]}
          >
            <TouchableOpacity
              style={styles.recordMenuItem}
              onPress={handleEditRecord}
            >
              <Ionicons
                name="create-outline"
                size={20}
                color={theme.colors.text}
              />
              <Text style={[styles.recordMenuText, { color: theme.colors.text }]}>
                Edit Record
              </Text>
            </TouchableOpacity>
            <View
              style={{ height: 1, backgroundColor: theme.colors.border }}
            />
            <TouchableOpacity
              style={styles.recordMenuItem}
              onPress={handleDeleteRecord}
            >
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
              <Text style={[styles.recordMenuText, { color: "#ef4444" }]}>
                Delete Record
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
