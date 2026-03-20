import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { getCurrentUser } from '../services/authService';
import { getSpendingByCategory } from '../services/firestoreService';

const SpendingDetailsScreen = ({ route, navigation }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const user = getCurrentUser();
  
  const { category } = route.params || {};
  
  // State for spending data
  const [spendingList, setSpendingList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [item, setItem] = useState('');
  const [amount, setAmount] = useState('');
  const [transactionCosts, setTransactionCosts] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());


  // Handle save spending
  const handleSaveSpending = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    try {
      const spendingData = {
        category: category,
        amount: parseFloat(amount),
        description: description,
        itemName: item,
        date: date,
        transactionCosts: parseFloat(transactionCosts) || 0,
        totalSpending: parseFloat(amount) + parseFloat(transactionCosts || 0)
      };

      await addSpending(user.uid, spendingData);
      
      Alert.alert('Success', 'Spending added successfully!');
      setShowAddModal(false);
      setItem('');
      setAmount('');
      setTransactionCosts('');
      setDescription('');
      setDate(new Date());
      
      // Reload spending list to show new item
      const updatedSpendingList = await getSpendingByCategory(user.uid, category);
      setSpendingList(updatedSpendingList);
    } catch (error) {
      console.error('Error saving spending:', error);
      Alert.alert('Error', 'Failed to save spending');
    }
  };

  // Load spending data for the specific category
  useEffect(() => {
    const loadSpendingData = async () => {
      try {
        setLoading(true);
        const spendingData = await getSpendingByCategory(user.uid, category);
        setSpendingList(spendingData);
      } catch (error) {
        console.error('Failed to load spending data:', error);
        setSpendingList([]);
      } finally {
        setLoading(false);
      }
    };

    if (category) {
      loadSpendingData();
    }
  }, [user.uid, category]);

  const renderSpendingItem = ({ item: spending }) => (
    <View style={[styles.spendingItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <View style={styles.spendingHeader}>
        <Text style={[styles.spendingCategory, { color: theme.colors.text }]}>{spending.category}</Text>
        <Text style={[styles.spendingDate, { color: theme.colors.textSecondary }]}>
          {new Date(spending.date?.toDate()).toLocaleDateString()}
        </Text>
      </View>
      
      <View style={styles.spendingDetails}>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Item:</Text>
          <Text style={[styles.detailValue, { color: theme.colors.text }]}>
            {spending.itemName || 'No item specified'}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Amount:</Text>
          <Text style={[styles.detailValue, { color: theme.colors.text }]}>
            KES {spending.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Transaction Costs:</Text>
          <Text style={[styles.detailValue, { color: theme.colors.text }]}>
            KES {spending.transactionCosts.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
        </View>
        
        {spending.description && (
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Description:</Text>
            <Text style={[styles.detailValue, { color: theme.colors.text }]}>
              {spending.description}
            </Text>
          </View>
        )}
        
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Date:</Text>
          <Text style={[styles.detailValue, { color: theme.colors.text }]}>
            {new Date(spending.date?.toDate()).toLocaleDateString()}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Total Spending:</Text>
          <Text style={[styles.detailValue, { color: theme.colors.tabBarActive, fontWeight: 'bold' }]}>
            KES {spending.totalSpending.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
        </View>
      </View>
    </View>
  );

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
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Spending Details - {category}
        </Text>
        <View style={styles.placeholder} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading spending details...</Text>
        </View>
      ) : spendingList.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            No spending records found for {category}.
          </Text>
          <TouchableOpacity
            style={[styles.addSpendingButton, { backgroundColor: theme.colors.tabBarActive }]}
            onPress={handleAddSpending}
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
  listContainer: {
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
  spendingItem: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  spendingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  spendingCategory: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  spendingDate: {
    fontSize: 14,
    color: '#666',
  },
  spendingDetails: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default SpendingDetailsScreen;
