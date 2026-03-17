import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getCurrentUser } from '../services/authService';
import { getUserProfile, updateUserProfile } from '../services/firestoreService';

const currencies = [
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
];

const CurrencyScreen = ({ navigation }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState('KES');

  const user = getCurrentUser();
  const uid = user?.uid;

  useEffect(() => {
    if (!uid) return;
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const data = await getUserProfile(uid);
        if (data) {
          setProfile(data);
          if (data.currency && currencies.find(c => c.code === data.currency)) {
            setSelectedCurrency(data.currency);
          }
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error);
        Alert.alert('Error', 'Could not load profile');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [uid]);

  const handleSelect = (code) => {
    setSelectedCurrency(code);
  };

  const handleSave = async () => {
    if (!uid) return;
    setSaving(true);
    try {
      await updateUserProfile(uid, { currency: selectedCurrency });
      Alert.alert('Success', 'Currency preference updated');
      // Refresh profile
      const updated = await getUserProfile(uid);
      setProfile(updated);
    } catch (error) {
      console.error('Failed to update currency:', error);
      Alert.alert('Error', 'Could not update currency');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={{ marginTop: 12, color: '#6b7280' }}>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.subtitle}>Select your preferred currency for displaying amounts</Text>

        <View style={styles.currencyList}>
          {currencies.map((currency) => (
            <TouchableOpacity
              key={currency.code}
              style={[
                styles.currencyItem,
                selectedCurrency === currency.code && styles.currencyItemSelected,
              ]}
              onPress={() => handleSelect(currency.code)}
            >
              <View style={styles.currencyLeft}>
                <View style={styles.currencyIcon}>
                  <Text style={styles.currencySymbol}>{currency.symbol}</Text>
                </View>
                <View style={styles.currencyText}>
                  <Text style={styles.currencyName}>{currency.name}</Text>
                  <Text style={styles.currencyCode}>{currency.code}</Text>
                </View>
              </View>
              {selectedCurrency === currency.code && (
                <Ionicons name="checkmark-circle" size={24} color="#4f46e5" />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Currency</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollContainer: {
    padding: 20,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 24,
  },
  currencyList: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    marginBottom: 24,
  },
  currencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  currencyItemSelected: {
    backgroundColor: '#f5f3ff',
  },
  currencyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0e7ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4f46e5',
  },
  currencyText: {
    flex: 1,
  },
  currencyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  currencyCode: {
    fontSize: 12,
    color: '#9ca3af',
  },
  saveButton: {
    backgroundColor: '#4f46e5',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default CurrencyScreen;
