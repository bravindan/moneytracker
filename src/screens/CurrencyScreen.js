import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { getCurrentUser } from '../services/authService';
import { getUserProfile, updateUserProfile } from '../services/firestoreService';
import CustomAlert from '../components/CustomAlert';

const CurrencyScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [currencies] = useState([
    { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh' },
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$' },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  ]);
  const [selectedCurrency, setSelectedCurrency] = useState('KES');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState(null);
  const [alert, setAlert] = useState({ visible: false, title: '', message: '', buttons: [] });

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
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={theme.colors.tabBarActive} />
        <Text style={{ marginTop: 12, color: theme.colors.textSecondary }}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <StatusBar 
        style="auto" 
        backgroundColor={theme.colors.background}
      />
      
      {/* Custom Alert */}
      <CustomAlert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        buttons={alert.buttons}
        onClose={() => setAlert({ visible: false })}
      />
      
      <View style={styles.headerContainer}>
        <TouchableOpacity
          style={[styles.backButton, { borderColor: theme.colors.border }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={20} color={theme.colors.tabBarActive} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Currency</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary, textAlign: 'center' }]}>Select your preferred currency for displaying amounts</Text>

        <View style={[styles.currencyList, { backgroundColor: theme.colors.card }]}>
          {currencies.map((currency) => (
            <TouchableOpacity
              key={currency.code}
              style={[
                styles.currencyItem,
                { borderBottomColor: theme.colors.border }
              ]}
              onPress={() => handleSelect(currency.code)}
            >
              <View style={styles.currencyLeft}>
                <View style={[styles.currencyIcon, { backgroundColor: theme.isDark ? '#2C2C2E' : theme.colors.tabBarFocused }]}>
                  <Text style={[styles.currencySymbol, { color: theme.isDark ? '#ffffff' : theme.colors.tabBarActive }]}>{currency.symbol}</Text>
                </View>
                <View style={styles.currencyText}>
                  <Text style={[styles.currencyName, { color: theme.colors.text }]}>{currency.name}</Text>
                  <Text style={[styles.currencyCode, { color: theme.colors.textSecondary }]}>{currency.code}</Text>
                </View>
              </View>
              {selectedCurrency === currency.code && (
                <Ionicons name="checkmark-circle" size={24} color={theme.isDark ? '#007AFF' : '#007AFF'} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: saving ? theme.colors.textSecondary : theme.colors.tabBarActive }]}
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
    </View>
  );
};


const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
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
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
    height: 40,
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 100, // Space for tab bar
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 24,
  },
  currencyList: {
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
    paddingHorizontal: 24, // Increased padding for check mark space
    borderBottomWidth: 1,
    minHeight: 72, // Ensure enough space for checkbox
  },
  currencyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  currencyText: {
    flex: 1,
  },
  currencyName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  currencyCode: {
    fontSize: 12,
  },
  saveButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default CurrencyScreen;
