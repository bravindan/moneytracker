import "./global.css";
import { useEffect, useState } from "react";
import {
  View,
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { subscribeToAuthChanges } from "./src/services/authService";
import { ThemeProvider, useTheme } from "./src/contexts/ThemeContext";
import LoginScreen from "./src/screens/LoginScreen";
import ForgotPasswordScreen from "./src/screens/ForgotPasswordScreen";
import DashboardScreen from "./src/screens/DashboardScreen";
import MonthlyRecordScreen from "./src/screens/MonthlyRecordScreen";
import SettingsMenuScreen from "./src/screens/SettingsMenuScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import CurrencyScreen from "./src/screens/CurrencyScreen";
import ThemeScreen from "./src/screens/ThemeScreen";
import AddExpenseScreen from "./src/screens/AddExpenseScreen";
import ExpensesDetailScreen from "./src/screens/ExpensesDetailScreen";
import AddInvestmentScreen from "./src/screens/AddInvestmentScreen";
import InvestmentsDetailScreen from "./src/screens/InvestmentsDetailScreen";
import SpendingDetailsScreen from "./src/screens/SpendingDetailsScreen";
import ReportsScreen from "./src/screens/ReportsScreen";
import { GlobalAlertComponent } from "./src/components/GlobalAlert";
import { TabView, SceneMap, TabBar } from "react-native-tab-view";
import { useNavigation } from "@react-navigation/native";
import { firebaseInitError } from "./src/config/firebase";

const Stack = createNativeStackNavigator();

// Stack navigator for modals and additional screens
function AppStack() {
  const { theme } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="MonthlyRecord" component={MonthlyRecordScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Currency" component={CurrencyScreen} />
      <Stack.Screen name="Theme" component={ThemeScreen} />
      <Stack.Screen name="AddExpense" component={AddExpenseScreen} />
      <Stack.Screen name="ExpensesDetail" component={ExpensesDetailScreen} />
      <Stack.Screen name="AddInvestment" component={AddInvestmentScreen} />
      <Stack.Screen
        name="InvestmentsDetail"
        component={InvestmentsDetailScreen}
      />
      <Stack.Screen name="SpendingDetails" component={SpendingDetailsScreen} />
      <Stack.Screen name="Reports" component={ReportsScreen} />
    </Stack.Navigator>
  );
}

// Custom tab bar component to mimic bottom tabs appearance
function CustomTabBar({ state, descriptors, navigation, theme }) {
  return (
    <View
      style={[
        styles.customTabBar,
        {
          backgroundColor: theme.colors.tabBar,
          borderTopColor: theme.colors.border,
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
              ? options.title
              : route.name;

        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, { merge: true });
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: "tabLongPress",
            target: route.key,
          });
        };

        const getIconName = (routeName) => {
          switch (routeName) {
            case "Dashboard":
              return "home-outline";
            case "SettingsMenu":
              return "settings-outline";
            default:
              return "home-outline";
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
              color={
                isFocused
                  ? theme.colors.tabBarActive
                  : theme.colors.tabBarInactive
              }
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
    { key: "dashboard", title: "Dashboard" },
    { key: "settings", title: "Settings" },
  ]);

  const renderScene = SceneMap({
    dashboard: DashboardWrapper,
    settings: SettingsMenuWrapper,
  });

  const renderTabBar = (props) => (
    <TabBar
      {...props}
      style={{
        position: "absolute",
        bottom: 15,
        left: 20,
        right: 20,
        backgroundColor: theme.isDark ? theme.colors.card : theme.colors.tabBar,
        borderTopWidth: 0,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 15,
        paddingBottom: 6,
        paddingTop: 6,
        height: 60,
        borderRadius: 25, // Rounded corners like Telegram
      }}
      tabStyle={{
        paddingVertical: 6,
        justifyContent: "center",
      }}
      indicatorStyle={{
        backgroundColor: "transparent", // Hide default indicator
      }}
      renderIcon={({ route, focused }) => (
        <View
          style={{
            backgroundColor: focused
              ? theme.colors.tabBarActive
              : "transparent",
            borderRadius: 20,
            width: 40,
            height: 40,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons
            name={
              route.key === "dashboard" ? "home-outline" : "settings-outline"
            }
            size={24}
            color={focused ? "#ffffff" : theme.colors.tabBarInactive}
          />
        </View>
      )}
      renderLabel={() => null} // Remove text labels like Telegram
      activeColor={theme.colors.tabBarActive}
      inactiveColor={theme.colors.tabBarInactive}
      pressColor={
        theme.isDark ? "rgba(0, 136, 204, 0.1)" : "rgba(0, 136, 204, 0.1)"
      }
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

function RootNavigator({ user }) {
  const { theme } = useTheme();

  if (user === undefined) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.colors.background,
        }}
      >
        <StatusBar style={theme.isDark ? "light" : "dark"} />
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const baseTheme = theme.isDark ? DarkTheme : DefaultTheme;
  const customNavTheme = {
    ...baseTheme,
    dark: theme.isDark,
    colors: {
      ...baseTheme.colors,
      primary: theme.colors.primary,
      background: theme.colors.background,
      card: theme.colors.card,
      text: theme.colors.text,
      border: theme.colors.border,
      notification: theme.colors.primary,
    },
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <NavigationContainer theme={customNavTheme}>
        <StatusBar style={theme.isDark ? "light" : "dark"} />
        {user ? (
          <AppStack />
        ) : (
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: theme.colors.background },
            }}
          >
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          </Stack.Navigator>
        )}
      </NavigationContainer>
      <GlobalAlertComponent />
    </View>
  );
}

export default function App() {
  const [user, setUser] = useState(undefined);

  useEffect(() => subscribeToAuthChanges(setUser), []);

  if (firebaseInitError) {
    return (
      <SafeAreaProvider>
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 20,
            backgroundColor: "#fff",
          }}
        >
          <StatusBar style="dark" />
          <Text style={{ fontSize: 20, fontWeight: "700", marginBottom: 10 }}>
            Configuration Error
          </Text>
          <Text
            style={{ textAlign: "center", color: "#374151", lineHeight: 22 }}
          >
            {firebaseInitError}
          </Text>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <RootNavigator user={user} />
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
