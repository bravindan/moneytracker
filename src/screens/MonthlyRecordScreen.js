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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getCurrentUser } from '../services/authService';
import { setMonthlySummary, getUserProfile } from '../services/firestoreService';
import { useTheme } from '../contexts/ThemeContext';

const MonthlyRecordScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
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
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Create Monthly Record</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>Enter your income and allocation percentages</Text>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Monthly Income</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
            placeholder="e.g. 50000"
            placeholderTextColor={theme.colors.textSecondary}
            keyboardType="numeric"
            value={income}
            onChangeText={setIncome}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Savings & Investments Percentage (%)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
            placeholder="e.g. 50"
            placeholderTextColor={theme.colors.textSecondary}
            keyboardType="numeric"
            value={savingsInvestmentPercent}
            onChangeText={setSavingsInvestmentPercent}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Expenses Percentage (%)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
            placeholder="e.g. 50"
            placeholderTextColor={theme.colors.textSecondary}
            keyboardType="numeric"
            value={expensesPercent}
            onChangeText={setExpensesPercent}
          />
        </View>

        <View style={[styles.summaryBox, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.summaryTitle, { color: theme.colors.textSecondary }]}>Calculated Amounts</Text>
          {(() => {
            const amounts = calculateAmounts();
            if (!amounts) return null;
            return (
              <>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: theme.colors.text }]}>Savings & Investments:</Text>
                  <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
                    {fmt(amounts.savingsAmount + amounts.investmentAmount)}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: theme.colors.text }]}>Expenses:</Text>
                  <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
                    {fmt(amounts.expensesAmount)}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: theme.colors.text }]}>Remaining Balance:</Text>
                  <Text style={[styles.summaryValue, amounts.balance >= 0 ? styles.positive : styles.negative]}>
                    {fmt(amounts.balance)}
                  </Text>
                </View>
              </>
            );
          })()}
        </View>

        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: loading ? theme.colors.textSecondary : theme.colors.tabBarActive }]}
          onPress={handleSave}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>
            {loading ? 'Saving...' : 'Save Monthly Record'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.cancelButton, { borderColor: theme.colors.border }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.cancelButtonText, { color: theme.colors.textSecondary }]}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 24,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  summaryBox: {
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    marginBottom: 30,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 16,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  positive: {
    color: '#059669',
  },
  negative: {
    color: '#dc2626',
  },
  saveButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
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
  },
  cancelButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
});

export default MonthlyRecordScreen;