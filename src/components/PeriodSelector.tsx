import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { PeriodFilter } from '../types/transaction';
import { ThemePalette } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';

interface PeriodSelectorProps {
  currentPeriod: PeriodFilter;
  onSelectPeriod: (p: PeriodFilter) => void;
}

const PERIODS: { key: PeriodFilter; label: string }[] = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'annually', label: 'Annually' },
];

export const PeriodSelector: React.FC<PeriodSelectorProps> = ({ currentPeriod, onSelectPeriod }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      {PERIODS.map((item) => {
        const isActive = currentPeriod === item.key;
        return (
          <TouchableOpacity
            key={item.key}
            style={[styles.pill, isActive && styles.activePill]}
            onPress={() => onSelectPeriod(item.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.pillText, isActive && styles.activePillText]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const getStyles = (colors: ThemePalette) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      padding: 4,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      marginHorizontal: 16,
      marginVertical: 10,
    },
    pill: {
      flex: 1,
      paddingVertical: 8,
      alignItems: 'center',
      borderRadius: 10,
    },
    activePill: {
      backgroundColor: colors.primary,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 3,
    },
    pillText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    activePillText: {
      color: colors.primaryText,
      fontWeight: '700',
    },
  });
