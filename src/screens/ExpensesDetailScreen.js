import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { getCurrentUser } from '../services/authService';

const ExpensesDetailScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [expenses, setExpenses] = useState([
    { id: 1, category: 'Food & Groceries', allocated: 15000, spent: 12000, percentage: 25 },
    { id: 2, category: 'Transportation', allocated: 8000, spent: 8500, percentage: 13 },
    { id: 3, category: 'Utilities', allocated: 5000, spent: 5000, percentage: 8 },
    { id: 4, category: 'Entertainment', allocated: 3000, spent: 3200, percentage: 5 },
    { id: 5, category: 'Healthcare', allocated: 2000, spent: 1500, percentage: 3 },
  ]);

  const totalAllocated = expenses.reduce((sum, expense) => sum + expense.allocated, 0);
  const totalSpent = expenses.reduce((sum, expense) => sum + expense.spent, 0);
  const totalRemaining = totalAllocated - totalSpent;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <StatusBar style="auto" />
      
      {/* Header */}
      <View style={styles.headerContainer}>
        <TouchableOpacity
          style={[styles.backButton, { borderColor: theme.colors.border }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={20} color={theme.colors.tabBarActive} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Expense Details</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Summary */}
        <View style={[styles.summaryCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.summaryTitle, { color: theme.colors.textSecondary }]}>Expense Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Total Allocated:</Text>
            <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
              KES {totalAllocated.toLocaleString()}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Total Spent:</Text>
            <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
              KES {totalSpent.toLocaleString()}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Remaining:</Text>
            <Text style={[styles.summaryValue, totalRemaining >= 0 ? styles.positive : styles.negative]}>
              KES {totalRemaining.toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Categories */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Categories</Text>
        {expenses.map((expense) => (
          <View key={expense.id} style={[styles.expenseCard, { backgroundColor: theme.colors.card }]}>
            <View style={styles.expenseHeader}>
              <Text style={[styles.expenseCategory, { color: theme.colors.text }]}>{expense.category}</Text>
              <Text style={[styles.expensePercentage, { color: theme.colors.textSecondary }]}>
                {expense.percentage}% of total expenses
              </Text>
            </View>
            
            <View style={styles.expenseDetails}>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Allocated:</Text>
                <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                  KES {expense.allocated.toLocaleString()}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Spent:</Text>
                <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                  KES {expense.spent.toLocaleString()}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Remaining:</Text>
                <Text style={[styles.detailValue, (expense.allocated - expense.spent) >= 0 ? styles.positive : styles.negative]}>
                  KES {(expense.allocated - expense.spent).toLocaleString()}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  scrollContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  summaryCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  expenseCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  expenseCategory: {
    fontSize: 16,
    fontWeight: '600',
  },
  expensePercentage: {
    fontSize: 14,
    fontWeight: '500',
  },
  expenseDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  positive: {
    color: '#10b981',
  },
  negative: {
    color: '#ef4444',
  },
});

export default ExpensesDetailScreen;
