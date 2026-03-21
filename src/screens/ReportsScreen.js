import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, StatusBar, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { getCurrentUser } from '../services/authService';
import { getMonthlySummary, getSpending, getInvestments } from '../services/firestoreService';

const ReportsScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const user = getCurrentUser();
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [reportData, setReportData] = useState(null);

  const formatMonthName = (monthString) => {
    const [year, month] = monthString.split('-').map(Number);
    const date = new Date(year, month - 1);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  const fmt = (val) => val ? `KES ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'KES 0.00';

  const fetchData = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const [summary, spendings, invs] = await Promise.all([
        getMonthlySummary(user.uid, selectedMonth),
        getSpending(user.uid),
        getInvestments(user.uid)
      ]);
      setReportData({ summary, spendings: spendings || [], investments: invs || [] });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user?.uid, selectedMonth]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.tabBarActive} />
        <Text style={{ marginTop: 12, color: theme.colors.textSecondary }}>Generating AI Report...</Text>
      </View>
    );
  }

  if (!reportData?.summary) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
        <View style={[styles.headerContainer, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.tabBarActive} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Intelligence Report</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ color: theme.colors.text, fontSize: 16 }}>No data found for {formatMonthName(selectedMonth)}.</Text>
        </View>
      </View>
    );
  }

  const { summary, spendings, investments } = reportData;
  const totalAllocated = summary.expensesAmount || 0;
  const spent = spendings.reduce((acc, curr) => acc + (curr.totalSpending || curr.amount || 0), 0);
  const totalTxnCosts = spendings.reduce((acc, curr) => acc + (curr.transactionCosts || 0), 0);
  
  // Basic AI logic inference block
  const isOverSpent = spent > totalAllocated;
  const savingsInvestments = (summary.savingsAmount || 0) + (summary.investmentAmount || 0);
  const savingsRate = summary.income > 0 ? (savingsInvestments / summary.income) * 100 : 0;
  
  // Categorize
  const categoryTotals = {};
  spendings.forEach(s => {
    categoryTotals[s.category] = (categoryTotals[s.category] || 0) + (s.totalSpending || s.amount || 0);
  });
  const highestCategoryObj = Object.keys(categoryTotals).sort((a,b) => categoryTotals[b] - categoryTotals[a])[0];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <View style={[styles.headerContainer, { borderBottomColor: theme.colors.border, borderBottomWidth: 1, backgroundColor: theme.colors.card }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.tabBarActive} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Insights & Reports</Text>
        <View style={{ width: 40 }} />
      </View>
      
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16 }}>
        <Text style={{ fontSize: 22, fontWeight: 'bold', color: theme.colors.text, marginBottom: 16 }}>
          {formatMonthName(selectedMonth)}
        </Text>

        <View style={[styles.insightCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, borderWidth: 1 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Ionicons name="bulb-outline" size={24} color="#f59e0b" style={{ marginRight: 8 }} />
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.colors.text }}>AI Recommendations</Text>
          </View>
          <Text style={{ color: theme.colors.text, fontSize: 14, lineHeight: 22, marginBottom: 8 }}>
            {isOverSpent ? 
              `⚠️ You have OVERSPENT your total expense budget by ${fmt(spent - totalAllocated)}. Focus on strictly cutting down your highest spending area.` 
              : 
              `✅ Excellent budgeting! You are currently mathematically under budget by ${fmt(totalAllocated - spent)}.`
            }
          </Text>
          <Text style={{ color: theme.colors.text, fontSize: 14, lineHeight: 22, marginBottom: 8 }}>
            {savingsRate >= 20 ? 
              `🌟 You are saving ${savingsRate.toFixed(1)}% of your income! This perfectly matches elite 50/30/20 standard financial models.` 
              : 
              `📈 You are currently allocating ${savingsRate.toFixed(1)}% to investments. Financial experts recommend pushing this towards 20% by minimizing "${highestCategoryObj || 'miscellaneous'}" items next month.`
            }
          </Text>
          <Text style={{ color: theme.colors.text, fontSize: 14, lineHeight: 22 }}>
            💡 Highest Expenditure Area: <Text style={{ fontWeight: 'bold' }}>{highestCategoryObj || 'None yet'}</Text> ({fmt(categoryTotals[highestCategoryObj] || 0)})
          </Text>
        </View>

        <View style={[styles.sectionBlock, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, borderWidth: 1 }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Income Statement</Text>
          <View style={styles.row}>
            <Text style={{ color: theme.colors.textSecondary }}>Total Verified Income</Text>
            <Text style={{ color: '#10b981', fontWeight: 'bold' }}>{fmt(summary.income)}</Text>
          </View>
        </View>

        <View style={[styles.sectionBlock, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, borderWidth: 1 }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Expenditures Matrix</Text>
          <View style={styles.row}>
            <Text style={{ color: theme.colors.textSecondary }}>Maximum Allocation</Text>
            <Text style={{ color: theme.colors.text }}>{fmt(totalAllocated)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={{ color: theme.colors.textSecondary }}>Logged Spending</Text>
            <Text style={{ color: theme.colors.text, fontWeight: 'bold' }}>{fmt(spent)}</Text>
          </View>
          <View style={[styles.row, { borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 12, marginTop: 12 }]}>
            <Text style={{ color: theme.colors.textSecondary, fontWeight: 'bold' }}>Cash Available</Text>
            <Text style={{ color: (totalAllocated - spent) >= 0 ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>
              {fmt(totalAllocated - spent)}
            </Text>
          </View>
          <View style={[styles.row, { marginTop: 8 }]}>
            <Text style={{ color: theme.colors.textSecondary }}>Total Transaction Costs</Text>
            <Text style={{ color: '#ef4444' }}>{fmt(totalTxnCosts)}</Text>
          </View>
        </View>

        <View style={[styles.sectionBlock, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, borderWidth: 1 }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Capital Investments</Text>
          {investments.length > 0 ? investments.map((inv, idx) => (
            <View key={idx} style={[styles.row, { marginBottom: 8 }]}>
              <Text style={{ color: theme.colors.textSecondary }}>{inv.platform}</Text>
              <Text style={{ color: theme.colors.tabBarActive, fontWeight: '600' }}>{fmt(inv.amount)}</Text>
            </View>
          )) : <Text style={{ color: theme.colors.textSecondary }}>No dynamic investments mapped this month.</Text>}
        </View>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerContainer: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  insightCard: { padding: 16, borderRadius: 16, marginBottom: 16 },
  sectionBlock: { padding: 16, borderRadius: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }
});

export default ReportsScreen;
