import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkTheme, LightTheme, ThemePalette } from '../theme/colors';

export type ThemeMode = 'dark' | 'light';

export interface ThemeContextType {
  themeMode: ThemeMode;
  theme: ThemePalette;
  colors: ThemePalette;
  isDark: boolean;
  toggleTheme: () => Promise<void>;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
}

const THEME_STORAGE_KEY = '@cashflow_theme_mode_v2';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('dark');
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  useEffect(() => {
    const loadSavedTheme = async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (saved === 'light' || saved === 'dark') {
          setThemeModeState(saved);
        }
      } catch (err) {
        console.warn('Failed to load saved theme mode:', err);
      } finally {
        setIsLoaded(true);
      }
    };
    loadSavedTheme();
  }, []);

  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (err) {
      console.warn('Failed to persist theme mode:', err);
    }
  }, []);

  const toggleTheme = useCallback(async () => {
    const nextMode: ThemeMode = themeMode === 'dark' ? 'light' : 'dark';
    await setThemeMode(nextMode);
  }, [themeMode, setThemeMode]);

  const activeTheme = useMemo(() => {
    return themeMode === 'light' ? LightTheme : DarkTheme;
  }, [themeMode]);

  const isDark = themeMode === 'dark';

  const contextValue = useMemo(
    () => ({
      themeMode,
      theme: activeTheme,
      colors: activeTheme,
      isDark,
      toggleTheme,
      setThemeMode,
    }),
    [themeMode, activeTheme, isDark, toggleTheme, setThemeMode]
  );

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
