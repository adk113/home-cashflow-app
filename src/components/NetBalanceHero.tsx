import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemePalette } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import { formatCurrency } from '../utils/formatters';
import { DashboardMetrics, Currency } from '../types/transaction';

interface NetBalanceHeroProps {
  metrics: DashboardMetrics;
  currency?: Currency;
  onOpenAddModal: (type: 'income' | 'expense') => void;
}

export const NetBalanceHero: React.FC<NetBalanceHeroProps> = ({ metrics, currency, onOpenAddModal }) => {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const isPositive = metrics.netBalance >= 0;

  return (
    <View style={styles.card}>
      {/* Header with Period Label */}
      <View style={styles.headerRow}>
        <View style={styles.periodBadge}>
          <Ionicons name="calendar-outline" size={13} color={colors.primary} style={{ marginRight: 5 }} />
          <Text style={styles.periodBadgeText}>{metrics.periodLabel}</Text>
        </View>
        <Text style={styles.tagline}>Net Balance</Text>
      </View>

      {/* Hero Net Balance Number */}
      <View style={styles.balanceContainer}>
        <Text
          style={[
            styles.balanceAmount,
            { color: isPositive ? colors.inflow : colors.outflow },
          ]}
        >
          {formatCurrency(metrics.netBalance, currency, true)}
        </Text>
        <Text style={styles.balanceSubtext}>
          {isPositive ? 'Surplus liquid cash flow' : 'Deficit (Outflows exceed inflows)'}
        </Text>
      </View>

      {/* Inflow vs Outflow Mini-Cards */}
      <View style={styles.flowRow}>
        <View style={[styles.flowBox, { borderColor: `${colors.inflow}40` }]}>
          <View style={styles.flowBoxHeader}>
            <View style={[styles.iconCircle, { backgroundColor: colors.inflowBg }]}>
              <Ionicons name="arrow-down" size={14} color={colors.inflow} />
            </View>
            <Text style={styles.flowLabel}>Total Inflow</Text>
          </View>
          <Text style={[styles.flowAmount, { color: colors.inflow }]}>
            {formatCurrency(metrics.totalInflows, currency)}
          </Text>
        </View>

        <View style={[styles.flowBox, { borderColor: `${colors.outflow}40` }]}>
          <View style={styles.flowBoxHeader}>
            <View style={[styles.iconCircle, { backgroundColor: colors.outflowBg }]}>
              <Ionicons name="arrow-up" size={14} color={colors.outflow} />
            </View>
            <Text style={styles.flowLabel}>Total Outflow</Text>
          </View>
          <Text style={[styles.flowAmount, { color: colors.outflow }]}>
            {formatCurrency(metrics.totalOutflows, currency)}
          </Text>
        </View>
      </View>

      {/* Quick Action Buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.incomeBtn]}
          onPress={() => onOpenAddModal('income')}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.incomeBtnText}>Add Inflow</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.expenseBtn]}
          onPress={() => onOpenAddModal('expense')}
          activeOpacity={0.8}
        >
          <Ionicons name="remove-circle-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.expenseBtnText}>Add Outflow</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const getStyles = (colors: ThemePalette) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      marginHorizontal: 16,
      borderRadius: 20,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 3,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    periodBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      paddingVertical: 5,
      paddingHorizontal: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    periodBadgeText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    tagline: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    balanceContainer: {
      marginVertical: 8,
      alignItems: 'flex-start',
    },
    balanceAmount: {
      fontSize: 34,
      fontWeight: '800',
      letterSpacing: -0.5,
    },
    balanceSubtext: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 4,
    },
    flowRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 16,
      marginBottom: 18,
    },
    flowBox: {
      flex: 1,
      backgroundColor: colors.surface,
      padding: 12,
      borderRadius: 14,
      borderWidth: 1,
    },
    flowBoxHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 6,
    },
    iconCircle: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 6,
    },
    flowLabel: {
      fontSize: 11,
      fontWeight: '500',
      color: colors.textSecondary,
      textTransform: 'uppercase',
    },
    flowAmount: {
      fontSize: 17,
      fontWeight: '700',
    },
    actionRow: {
      flexDirection: 'row',
      gap: 12,
    },
    actionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 12,
    },
    incomeBtn: {
      backgroundColor: colors.inflow,
    },
    incomeBtnText: {
      color: '#FFFFFF',
      fontWeight: '700',
      fontSize: 14,
    },
    expenseBtn: {
      backgroundColor: colors.outflow,
    },
    expenseBtnText: {
      color: '#FFFFFF',
      fontWeight: '700',
      fontSize: 14,
    },
  });
