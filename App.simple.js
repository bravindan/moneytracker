import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { subscribeToAuthChanges } from './src/services/authService';
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import { ThemeProvider } from './src/contexts/ThemeContext';

const Stack = createNativeStackNavigator();

function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
    </Stack.Navigator>
  );
}

function RootNavigator({ user }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <NavigationContainer>
        <ThemeProvider>
          {user ? <AppStack /> : <LoginScreen />}
        </ThemeProvider>
      </NavigationContainer>
    </View>
  );
}

export default function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(setUser);
    return unsubscribe;
  }, []);

  return <RootNavigator user={user} />;
}
