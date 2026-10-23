import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemePalette } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import { CashFlowStatement, CategoryBreakdownItem } from '../types/transaction';
import { formatCurrency } from '../utils/formatters';
import { useTransactions } from '../context/TransactionContext';

interface VisualReportsViewProps {
  statement: CashFlowStatement;
  periodLabel: string;
  expenseCategories: CategoryBreakdownItem[];
  incomeCategories: CategoryBreakdownItem[];
}

export const VisualReportsView: React.FC<VisualReportsViewProps> = ({
  statement,
  periodLabel,
  expenseCategories,
  incomeCategories,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const { currency } = useTransactions();
  const [activeTab, setActiveTab] = useState<'expenses' | 'income'>('expenses');

  // Compute maximum amount for comparative inflow/outflow bar chart
  const maxFlow = Math.max(statement.totalInflows, statement.totalOutflows, 1);
  const inflowWidthPct = Math.min(100, Math.round((statement.totalInflows / maxFlow) * 100));
  const outflowWidthPct = Math.min(100, Math.round((statement.totalOutflows / maxFlow) * 100));

  // Compute Outflow Activity Distribution (Operating vs Investing vs Financing)
  const totalOut = statement.totalOutflows || 1;
  const opPct = Math.round((statement.operatingOutflows / totalOut) * 100);
  const invPct = Math.round((statement.investingOutflows / totalOut) * 100);
  const finPct = Math.round((statement.financingOutflows / totalOut) * 100);

  const displayList = activeTab === 'expenses' ? expenseCategories : incomeCategories;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Visual Cash Flow Analysis</Text>
        <Text style={styles.subtitle}>{periodLabel}</Text>
      </View>

      {/* 1. Cash Inflow vs Outflow Comparison Chart */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Cash Inflows vs Outflows</Text>
          <Text style={styles.cardTag}>Macro Balance</Text>
        </View>

        <View style={styles.chartRow}>
          <View style={styles.labelCol}>
            <Text style={styles.flowBarLabel}>Inflows</Text>
            <Text style={[styles.flowBarVal, { color: colors.inflow }]}>
              {formatCurrency(statement.totalInflows, currency)}
            </Text>
          </View>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${inflowWidthPct}%`, backgroundColor: colors.inflow }]} />
          </View>
        </View>

        <View style={styles.chartRow}>
          <View style={styles.labelCol}>
            <Text style={styles.flowBarLabel}>Outflows</Text>
            <Text style={[styles.flowBarVal, { color: colors.outflow }]}>
              {formatCurrency(statement.totalOutflows, currency)}
            </Text>
          </View>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${outflowWidthPct}%`, backgroundColor: colors.outflow }]} />
          </View>
        </View>

        <View style={styles.savingsRateRow}>
          <Text style={styles.savingsRateText}>
            Net Margin:{' '}
            <Text
              style={{
                color: statement.netCashFlow >= 0 ? colors.inflow : colors.outflow,
                fontWeight: '700',
              }}
            >
              {statement.totalInflows > 0
                ? `${((statement.netCashFlow / statement.totalInflows) * 100).toFixed(1)}%`
                : '0%'}
            </Text>
          </Text>
          <Text style={styles.netCashLabel}>{formatCurrency(statement.netCashFlow, currency, true)}</Text>
        </View>
      </View>

      {/* 2. Capital Allocation Breakdown (Household Operating vs Investing vs Financing) */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Household Outflow Distribution</Text>
          <Text style={styles.cardTag}>Accounting Split</Text>
        </View>

        {/* Stacked Ratio Bar */}
        <View style={styles.stackedBarContainer}>
          <View style={[styles.stackedSegment, { flex: opPct || 1, backgroundColor: colors.operating }]} />
          <View style={[styles.stackedSegment, { flex: invPct || 1, backgroundColor: colors.investing }]} />
          <View style={[styles.stackedSegment, { flex: finPct || 1, backgroundColor: colors.financing }]} />
        </View>

        {/* Legend */}
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.operating }]} />
            <Text style={styles.legendLabel}>Operating (Living): {opPct}%</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.investing }]} />
            <Text style={styles.legendLabel}>Investing (Growth): {invPct}%</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.financing }]} />
            <Text style={styles.legendLabel}>Financing (Debt): {finPct}%</Text>
          </View>
        </View>
      </View>

      {/* 3. Category Breakdown with Visual Bars */}
      <View style={styles.card}>
        <View style={styles.tabHeaderRow}>
          <Text style={styles.cardTitle}>Category Breakdown</Text>
          <View style={styles.tabToggle}>
            <TouchableOpacity
              style={[styles.toggleBtn, activeTab === 'expenses' && styles.toggleBtnActive]}
              onPress={() => setActiveTab('expenses')}
            >
              <Text style={[styles.toggleBtnText, activeTab === 'expenses' && styles.toggleBtnTextActive]}>
                Outflows
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, activeTab === 'income' && styles.toggleBtnActive]}
              onPress={() => setActiveTab('income')}
            >
              <Text style={[styles.toggleBtnText, activeTab === 'income' && styles.toggleBtnTextActive]}>
                Inflows
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {displayList.length === 0 ? (
          <Text style={styles.emptyText}>No transactions recorded for this selection.</Text>
        ) : (
          displayList.map((item) => (
            <View key={item.categoryId} style={styles.categoryRow}>
              <View style={styles.categoryInfo}>
                <View style={styles.catLeft}>
                  <View style={[styles.catIconWrap, { backgroundColor: `${item.color}20` }]}>
                    <Ionicons name={(item.icon as any) || 'pricetag-outline'} size={15} color={item.color} />
                  </View>
                  <View>
                    <Text style={styles.catName}>{item.categoryName}</Text>
                    <Text style={styles.catSubtext}>
                      {item.activity.toUpperCase()} • {item.percentage.toFixed(1)}%
                    </Text>
                  </View>
                </View>
                <Text style={styles.catAmount}>{formatCurrency(item.totalAmount, currency)}</Text>
              </View>

              {/* Progress bar */}
              <View style={styles.catProgressTrack}>
                <View
                  style={[
                    styles.catProgressFill,
                    {
                      width: `${Math.max(2, item.percentage)}%`,
                      backgroundColor: item.color,
                    },
                  ]}
                />
              </View>
            </View>
          ))
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const getStyles = (colors: ThemePalette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: 16,
    },
    header: {
      marginTop: 6,
      marginBottom: 14,
    },
    title: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    subtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 18,
      padding: 16,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 14,
    },
    cardTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    cardTag: {
      fontSize: 11,
      color: colors.primary,
      fontWeight: '600',
    },
    chartRow: {
      marginBottom: 12,
    },
    labelCol: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    flowBarLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    flowBarVal: {
      fontSize: 13,
      fontWeight: '700',
    },
    barTrack: {
      height: 10,
      backgroundColor: colors.surface,
      borderRadius: 5,
      overflow: 'hidden',
    },
    barFill: {
      height: '100%',
      borderRadius: 5,
    },
    savingsRateRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
      paddingTop: 10,
      marginTop: 6,
    },
    savingsRateText: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    netCashLabel: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    stackedBarContainer: {
      flexDirection: 'row',
      height: 16,
      borderRadius: 8,
      overflow: 'hidden',
      marginBottom: 14,
    },
    stackedSegment: {
      height: '100%',
    },
    legendRow: {
      gap: 6,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    legendDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 6,
    },
    legendLabel: {
      fontSize: 11,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    tabHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    tabToggle: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: 8,
      padding: 2,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    toggleBtn: {
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: 6,
    },
    toggleBtnActive: {
      backgroundColor: colors.primaryMuted,
    },
    toggleBtnText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    toggleBtnTextActive: {
      color: colors.primary,
      fontWeight: '700',
    },
    emptyText: {
      color: colors.textMuted,
      fontSize: 13,
      fontStyle: 'italic',
      paddingVertical: 10,
      textAlign: 'center',
    },
    categoryRow: {
      marginBottom: 14,
    },
    categoryInfo: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    catLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    catIconWrap: {
      width: 30,
      height: 30,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    catName: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    catSubtext: {
      fontSize: 10,
      color: colors.textMuted,
      marginTop: 1,
    },
    catAmount: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    catProgressTrack: {
      height: 6,
      backgroundColor: colors.surface,
      borderRadius: 3,
      overflow: 'hidden',
    },
    catProgressFill: {
      height: '100%',
      borderRadius: 3,
    },
  });
