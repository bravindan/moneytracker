import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getCurrentUser } from '../services/authService';
import { setMonthlySummary, getUserProfile } from '../services/firestoreService';

const MonthlyRecordScreen = ({ navigation }) => {
  const [income, setIncome] = useState('');
  const [savingsInvestmentPercent, setSavingsInvestmentPercent] = useState('');
  const [expensesPercent, setExpensesPercent] = useState('');
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const user = getCurrentUser();
  const uid = user?.uid;

  // Fetch user profile for currency
  useEffect(() => {
    if (!uid) return;
    const fetchProfile = async () => {
      setProfileLoading(true);
      try {
        const data = await getUserProfile(uid);
        setProfile(data);
      } catch (error) {
        console.error('Failed to fetch profile:', error);
      } finally {
        setProfileLoading(false);
      }
    };
    fetchProfile();
  }, [uid]);

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

  const calculateAmounts = () => {
    const incomeNum = parseFloat(income) || 0;
    const savingsInvestmentPct = parseFloat(savingsInvestmentPercent) || 0;
    const expensesPct = parseFloat(expensesPercent) || 0;
    const totalPercent = savingsInvestmentPct + expensesPct;
    if (totalPercent > 100) {
      Alert.alert('Invalid percentages', 'Total percentage cannot exceed 100%');
      return null;
    }
    // Split savings & investments equally
    const halfPct = savingsInvestmentPct / 2;
    const savingsAmount = (incomeNum * halfPct) / 100;
    const investmentAmount = (incomeNum * halfPct) / 100;
    const expensesAmount = (incomeNum * expensesPct) / 100;
    const balance = incomeNum - (savingsAmount + investmentAmount + expensesAmount);
    return {
      savingsAmount,
      investmentAmount,
      expensesAmount,
      balance,
    };
  };

  const handleSave = async () => {
    if (!uid) {
      Alert.alert('Error', 'You must be logged in');
      return;
    }
    const incomeNum = parseFloat(income);
    if (isNaN(incomeNum) || incomeNum <= 0) {
      Alert.alert('Invalid input', 'Please enter a valid income amount');
      return;
    }
    const amounts = calculateAmounts();
    if (!amounts) return;

    const month = new Date().toISOString().slice(0, 7); // YYYY-MM
    const data = {
      income: incomeNum,
      savingsPercent: (parseFloat(savingsInvestmentPercent) || 0) / 2,
      investmentPercent: (parseFloat(savingsInvestmentPercent) || 0) / 2,
      expensesPercent: parseFloat(expensesPercent) || 0,
      savingsAmount: amounts.savingsAmount,
      investmentAmount: amounts.investmentAmount,
      expensesAmount: amounts.expensesAmount,
      balance: amounts.balance,
    };

    setLoading(true);
    try {
      await setMonthlySummary(uid, month, data);
      Alert.alert('Success', 'Monthly record saved!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to save monthly record');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>Create Monthly Record</Text>
        <Text style={styles.subtitle}>Enter your income and allocation percentages</Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Monthly Income</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 50000"
            keyboardType="numeric"
            value={income}
            onChangeText={setIncome}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Savings & Investments Percentage (%)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 50"
            keyboardType="numeric"
            value={savingsInvestmentPercent}
            onChangeText={setSavingsInvestmentPercent}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Expenses Percentage (%)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 50"
            keyboardType="numeric"
            value={expensesPercent}
            onChangeText={setExpensesPercent}
          />
        </View>

        <View style={styles.summaryBox}>
          <Text style={styles.summaryTitle}>Calculated Amounts</Text>
          {(() => {
            const amounts = calculateAmounts();
            if (!amounts) return null;
            return (
              <>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Savings & Investments:</Text>
                  <Text style={styles.summaryValue}>
                    {fmt(amounts.savingsAmount + amounts.investmentAmount)}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Expenses:</Text>
                  <Text style={styles.summaryValue}>
                    {fmt(amounts.expensesAmount)}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Remaining Balance:</Text>
                  <Text style={[styles.summaryValue, amounts.balance >= 0 ? styles.positive : styles.negative]}>
                    {fmt(amounts.balance)}
                  </Text>
                </View>
              </>
            );
          })()}
        </View>

        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>
            {loading ? 'Saving...' : 'Save Monthly Record'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollContainer: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 24,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
  },
  summaryBox: {
    backgroundColor: '#e0f2fe',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    marginBottom: 30,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0369a1',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#374151',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  positive: {
    color: '#059669',
  },
  negative: {
    color: '#dc2626',
  },
  saveButton: {
    backgroundColor: '#4f46e5',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  saveButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  cancelButtonText: {
    color: '#6b7280',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default MonthlyRecordScreen;