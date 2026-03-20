import './global.css';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Platform, StyleSheet, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { subscribeToAuthChanges } from './src/services/authService';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import MonthlyRecordScreen from './src/screens/MonthlyRecordScreen';
import SettingsMenuScreen from './src/screens/SettingsMenuScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import CurrencyScreen from './src/screens/CurrencyScreen';
import ThemeScreen from './src/screens/ThemeScreen';
import AddExpenseScreen from './src/screens/AddExpenseScreen';
import ExpensesDetailScreen from './src/screens/ExpensesDetailScreen';
import AddInvestmentScreen from './src/screens/AddInvestmentScreen';
import InvestmentsDetailScreen from './src/screens/InvestmentsDetailScreen';
import SpendingDetailsScreen from './src/screens/SpendingDetailsScreen';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import { useNavigation } from '@react-navigation/native';

const Stack = createNativeStackNavigator();

// Stack navigator for modals and additional screens
function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="MonthlyRecord" component={MonthlyRecordScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Currency" component={CurrencyScreen} />
      <Stack.Screen name="Theme" component={ThemeScreen} />
      <Stack.Screen name="AddExpense" component={AddExpenseScreen} />
      <Stack.Screen name="ExpensesDetail" component={ExpensesDetailScreen} />
      <Stack.Screen name="AddInvestment" component={AddInvestmentScreen} />
      <Stack.Screen name="InvestmentsDetail" component={InvestmentsDetailScreen} />
      <Stack.Screen name="SpendingDetails" component={SpendingDetailsScreen} />
    </Stack.Navigator>
  );
}

// Custom tab bar component to mimic bottom tabs appearance
function CustomTabBar({ state, descriptors, navigation, theme }) {
  return (
    <View style={[
      styles.customTabBar,
      { 
        backgroundColor: theme.colors.tabBar,
        borderTopColor: theme.colors.border,
      }
    ]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel !== undefined
          ? options.tabBarLabel
          : options.title !== undefined
          ? options.title
          : route.name;

        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, { merge: true });
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        const getIconName = (routeName) => {
          switch (routeName) {
            case 'Dashboard':
              return 'home-outline';
            case 'SettingsMenu':
              return 'settings-outline';
            default:
              return 'home-outline';
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.customTabItem}
          >
            <Ionicons
              name={getIconName(route.name)}
              size={24}
              color={isFocused ? theme.colors.tabBarActive : theme.colors.tabBarInactive}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// Wrapper components to provide navigation
function DashboardWrapper() {
  const navigation = useNavigation();
  return <DashboardScreen navigation={navigation} />;
}

function SettingsMenuWrapper() {
  const navigation = useNavigation();
  return <SettingsMenuScreen navigation={navigation} />;
}

function MainTabs() {
  const { theme } = useTheme();
  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: 'dashboard', title: 'Dashboard' },
    { key: 'settings', title: 'Settings' },
  ]);

  const renderScene = SceneMap({
    dashboard: DashboardWrapper,
    settings: SettingsMenuWrapper,
  });

  const renderTabBar = (props) => (
    <TabBar
      {...props}
      style={{
        backgroundColor: theme.isDark ? theme.colors.background : theme.colors.tabBar, // Match dashboard bg in dark mode
        borderTopWidth: 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 15,
        paddingBottom: 6,
        paddingTop: 6,
        height: 60, // Reduced height
        marginHorizontal: 20, // Side margins for floating effect
        marginBottom: 10, // Bottom margin for floating effect
        borderRadius: 25, // Rounded corners like Telegram
      }}
      tabStyle={{
        paddingVertical: 6,
        justifyContent: 'center',
      }}
      indicatorStyle={{
        backgroundColor: 'transparent', // Hide default indicator
      }}
      renderIcon={({ route, focused }) => (
        <View style={{
          backgroundColor: focused ? theme.colors.tabBarActive : 'transparent',
          borderRadius: 20,
          width: 40,
          height: 40,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Ionicons
            name={route.key === 'dashboard' ? 'home-outline' : 'settings-outline'}
            size={24}
            color={focused ? '#ffffff' : theme.colors.tabBarInactive}
          />
        </View>
      )}
      renderLabel={() => null} // Remove text labels like Telegram
      activeColor={theme.colors.tabBarActive}
      inactiveColor={theme.colors.tabBarInactive}
      pressColor={theme.isDark ? 'rgba(0, 136, 204, 0.1)' : 'rgba(0, 136, 204, 0.1)'}
      pressOpacity={1}
    />
  );

  return (
    <TabView
      navigationState={{ index, routes }}
      onIndexChange={setIndex}
      renderScene={renderScene}
      renderTabBar={renderTabBar}
      tabBarPosition="bottom"
      swipeEnabled={true}
    />
  );
}

export default function App() {
  const [user, setUser] = useState(undefined);

  useEffect(() => subscribeToAuthChanges(setUser), []);

  let content;
  if (user === undefined) {
    content = (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
        <StatusBar style="auto" />
        <ActivityIndicator size="large" color="#0088cc" />
      </View>
    );
  } else {
    content = (
      <NavigationContainer>
        <StatusBar style="auto" />
        {user ? (
          <AppStack />
        ) : (
          <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
            <Stack.Screen name="Login" component={LoginScreen} />
          </Stack.Navigator>
        )}
      </NavigationContainer>
    );
  }

  return (
    <ThemeProvider>
      <SafeAreaProvider>{content}</SafeAreaProvider>
    </ThemeProvider>
  );
}
