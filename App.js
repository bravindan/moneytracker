import './global.css';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { subscribeToAuthChanges } from './src/services/authService';
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import MonthlyRecordScreen from './src/screens/MonthlyRecordScreen';
import SettingsMenuScreen from './src/screens/SettingsMenuScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import CurrencyScreen from './src/screens/CurrencyScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="MonthlyRecord" component={MonthlyRecordScreen} />
    </Stack.Navigator>
  );
}

function SettingsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#ffffff',
          paddingTop: Platform.OS === 'ios' ? 40 : 20,
        },
        headerTitleStyle: { color: '#111827', fontWeight: '600' },
        headerTintColor: '#4f46e5',
        animation: 'fade',
        headerBackTitleVisible: false,
      }}
    >
      <Stack.Screen
        name="SettingsMenu"
        component={SettingsMenuScreen}
        options={{ headerTitle: 'Settings' }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ headerTitle: 'Profile' }}
      />
      <Stack.Screen
        name="Currency"
        component={CurrencyScreen}
        options={{ headerTitle: 'Currency' }}
      />
    </Stack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#4f46e5',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          borderTopWidth: 0,
          backgroundColor: '#ffffff',
          height: 60,
          paddingBottom: 12,
          paddingTop: 4,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsStack}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  // undefined = still checking auth state; null = signed out; object = signed in
  const [user, setUser] = useState(undefined);

  useEffect(() => subscribeToAuthChanges(setUser), []);

  let content;
  if (user === undefined) {
    // Splash/loading while Firebase resolves the persisted session
    content = (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
        <StatusBar style="auto" />
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  } else {
    content = (
      <NavigationContainer>
        <StatusBar style="auto" />
        {user ? (
          <MainTabs />
        ) : (
          <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
            <Stack.Screen name="Login" component={LoginScreen} />
          </Stack.Navigator>
        )}
      </NavigationContainer>
    );
  }

  return <SafeAreaProvider>{content}</SafeAreaProvider>;
}
