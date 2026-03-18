import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { getCurrentUser } from '../services/authService';

const AddExpenseScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [expenses, setExpenses] = useState([
    { id: 1, category: 'Food & Groceries', amount: '', allocation: 0 },
    { id: 2, category: 'Transportation', amount: '', allocation: 0 },
    { id: 3, category: 'Utilities', amount: '', allocation: 0 },
    { id: 4, category: 'Entertainment', amount: '', allocation: 0 },
    { id: 5, category: 'Healthcare', amount: '', allocation: 0 },
  ]);
  const [loading, setLoading] = useState(false);

  const updateExpenseAmount = (id, amount) => {
    const updatedExpenses = expenses.map(expense => 
      expense.id === id ? { ...expense, amount } : expense
    );
    setExpenses(updatedExpenses);
  };

  const updateExpenseAllocation = (id, allocation) => {
    const updatedExpenses = expenses.map(expense => 
      expense.id === id ? { ...expense, allocation } : expense
    );
    setExpenses(updatedExpenses);
  };

  const handleSave = () => {
    setLoading(true);
    // TODO: Save to backend
    setTimeout(() => {
      setLoading(false);
      Alert.alert('Success', 'Expense categories saved!');
      navigation.goBack();
    }, 1000);
  };

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
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Add Expense Categories</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Set up your expense categories and monthly allocations
        </Text>

        {expenses.map((expense) => (
          <View key={expense.id} style={styles.expenseRow}>
            <View style={styles.expenseInfo}>
              <Text style={[styles.categoryText, { color: theme.colors.text }]}>{expense.category}</Text>
            </View>
            <View style={styles.expenseInputs}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Monthly Amount:</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
                  placeholder="0.00"
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="numeric"
                  value={expense.amount}
                  onChangeText={(amount) => updateExpenseAmount(expense.id, amount)}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Allocation (%):</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
                  placeholder="0"
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="numeric"
                  value={expense.allocation.toString()}
                  onChangeText={(allocation) => updateExpenseAllocation(expense.id, parseFloat(allocation) || 0)}
                />
              </View>
            </View>
          </View>
        ))}

        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: loading ? theme.colors.textSecondary : theme.colors.tabBarActive }]}
          onPress={handleSave}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>
            {loading ? 'Saving...' : 'Save Expense Categories'}
          </Text>
        </TouchableOpacity>
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
  subtitle: {
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
  },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  expenseInfo: {
    flex: 1,
  },
  expenseInputs: {
    flexDirection: 'row',
    gap: 16,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
  },
  saveButton: {
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AddExpenseScreen;
