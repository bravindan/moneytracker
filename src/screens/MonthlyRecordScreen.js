import { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import IOSSpinner from '../components/IOSSpinner';
import { getCurrentUser } from '../services/authService';
import {
  setMonthlySummary,
  getMonthlySummary,
  getUserProfile,
} from '../services/firestoreService';
import { useTheme } from '../contexts/ThemeContext';

const getCurrentMonth = () => new Date().toISOString().slice(0, 7); // YYYY-MM
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

const MonthlyRecordScreen = ({ navigation, route }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const targetMonth = route?.params?.month || getCurrentMonth();
  const isEditing = !!route?.params?.editing;

  // ── Income: one or more sources summed together ──
  const sourceIdRef = useRef(1);
  const makeSource = (name = '', amount = '') => ({
    id: `s${sourceIdRef.current++}`,
    name,
    amount,
  });
  const [incomeSources, setIncomeSources] = useState([makeSource()]);

  // ── Allocations: each can be entered as a percentage or a fixed amount ──
  const allocIdRef = useRef(1);
  const makeAlloc = (key, name, mode = 'percent', value = '') => ({
    id: `a${allocIdRef.current++}`,
    key, // 'savingsInvestment' | 'expenses' | 'custom'
    name,
    mode, // 'percent' | 'amount'
    value,
    removable: key === 'custom',
  });
  const [allocations, setAllocations] = useState([
    makeAlloc('savingsInvestment', 'Investments'),
    makeAlloc('expenses', 'Expenses'),
  ]);

  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [recordLoading, setRecordLoading] = useState(isEditing);

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

  // In edit mode, prefill the form with the existing record for the target month
  useEffect(() => {
    if (!uid || !isEditing) return;
    const fetchRecord = async () => {
      setRecordLoading(true);
      try {
        const data = await getMonthlySummary(uid, targetMonth);
        if (data) {
          // Income sources
          if (Array.isArray(data.incomeSources) && data.incomeSources.length) {
            setIncomeSources(
              data.incomeSources.map((s) =>
                makeSource(s.name || '', String(s.amount ?? '')),
              ),
            );
          } else {
            setIncomeSources([makeSource('Income', String(data.income ?? ''))]);
          }

          // Allocations
          if (Array.isArray(data.allocations) && data.allocations.length) {
            setAllocations(
              data.allocations.map((a) =>
                makeAlloc(
                  a.key || 'custom',
                  a.name || 'Category',
                  a.mode || 'percent',
                  a.mode === 'amount'
                    ? String(a.amount ?? '')
                    : String(a.percent ?? ''),
                ),
              ),
            );
          } else {
            // Reconstruct from legacy percentage fields
            const siPercent =
              (data.savingsPercent || 0) + (data.investmentPercent || 0);
            setAllocations([
              makeAlloc(
                'savingsInvestment',
                'Savings & Investments',
                'percent',
                siPercent ? String(round2(siPercent)) : '',
              ),
              makeAlloc(
                'expenses',
                'Expenses',
                'percent',
                data.expensesPercent ? String(round2(data.expensesPercent)) : '',
              ),
            ]);
          }
        }
      } catch (error) {
        console.error('Failed to load monthly record:', error);
        Alert.alert('Error', 'Failed to load the record for editing');
      } finally {
        setRecordLoading(false);
      }
    };
    fetchRecord();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, isEditing, targetMonth]);

  // Currency from profile, default to KES
  const currencyCode = profile?.currency || 'KES';

  const fmt = useMemo(() => {
    return (amount) =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 2,
      }).format(amount || 0);
  }, [currencyCode]);

  const totalIncome = useMemo(
    () =>
      incomeSources.reduce(
        (sum, source) => sum + (parseFloat(source.amount) || 0),
        0,
      ),
    [incomeSources],
  );

  // ── Income source handlers ──
  const updateSource = (id, field, value) =>
    setIncomeSources((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)),
    );
  const addSource = () => setIncomeSources((prev) => [...prev, makeSource()]);
  const removeSource = (id) =>
    setIncomeSources((prev) =>
      prev.length > 1 ? prev.filter((s) => s.id !== id) : prev,
    );

  // ── Allocation handlers ──
  const computeAllocation = (alloc, income) => {
    const num = parseFloat(alloc.value) || 0;
    if (alloc.mode === 'amount') {
      const amount = num;
      const percent = income > 0 ? (amount / income) * 100 : 0;
      return { amount, percent };
    }
    const percent = num;
    const amount = (income * percent) / 100;
    return { amount, percent };
  };

  const computedAllocations = useMemo(
    () =>
      allocations.map((a) => ({ ...a, ...computeAllocation(a, totalIncome) })),
    [allocations, totalIncome],
  );

  const totalAllocated = useMemo(
    () => computedAllocations.reduce((sum, a) => sum + (a.amount || 0), 0),
    [computedAllocations],
  );

  const remainingBalance = totalIncome - totalAllocated;

  const updateAllocation = (id, field, value) =>
    setAllocations((prev) =>
      prev.map((a) => (a.id === id ? { ...a, [field]: value } : a)),
    );

  // Toggle between percent/amount, converting the current value so the
  // effective allocation stays the same.
  const toggleAllocationMode = (id) =>
    setAllocations((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        const num = parseFloat(a.value) || 0;
        if (a.mode === 'percent') {
          const amount = (totalIncome * num) / 100;
          return { ...a, mode: 'amount', value: num ? String(round2(amount)) : '' };
        }
        const percent = totalIncome > 0 ? (num / totalIncome) * 100 : 0;
        return { ...a, mode: 'percent', value: num ? String(round2(percent)) : '' };
      }),
    );

  const addAllocation = () =>
    setAllocations((prev) => [...prev, makeAlloc('custom', '', 'percent', '')]);

  const removeAllocation = (id) =>
    setAllocations((prev) => prev.filter((a) => a.id !== id));

  const handleSave = async () => {
    if (!uid) {
      Alert.alert('Error', 'You must be logged in');
      return;
    }
    if (isNaN(totalIncome) || totalIncome <= 0) {
      Alert.alert(
        'Invalid input',
        'Please enter at least one income source with a valid amount',
      );
      return;
    }
    if (totalAllocated > totalIncome + 0.01) {
      Alert.alert(
        'Allocations exceed income',
        `Your allocations (${fmt(totalAllocated)}) are more than your income (${fmt(totalIncome)}). Reduce them to continue.`,
      );
      return;
    }

    const cleanedSources = incomeSources
      .filter((s) => (parseFloat(s.amount) || 0) > 0)
      .map((s, index) => ({
        name: s.name?.trim() || `Source ${index + 1}`,
        amount: parseFloat(s.amount) || 0,
      }));

    const cleanedAllocations = computedAllocations.map((a, index) => ({
      name: a.name?.trim() || `Category ${index + 1}`,
      key: a.key,
      mode: a.mode,
      amount: round2(a.amount),
      percent: round2(a.percent),
    }));

    const si = computedAllocations.find((a) => a.key === 'savingsInvestment');
    const ex = computedAllocations.find((a) => a.key === 'expenses');
    const siAmount = si?.amount || 0;
    const siPercent = si?.percent || 0;

    const data = {
      income: totalIncome,
      incomeSources: cleanedSources,
      allocations: cleanedAllocations,
      // Legacy fields kept in sync so existing dashboard/report math works
      savingsPercent: 0,
      investmentPercent: siPercent,
      expensesPercent: ex?.percent || 0,
      savingsAmount: 0,
      investmentAmount: siAmount,
      expensesAmount: ex?.amount || 0,
      balance: remainingBalance,
    };

    setLoading(true);
    try {
      await setMonthlySummary(uid, targetMonth, data);
      Alert.alert(
        'Success',
        isEditing ? 'Monthly record updated!' : 'Monthly record saved!',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to save monthly record');
    } finally {
      setLoading(false);
    }
  };

  if (recordLoading) {
    return (
      <View
        style={[
          styles.container,
          styles.centered,
          { backgroundColor: theme.colors.background, paddingTop: insets.top },
        ]}
      >
        <IOSSpinner size={40} color={theme.colors.tabBarActive} />
      </View>
    );
  }

  const overAllocated = remainingBalance < -0.01;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.headerContainer, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity
          style={[styles.backButton, { borderColor: theme.colors.border }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          {isEditing ? 'Edit Monthly Record' : 'Create Monthly Record'}
        </Text>
        <View style={styles.placeholder} />
      </View>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContainer,
          { paddingBottom: insets.bottom + 120 },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Record for {targetMonth}. Add your income sources and allocations.
        </Text>

        {/* ── Income Sources ── */}
        <View style={styles.formGroup}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Income Sources</Text>
            <TouchableOpacity
              style={[styles.addButton, { borderColor: theme.colors.tabBarActive }]}
              onPress={addSource}
            >
              <Ionicons name="add" size={16} color={theme.colors.tabBarActive} />
              <Text style={[styles.addButtonText, { color: theme.colors.tabBarActive }]}>Add source</Text>
            </TouchableOpacity>
          </View>

          {incomeSources.map((source, index) => (
            <View key={source.id} style={styles.sourceRow}>
              <View style={styles.sourceInputs}>
                <TextInput
                  style={[styles.input, styles.sourceName, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
                  placeholder={`Source ${index + 1} (e.g. Salary)`}
                  placeholderTextColor={theme.colors.textSecondary}
                  value={source.name}
                  onChangeText={(text) => updateSource(source.id, 'name', text)}
                />
                <TextInput
                  style={[styles.input, styles.sourceAmount, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
                  placeholder="Amount"
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="numeric"
                  value={source.amount}
                  onChangeText={(text) => updateSource(source.id, 'amount', text)}
                />
              </View>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeSource(source.id)}
                disabled={incomeSources.length === 1}
              >
                <Ionicons
                  name="trash-outline"
                  size={20}
                  color={incomeSources.length === 1 ? theme.colors.border : '#dc2626'}
                />
              </TouchableOpacity>
            </View>
          ))}

          <View style={[styles.totalRow, { borderTopColor: theme.colors.border }]}>
            <Text style={[styles.totalLabel, { color: theme.colors.textSecondary }]}>Total Monthly Income</Text>
            <Text style={[styles.totalValue, { color: theme.colors.text }]}>{fmt(totalIncome)}</Text>
          </View>
        </View>

        {/* ── Allocations ── */}
        <View style={styles.formGroup}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Allocations</Text>
            <TouchableOpacity
              style={[styles.addButton, { borderColor: theme.colors.tabBarActive }]}
              onPress={addAllocation}
            >
              <Ionicons name="add" size={16} color={theme.colors.tabBarActive} />
              <Text style={[styles.addButtonText, { color: theme.colors.tabBarActive }]}>Add category</Text>
            </TouchableOpacity>
          </View>

          {computedAllocations.map((alloc) => (
            <View
              key={alloc.id}
              style={[styles.allocCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
            >
              <View style={styles.allocHeader}>
                <TextInput
                  style={[styles.allocName, { color: theme.colors.text, borderBottomColor: theme.colors.border }]}
                  placeholder="Category name"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={alloc.name}
                  editable={alloc.removable}
                  onChangeText={(text) => updateAllocation(alloc.id, 'name', text)}
                />
                {alloc.removable && (
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeAllocation(alloc.id)}
                  >
                    <Ionicons name="trash-outline" size={20} color="#dc2626" />
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.allocControls}>
                {/* Mode switcher */}
                <View style={[styles.switcher, { borderColor: theme.colors.border }]}>
                  <TouchableOpacity
                    style={[
                      styles.switcherOption,
                      alloc.mode === 'percent' && { backgroundColor: theme.colors.tabBarActive },
                    ]}
                    onPress={() => alloc.mode !== 'percent' && toggleAllocationMode(alloc.id)}
                  >
                    <Text
                      style={[
                        styles.switcherText,
                        { color: alloc.mode === 'percent' ? '#ffffff' : theme.colors.textSecondary },
                      ]}
                    >
                      %
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.switcherOption,
                      alloc.mode === 'amount' && { backgroundColor: theme.colors.tabBarActive },
                    ]}
                    onPress={() => alloc.mode !== 'amount' && toggleAllocationMode(alloc.id)}
                  >
                    <Text
                      style={[
                        styles.switcherText,
                        { color: alloc.mode === 'amount' ? '#ffffff' : theme.colors.textSecondary },
                      ]}
                    >
                      Amount
                    </Text>
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={[styles.input, styles.allocValue, { backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text }]}
                  placeholder={alloc.mode === 'percent' ? 'e.g. 30' : 'e.g. 15000'}
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="numeric"
                  value={alloc.value}
                  onChangeText={(text) => updateAllocation(alloc.id, 'value', text)}
                />
              </View>

              <Text style={[styles.allocHint, { color: theme.colors.textSecondary }]}>
                {alloc.mode === 'percent'
                  ? `= ${fmt(alloc.amount)}`
                  : `= ${round2(alloc.percent)}% of income`}
              </Text>
            </View>
          ))}
        </View>

        {/* ── Summary ── */}
        <View style={[styles.summaryBox, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.summaryTitle, { color: theme.colors.textSecondary }]}>Summary</Text>
          {computedAllocations.map((alloc) => (
            <View key={alloc.id} style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.colors.text }]} numberOfLines={1}>
                {alloc.name?.trim() || 'Category'} ({round2(alloc.percent)}%):
              </Text>
              <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
                {fmt(alloc.amount)}
              </Text>
            </View>
          ))}
          <View style={[styles.summaryRow, styles.summaryDivider, { borderTopColor: theme.colors.border }]}>
            <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Total Allocated:</Text>
            <Text style={[styles.summaryValue, { color: theme.colors.text }]}>{fmt(totalAllocated)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: theme.colors.text }]}>Remaining Balance:</Text>
            <Text style={[styles.summaryValue, remainingBalance >= 0 ? styles.positive : styles.negative]}>
              {fmt(remainingBalance)}
            </Text>
          </View>
          {overAllocated && (
            <Text style={[styles.negative, { marginTop: 8 }]}>
              Allocations exceed your total income.
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: loading ? theme.colors.textSecondary : theme.colors.tabBarActive }]}
          onPress={handleSave}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>
            {loading
              ? 'Saving...'
              : isEditing
                ? 'Update Monthly Record'
                : 'Save Monthly Record'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.cancelButton, { borderColor: theme.colors.border }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.cancelButtonText, { color: theme.colors.textSecondary }]}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
    height: 40,
  },
  scrollContainer: {
    padding: 20,
    paddingTop: 8,
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
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sourceInputs: {
    flex: 1,
    flexDirection: 'row',
  },
  sourceName: {
    flex: 1.5,
    marginRight: 8,
  },
  sourceAmount: {
    flex: 1,
  },
  removeButton: {
    paddingLeft: 10,
    paddingVertical: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  allocCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  allocHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  allocName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: 4,
    borderBottomWidth: 1,
  },
  allocControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  switcher: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 10,
  },
  switcherOption: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 44,
    alignItems: 'center',
  },
  switcherText: {
    fontSize: 14,
    fontWeight: '600',
  },
  allocValue: {
    flex: 1,
  },
  allocHint: {
    fontSize: 13,
    marginTop: 8,
    fontWeight: '500',
  },
  summaryBox: {
    borderRadius: 12,
    padding: 16,
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
  summaryDivider: {
    borderTopWidth: 1,
    paddingTop: 8,
    marginTop: 4,
  },
  summaryLabel: {
    fontSize: 15,
    flex: 1,
    marginRight: 8,
  },
  summaryValue: {
    fontSize: 15,
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
