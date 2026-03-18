import React, { createContext, useContext, useState, useEffect } from 'react';
import { Appearance, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState('system');
  const [theme, setTheme] = useState({
    colors: {
      primary: '#0088cc',
      background: '#ffffff',
      card: '#ffffff',
      text: '#111827',
      textSecondary: '#6b7280',
      border: '#e5e7eb',
      tabBar: '#ffffff',
      tabBarInactive: '#8a8a8a',
      tabBarActive: '#0088cc',
      tabBarFocused: '#e8f4fd',
    },
  });

  useEffect(() => {
    loadThemePreference();
  }, []);

  useEffect(() => {
    updateTheme();
  }, [themeMode, systemColorScheme]);

  // Add listener for appearance changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      if (themeMode === 'system') {
        updateThemeBasedOnScheme(colorScheme);
      }
    });

    return () => subscription.remove();
  }, [themeMode]);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('themeMode');
      if (savedTheme) {
        setThemeMode(savedTheme);
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
    }
  };

  const updateThemeBasedOnScheme = (colorScheme) => {
    const isDark = 
      themeMode === 'dark' || 
      (themeMode === 'system' && colorScheme === 'dark');

    if (isDark) {
      setTheme({
        colors: {
          primary: '#007AFF', // iOS blue
          background: '#000000', // Pure black for OLED
          card: '#1C1C1E', // iOS dark card
          text: '#FFFFFF',
          textSecondary: '#8E8E93', // iOS secondary
          border: '#38383A', // iOS border
          tabBar: '#2C2C2E', // iOS tab bar
          tabBarInactive: '#8E8E93',
          tabBarActive: '#007AFF',
          tabBarFocused: '#007AFF',
        },
      });
    } else {
      setTheme({
        colors: {
          primary: '#007AFF', // iOS blue
          background: '#F2F2F7', // iOS light background
          card: '#FFFFFF', // Pure white cards
          text: '#000000',
          textSecondary: '#8E8E93',
          border: '#C6C6C8', // iOS light border
          tabBar: '#FFFFFF',
          tabBarInactive: '#8E8E93',
          tabBarActive: '#007AFF',
          tabBarFocused: '#E3F2FD',
        },
      });
    }
  };

  const updateTheme = () => {
    updateThemeBasedOnScheme(systemColorScheme);
  };

  const setThemePreference = async (mode) => {
    try {
      await AsyncStorage.setItem('themeMode', mode);
      setThemeMode(mode);
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  const value = {
    theme,
    themeMode,
    setThemePreference,
    isDark: theme.colors.background === '#000000',
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
