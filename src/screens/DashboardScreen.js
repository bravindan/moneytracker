import { ScrollView, Text, View, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { getCurrentUser, logoutUser } from '../services/authService';
import { getMonthlySummary, getMonthlySummaries, getUserProfile } from '../services/firestoreService';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';





const getCurrentMonth = () => new Date().toISOString().slice(0, 7); // YYYY-MM

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  container: {
    flex: 1,
    backgroundColor: '#f9fafb', // bg-gray-50
  },
  scrollView: {
    flex: 1,
  },
  headerContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6', // gray-100
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerWelcome: {
    color: '#9ca3af', // gray-400
    fontSize: 12,
    marginBottom: 2,
  },
  headerName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827', // gray-900
  },
  signOutButton: {
    backgroundColor: '#fef2f2', // red-50
    borderWidth: 1,
    borderColor: '#fee2e2', // red-100
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  signOutText: {
    color: '#ef4444', // red-500
    fontWeight: '600',
    fontSize: 14,
  },
  headerSubtitle: {
    color: '#9ca3af', // gray-400
    fontSize: 12,
    marginTop: 8,
  },
  monthPickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingHorizontal: 4,
  },
  monthText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4f46e5',
  },
  monthButton: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  monthButtonText: {
    color: '#4f46e5',
    fontWeight: '600',
  },
  addRecordButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginLeft: 8,
  },
  addRecordButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  contentContainer: {
    padding: 16,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardGreen: {
    backgroundColor: '#dcfce7', // green-100
    padding: 16,
    borderRadius: 16,
    flex: 1,
    marginRight: 8,
  },
  cardBlue: {
    backgroundColor: '#dbeafe', // blue-100
    padding: 16,
    borderRadius: 16,
    flex: 1,
    marginLeft: 8,
  },
  cardPurple: {
    backgroundColor: '#e9d5ff', // purple-100
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  cardWhite: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardTitle: {
    color: '#6b7280', // gray-500
    fontSize: 11,
    marginBottom: 2,
  },
  cardValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937', // gray-800
    flexShrink: 1,
  },
  cardSubtitle: {
    color: '#6b7280', // gray-500
    fontSize: 11,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937', // gray-800
  },
  sectionSubtitle: {
    color: '#9ca3af', // gray-400
    fontSize: 12,
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: '#f3f4f6', // gray-100
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFillGreen: {
    height: '100%',
    backgroundColor: '#10b981', // green-500
  },
  progressBarFillRed: {
    height: '100%',
    backgroundColor: '#ef4444', // red-500
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  progressText: {
    color: '#9ca3af', // gray-400
    fontSize: 12,
  },
  breakdownTitle: {
    fontWeight: 'bold',
    color: '#374151', // gray-700
    fontSize: 14,
    marginBottom: 12,
  },
  expenseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f9fafb', // gray-50
  },
  expenseItemLeft: {
    flex: 1,
  },
  expenseItemName: {
    fontWeight: '500',
    color: '#1f2937', // gray-800
    fontSize: 14,
  },
  expenseItemCategory: {
    color: '#9ca3af', // gray-400
    fontSize: 12,
  },
  expenseItemRight: {
    alignItems: 'flex-end',
    marginRight: 16,
  },
  expenseAmount: {
    fontWeight: '500',
    color: '#1f2937', // gray-800
    fontSize: 14,
  },
  expenseBudget: {
    color: '#9ca3af', // gray-400
    fontSize: 12,
  },
  diffPositive: {
    fontWeight: '600',
    fontSize: 14,
    color: '#059669', // green-600
  },
  diffNegative: {
    fontWeight: '600',
    fontSize: 14,
    color: '#ef4444', // red-500
  },
  investmentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f9fafb', // gray-50
  },
  investmentPlatform: {
    fontWeight: '500',
    color: '#1f2937', // gray-800
    fontSize: 14,
  },
  investmentDescription: {
    color: '#9ca3af', // gray-400
    fontSize: 12,
  },
  investmentAmount: {
    fontWeight: '500',
    color: '#1f2937', // gray-800
    fontSize: 14,
  },
  investmentCategory: {
    color: '#9ca3af', // gray-400
    fontSize: 12,
  },
  investmentStatus: {
    color: '#059669', // green-600
    fontSize: 16,
  },
  totalContainer: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6', // gray-100
  },
  totalText: {
    color: '#6b7280', // gray-500
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  summaryContainer: {
    backgroundColor: '#4f46e5', // indigo-600
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  summaryTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  summaryText: {
    color: '#c7d2fe', // indigo-200
    fontSize: 14,
    lineHeight: 20,
  },
  footerContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  footerText: {
    color: '#d1d5db', // gray-300
    fontSize: 12,
  },
});

export default function DashboardScreen({ navigation }) {
  const user = getCurrentUser();
  const uid = user?.uid;
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [monthlyData, setMonthlyData] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!uid) return;
    setProfileLoading(true);
    try {
      const data = await getUserProfile(uid);
      setProfile(data);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setProfileLoading(false);
    }
  }, [uid]);

  const fetchMonthlyData = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    try {
      const data = await getMonthlySummary(uid, selectedMonth);
      if (data) {
        setMonthlyData(data);
      } else {
        setMonthlyData(null);
      }
    } catch (error) {
      console.error('Failed to fetch monthly summary:', error);
      setMonthlyData(null);
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
    }, [fetchProfile])
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
        savingsInvestments: (monthlyData.savingsAmount || 0) + (monthlyData.investmentAmount || 0),
        expenses: {
          allocated: monthlyData.expensesAmount || 0,
          spent: monthlyData.expensesAmount || 0, // using allocated as spent for now
          remaining: monthlyData.balance || 0,
        },
        expenseBreakdown: [], // we don't have breakdown in monthly summary yet
        investments: [], // we don't have investments in monthly summary yet
      }
    : null;

  const expenseProgress = financialData && financialData.expenses.allocated > 0 ? financialData.expenses.spent / financialData.expenses.allocated : 0;

  // Currency from profile, default to KES
  const currencyCode = profile?.currency || 'KES';

  // Dynamic currency formatter
  const fmt = useMemo(() => {
    return (amount) =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 2,
      }).format(amount);
  }, [currencyCode]);

  // Display name: prefer username from profile, then displayName from auth, then email prefix
  const displayName =
    profile?.username ||
    profile?.displayName ||
    user?.displayName ||
    user?.email?.split('@')[0] ||
    'User';

  const changeMonth = (direction) => {
    const [year, month] = selectedMonth.split('-').map(Number);
    let newYear = year;
    let newMonth = month + direction;
    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }
    setSelectedMonth(`${newYear}-${String(newMonth).padStart(2, '0')}`);
  };

  if (loading || profileLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={{ marginTop: 12, color: '#6b7280' }}>Loading monthly data...</Text>
      </SafeAreaView>
    );
  }

  if (!financialData) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="auto" />
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View style={styles.headerContainer}>
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.headerWelcome}>Welcome back 👋</Text>
                <Text style={styles.headerName}>{displayName}</Text>
              </View>
              <TouchableOpacity
                onPress={logoutUser}
                style={styles.signOutButton}
              >
                <Ionicons name="log-out-outline" size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>
            <Text style={styles.headerSubtitle}>Monthly Financial Overview</Text>
            <View style={styles.monthPickerContainer}>
              <TouchableOpacity style={styles.monthButton} onPress={() => changeMonth(-1)}>
                <Text style={styles.monthButtonText}>‹ Previous</Text>
              </TouchableOpacity>
              <Text style={styles.monthText}>{selectedMonth}</Text>
              <TouchableOpacity style={styles.monthButton} onPress={() => changeMonth(1)}>
                <Text style={styles.monthButtonText}>Next ›</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.addRecordButton}
                onPress={() => navigation.navigate('MonthlyRecord')}
              >
                <Text style={styles.addRecordButtonText}>+ Add Record</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.contentContainer}>
            <View style={[styles.cardWhite, { alignItems: 'center', paddingVertical: 40 }]}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#374151', marginBottom: 12 }}>
                No monthly data for {selectedMonth}
              </Text>
              <Text style={{ color: '#6b7280', textAlign: 'center', marginBottom: 24 }}>
                Create a monthly record to start tracking your income, savings, investments, and expenses.
              </Text>
              <TouchableOpacity
                style={[styles.addRecordButton, { paddingHorizontal: 24, paddingVertical: 12 }]}
                onPress={() => navigation.navigate('MonthlyRecord')}
              >
                <Text style={styles.addRecordButtonText}>Create Monthly Record</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >

        {/* ── Top Header ── */}
        <View style={styles.headerContainer}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerWelcome}>Welcome back 👋</Text>
              <Text style={styles.headerName}>{displayName}</Text>
            </View>
            <TouchableOpacity
              onPress={logoutUser}
              style={styles.signOutButton}
            >
              <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            </TouchableOpacity>
          </View>
          <Text style={styles.headerSubtitle}>Monthly Financial Overview</Text>
          <View style={styles.monthPickerContainer}>
            <TouchableOpacity style={styles.monthButton} onPress={() => changeMonth(-1)}>
              <Text style={styles.monthButtonText}>‹ Previous</Text>
            </TouchableOpacity>
            <Text style={styles.monthText}>{selectedMonth}</Text>
            <TouchableOpacity style={styles.monthButton} onPress={() => changeMonth(1)}>
              <Text style={styles.monthButtonText}>Next ›</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.addRecordButton}
              onPress={() => navigation.navigate('MonthlyRecord')}
            >
              <Text style={styles.addRecordButtonText}>+ Add Record</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.contentContainer}>

          {/* ── Income & Balance Cards ── */}
          <View style={styles.cardRow}>
            <View style={styles.cardGreen}>
              <Text style={styles.cardTitle}>Monthly Income</Text>
              <Text style={styles.cardValue} numberOfLines={1} ellipsizeMode="tail">{fmt(financialData.income)}</Text>
            </View>
            <View style={styles.cardBlue}>
              <Text style={styles.cardTitle}>Current Balance</Text>
              <Text style={styles.cardValue} numberOfLines={1} ellipsizeMode="tail">{fmt(financialData.balance)}</Text>
            </View>
          </View>

          {/* ── Savings & Investments ── */}
          <View style={styles.cardPurple}>
            <Text style={styles.cardTitle}>Savings & Investments</Text>
            <Text style={styles.cardValue} numberOfLines={1} ellipsizeMode="tail">
              {fmt(financialData.savingsInvestments)}
            </Text>
            <Text style={styles.cardSubtitle}>
              {financialData.income > 0 ? Math.round((financialData.savingsInvestments / financialData.income) * 100) : 0}% of income
            </Text>
          </View>

          {/* ── Expenses Overview ── */}
          <View style={styles.cardWhite}>
            <View style={[styles.headerRow, { marginBottom: 16 }]}>
              <Text style={styles.sectionTitle}>Expenses</Text>
              <Text style={styles.sectionSubtitle}>
                {financialData.income > 0 ? Math.round((financialData.expenses.allocated / financialData.income) * 100) : 0}% of income
              </Text>
            </View>

            <View style={{ marginBottom: 16 }}>
              <View style={[styles.headerRow, { marginBottom: 4 }]}>
                <Text style={styles.progressText}>
                  Allocated: {fmt(financialData.expenses.allocated)}
                </Text>
                <Text style={styles.progressText}>
                  Spent: {fmt(financialData.expenses.spent)}
                </Text>
              </View>
              {/* Progress bar */}
              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    expenseProgress > 0.9 ? styles.progressBarFillRed : styles.progressBarFillGreen,
                    { width: `${Math.min(expenseProgress * 100, 100)}%` },
                  ]}
                />
              </View>
              <View style={styles.progressTextRow}>
                <Text style={styles.progressText}>
                  Remaining: {fmt(financialData.expenses.remaining)}
                </Text>
                <Text style={styles.progressText}>
                  {Math.round(expenseProgress * 100)}% spent
                </Text>
              </View>
            </View>

            {/* ── Expense Breakdown ── */}
            {financialData.expenseBreakdown.length > 0 && (
              <>
                <Text style={styles.breakdownTitle}>Breakdown</Text>
                {financialData.expenseBreakdown.map((item, i) => (
                  <View
                    key={i}
                    style={styles.expenseItem}
                  >
                    <View style={styles.expenseItemLeft}>
                      <Text style={styles.expenseItemName}>{item.item}</Text>
                      <Text style={styles.expenseItemCategory}>{item.category}</Text>
                    </View>
                    <View style={styles.expenseItemRight}>
                      <Text style={styles.expenseAmount}>{fmt(item.actual)}</Text>
                      <Text style={styles.expenseBudget}>Budget: {fmt(item.budget)}</Text>
                    </View>
                    <Text
                      style={item.diff >= 0 ? styles.diffPositive : styles.diffNegative}
                    >
                      {item.diff >= 0 ? `+${fmt(item.diff)}` : fmt(item.diff)}
                    </Text>
                  </View>
                ))}
              </>
            )}
          </View>

          {/* ── Investment Allocations ── */}
          {financialData.investments.length > 0 && (
            <View style={styles.cardWhite}>
              <Text style={[styles.sectionTitle, { marginBottom: 16 }]}>Investment Allocations</Text>
              {financialData.investments.map((inv, i) => (
                <View
                  key={i}
                  style={styles.investmentItem}
                >
                  <View style={styles.expenseItemLeft}>
                    <Text style={styles.investmentPlatform}>{inv.platform}</Text>
                    <Text style={styles.investmentDescription}>{inv.description}</Text>
                  </View>
                  <View style={styles.expenseItemRight}>
                    <Text style={styles.investmentAmount}>{fmt(inv.amount)}</Text>
                    <Text style={styles.investmentCategory}>{inv.category}</Text>
                  </View>
                  <Text style={styles.investmentStatus}>{inv.status}</Text>
                </View>
              ))}
              <View style={styles.totalContainer}>
                <Text style={styles.totalText}>
                  Total: {fmt(financialData.investments.reduce((sum, inv) => sum + inv.amount, 0))}
                </Text>
              </View>
            </View>
          )}

          {/* ── Summary ── */}
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryTitle}>Monthly Summary</Text>
            <Text style={styles.summaryText}>
              You've saved {fmt(financialData.savingsInvestments)} this month — {financialData.income > 0 ? Math.round((financialData.savingsInvestments / financialData.income) * 100) : 0}% of your income.
              Expenses are at {Math.round(expenseProgress * 100)}% of budget with{' '}
              {fmt(financialData.expenses.remaining)} remaining.
            </Text>
          </View>

          {/* ── Footer ── */}
          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>Updated: {selectedMonth}</Text>
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}