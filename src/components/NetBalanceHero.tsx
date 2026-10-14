import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { formatCurrency } from '../utils/formatters';
import { DashboardMetrics, Currency } from '../types/transaction';

interface NetBalanceHeroProps {
  metrics: DashboardMetrics;
  currency?: Currency;
  onOpenAddModal: (type: 'income' | 'expense') => void;
}

export const NetBalanceHero: React.FC<NetBalanceHeroProps> = ({ metrics, currency, onOpenAddModal }) => {
  const isPositive = metrics.netBalance >= 0;

  return (
    <View style={styles.card}>
      {/* Header with Period Label */}
      <View style={styles.headerRow}>
        <View style={styles.periodBadge}>
          <Ionicons name="calendar-outline" size={13} color={Colors.primary} style={{ marginRight: 5 }} />
          <Text style={styles.periodBadgeText}>{metrics.periodLabel}</Text>
        </View>
        <Text style={styles.tagline}>Net Balance</Text>
      </View>

      {/* Hero Net Balance Number */}
      <View style={styles.balanceContainer}>
        <Text
          style={[
            styles.balanceAmount,
            { color: isPositive ? Colors.inflow : Colors.outflow },
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
        <View style={[styles.flowBox, { borderColor: 'rgba(16, 185, 129, 0.25)' }]}>
          <View style={styles.flowBoxHeader}>
            <View style={[styles.iconCircle, { backgroundColor: Colors.inflowBg }]}>
              <Ionicons name="arrow-down" size={14} color={Colors.inflow} />
            </View>
            <Text style={styles.flowLabel}>Total Inflow</Text>
          </View>
          <Text style={[styles.flowAmount, { color: Colors.inflow }]}>
            {formatCurrency(metrics.totalInflows, currency)}
          </Text>
        </View>

        <View style={[styles.flowBox, { borderColor: 'rgba(244, 63, 94, 0.25)' }]}>
          <View style={styles.flowBoxHeader}>
            <View style={[styles.iconCircle, { backgroundColor: Colors.outflowBg }]}>
              <Ionicons name="arrow-up" size={14} color={Colors.outflow} />
            </View>
            <Text style={styles.flowLabel}>Total Outflow</Text>
          </View>
          <Text style={[styles.flowAmount, { color: Colors.outflow }]}>
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
          <Ionicons name="add-circle-outline" size={18} color="#0B0F19" style={{ marginRight: 6 }} />
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

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
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
    backgroundColor: Colors.surface,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  periodBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  tagline: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textMuted,
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
    color: Colors.textSecondary,
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
    backgroundColor: Colors.surface,
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
    color: Colors.textSecondary,
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
    backgroundColor: Colors.inflow,
  },
  incomeBtnText: {
    color: '#0B0F19',
    fontWeight: '700',
    fontSize: 14,
  },
  expenseBtn: {
    backgroundColor: Colors.outflow,
  },
  expenseBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
