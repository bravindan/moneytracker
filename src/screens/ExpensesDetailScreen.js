import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
  FlatList,
  Modal,
  TextInput,
  DatePickerAndroid,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { getCurrentUser } from '../services/authService';
import { getExpenses, getMonthlySummary, addSpending, getSpendingByCategory, getSpending } from '../services/firestoreService';

const ExpensesDetailScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const user = getCurrentUser();
  
  // State for dynamic data
  const [expenses, setExpenses] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM format
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState(null);
  const [allSpending, setAllSpending] = useState([]);
  
  // Spending modal state
  const [showSpendingModal, setShowSpendingModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [spendingAmount, setSpendingAmount] = useState('');
  const [spendingDescription, setSpendingDescription] = useState('');
  const [spendingItemName, setSpendingItemName] = useState('');
  const [spendingDate, setSpendingDate] = useState(new Date());
  const [transactionCosts, setTransactionCosts] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Load expenses data from database
  useEffect(() => {
    const loadExpensesData = async () => {
      try {
        setLoading(true);
        
        // Get monthly summary first to get total allocated amount
        const data = await getMonthlySummary(user.uid, selectedMonth);
        setMonthlyData(data);
        const totalAllocatedAmount = data?.expensesAmount || 0;
        
        // Get expenses from dedicated expenses collection
        const expensesData = await getExpenses(user.uid);
        
        // Get all spending records
        const spendingData = await getSpending(user.uid);
        setAllSpending(spendingData);
        
        // Calculate percentages based on total allocated amount from monthly summary
        const expensesList = expensesData.map(expense => ({
          ...expense,
          percentage: totalAllocatedAmount > 0 ? ((expense.amount / totalAllocatedAmount) * 100).toFixed(1) : 0
        }));
        
        setExpenses(expensesList);
      } catch (error) {
        console.error('Failed to load expenses data:', error);
        setExpenses([]);
        setMonthlyData(null);
        setAllSpending([]);
      } finally {
        setLoading(false);
      }
    };

    loadExpensesData();
  }, [user.uid, selectedMonth]);

  const totalAllocated = monthlyData?.expensesAmount || 0;
  const totalSpent = allSpending.reduce((sum, spending) => sum + (spending.totalSpending || spending.amount || 0), 0);
  const totalRemaining = totalAllocated - totalSpent;

  // Calculate total spending for each category
  const calculateCategorySpent = (category) => {
    const categorySpending = allSpending.filter(spending => spending.category === category);
    return categorySpending.reduce((sum, spending) => sum + (spending.totalSpending || spending.amount || 0), 0);
  };

  // Handle add spending
  const handleAddSpending = (category) => {
    setSelectedCategory(category);
    setShowSpendingModal(true);
    setSpendingAmount('');
    setSpendingDescription('');
    setSpendingItemName('');
    setTransactionCosts('');
    setSpendingDate(new Date());
  };

  // Handle date selection
  const handleDateSelect = (date) => {
    setSpendingDate(date);
    setShowDatePicker(false);
  };

  // Show date picker
  const showDatePickerModal = () => {
    setShowDatePicker(true);
  };

  // Handle save spending
  const handleSaveSpending = async () => {
    if (!spendingAmount || parseFloat(spendingAmount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

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
        transactionCosts: transactionCost,
        totalSpending: totalSpending
      });
      
      Alert.alert('Success', 'Spending added successfully!');
      setShowSpendingModal(false);
      setSpendingAmount('');
      setSpendingDescription('');
      setSpendingItemName('');
      setTransactionCosts('');
    } catch (error) {
      console.error('Error saving spending:', error);
      Alert.alert('Error', 'Failed to save spending');
    }
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
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Expense Details</Text>
        <View style={styles.placeholder} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading expenses...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {/* Summary */}
          <View style={[styles.summaryCard, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.summaryTitle, { color: theme.colors.textSecondary }]}>Expense Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Total Allocated:</Text>
              <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
                KES {totalAllocated.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Total Spent:</Text>
              <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
                KES {totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Remaining:</Text>
              <Text style={[styles.summaryValue, totalRemaining >= 0 ? styles.positive : styles.negative]}>
                KES {totalRemaining.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>
          </View>

          {/* Categories */}
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Expense Categories {expenses.length > 0 && `(${expenses.length})`}
          </Text>
          {expenses.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                No expense categories recorded yet. Add expense categories to see them here.
              </Text>
            </View>
          ) : (
            expenses.map((expense, index) => (
              <View key={`${expense.category}-${index}`} style={[styles.expenseCard, { backgroundColor: theme.colors.card }]}>
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
                      KES {expense.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Spent:</Text>
                    <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                      KES {calculateCategorySpent(expense.category).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Remaining:</Text>
                    <Text style={[styles.detailValue, (expense.amount - calculateCategorySpent(expense.category)) >= 0 ? styles.positive : styles.negative]}>
                      KES {(expense.amount - calculateCategorySpent(expense.category)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Text>
                  </View>
                  <View style={styles.spendingButtonContainer}>
                    <TouchableOpacity
                      style={[styles.addSpendingButton, { backgroundColor: theme.colors.tabBarActive }]}
                      onPress={() => handleAddSpending(expense.category)}
                    >
                      <Ionicons name="add-circle-outline" size={16} color="#fff" />
                      <Text style={styles.addSpendingButtonText}>Add Spending</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.viewSpendingButton, { borderColor: theme.colors.border }]}
                      onPress={() => navigation.navigate('SpendingDetails', { category: expense.category })}
                    >
                      <Text style={[styles.viewSpendingButtonText, { color: theme.colors.tabBarActive }]}>View All</Text>
                      <Ionicons name="chevron-forward" size={14} color={theme.colors.tabBarActive} />
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
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                Add Spending - {selectedCategory}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowSpendingModal(false)}
              >
                <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Amount:</Text>
                <TextInput
                  style={[styles.input, { 
                    backgroundColor: theme.colors.background, 
                    borderColor: theme.colors.border, 
                    color: theme.colors.text 
                  }]}
                  placeholder="0.00"
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="numeric"
                  value={spendingAmount}
                  onChangeText={setSpendingAmount}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Description:</Text>
                <TextInput
                  style={[styles.input, { 
                    backgroundColor: theme.colors.background, 
                    borderColor: theme.colors.border, 
                    color: theme.colors.text 
                  }]}
                  placeholder="What did you spend on?"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={spendingDescription}
                  onChangeText={setSpendingDescription}
                  multiline
                  numberOfLines={3}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Item Name:</Text>
                <TextInput
                  style={[styles.input, { 
                    backgroundColor: theme.colors.background, 
                    borderColor: theme.colors.border, 
                    color: theme.colors.text 
                  }]}
                  placeholder="e.g., Coffee, Groceries, etc."
                  placeholderTextColor={theme.colors.textSecondary}
                  value={spendingItemName}
                  onChangeText={setSpendingItemName}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Transaction Costs (Optional):</Text>
                <TextInput
                  style={[styles.input, { 
                    backgroundColor: theme.colors.background, 
                    borderColor: theme.colors.border, 
                    color: theme.colors.text 
                  }]}
                  placeholder="e.g., delivery fee, service charge, etc."
                  placeholderTextColor={theme.colors.textSecondary}
                  value={transactionCosts}
                  onChangeText={setTransactionCosts}
                  keyboardType="numeric"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Date:</Text>
                <TouchableOpacity
                  style={[styles.dateInput, { 
                    backgroundColor: theme.colors.background, 
                    borderColor: theme.colors.border, 
                    color: theme.colors.text 
                  }]}
                  onPress={showDatePickerModal}
                >
                  <Text style={styles.dateText}>{spendingDate.toLocaleDateString()}</Text>
                  <Ionicons name="calendar-outline" size={16} color={theme.colors.textSecondary} style={{ marginLeft: 8 }} />
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.cancelModalButton, { borderColor: theme.colors.border }]}
                onPress={() => setShowSpendingModal(false)}
              >
                <Text style={[styles.cancelModalButtonText, { color: theme.colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveModalButton, { backgroundColor: theme.colors.tabBarActive }]}
                onPress={handleSaveSpending}
              >
                <Text style={styles.saveModalButtonText}>Save Spending</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                Select Date
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowDatePicker(false)}
              >
                <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.datePickerContainer}>
              <Text style={[styles.datePickerLabel, { color: theme.colors.textSecondary }]}>
                Current Date: {spendingDate.toLocaleDateString()}
              </Text>
              
              <View style={styles.dateOptions}>
                <TouchableOpacity
                  style={[styles.dateOptionButton, { backgroundColor: theme.colors.tabBarActive }]}
                  onPress={() => handleDateSelect(new Date())}
                >
                  <Text style={styles.dateOptionText}>Today</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.dateOptionButton, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
                  onPress={() => {
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    handleDateSelect(yesterday);
                  }}
                >
                  <Text style={[styles.dateOptionText, { color: theme.colors.text }]}>Yesterday</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.dateOptionButton, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
                  onPress={() => {
                    const lastWeek = new Date();
                    lastWeek.setDate(lastWeek.getDate() - 7);
                    handleDateSelect(lastWeek);
                  }}
                >
                  <Text style={[styles.dateOptionText, { color: theme.colors.text }]}>Last Week</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.dateOptionButton, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
                  onPress={() => {
                    const lastMonth = new Date();
                    lastMonth.setMonth(lastMonth.getMonth() - 1);
                    handleDateSelect(lastMonth);
                  }}
                >
                  <Text style={[styles.dateOptionText, { color: theme.colors.text }]}>Last Month</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.cancelModalButton, { borderColor: theme.colors.border }]}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={[styles.cancelModalButtonText, { color: theme.colors.text }]}>Cancel</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
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
  spendingButtonContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  addSpendingButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  addSpendingButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  viewSpendingButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  viewSpendingButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
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
    fontWeight: '500',
    marginBottom: 6,
    color: '#666',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  cancelModalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelModalButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  saveModalButton: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Date picker styles
  datePickerContainer: {
    gap: 12,
  },
  datePickerLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
    textAlign: 'center',
  },
  dateOptions: {
    gap: 8,
  },
  dateOptionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  dateOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default ExpensesDetailScreen;
