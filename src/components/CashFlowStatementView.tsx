import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemePalette } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import { CashFlowStatement, AccountingActivity } from '../types/transaction';
import { formatCurrency, getActivityConfig } from '../utils/formatters';
import { useTransactions } from '../context/TransactionContext';

interface CashFlowStatementViewProps {
  statement: CashFlowStatement;
  periodLabel: string;
}

export const CashFlowStatementView: React.FC<CashFlowStatementViewProps> = ({
  statement,
  periodLabel,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const { currency } = useTransactions();
  const [expandedSection, setExpandedSection] = useState<AccountingActivity | null>('operating');

  const toggleSection = (section: AccountingActivity) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const renderActivityCard = (
    activity: AccountingActivity,
    inflows: number,
    outflows: number,
    net: number,
    items: { categoryName: string; amount: number; type: 'income' | 'expense' }[]
  ) => {
    const config = getActivityConfig(activity);
    const isExpanded = expandedSection === activity;
    const isNetPositive = net >= 0;

    return (
      <View style={styles.sectionCard}>
        {/* Header clickable toggle */}
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleSection(activity)}
          activeOpacity={0.7}
        >
          <View style={styles.headerLeft}>
            <View style={[styles.badgePill, { backgroundColor: config.badgeBg }]}>
              <Text style={[styles.badgeText, { color: config.color }]}>{config.code}</Text>
            </View>
            <View>
              <Text style={styles.activityTitle}>{config.label} Activities</Text>
              <Text style={styles.activitySubtitle}>{config.description}</Text>
            </View>
          </View>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={colors.textSecondary}
          />
        </TouchableOpacity>

        {/* Inflows & Outflows Summary Line */}
        <View style={styles.summaryBar}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryItemLabel}>Inflow (+)</Text>
            <Text style={[styles.summaryItemValue, { color: colors.inflow }]}>
              {formatCurrency(inflows, currency)}
            </Text>
          </View>
          <View style={styles.verticalDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryItemLabel}>Outflow (-)</Text>
            <Text style={[styles.summaryItemValue, { color: colors.outflow }]}>
              {formatCurrency(outflows, currency)}
            </Text>
          </View>
          <View style={styles.verticalDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryItemLabel}>Net {config.code}</Text>
            <Text
              style={[
                styles.summaryItemValue,
                { color: isNetPositive ? colors.inflow : colors.outflow, fontWeight: '700' },
              ]}
            >
              {formatCurrency(net, currency, true)}
            </Text>
          </View>
        </View>

        {/* Expanded Itemized Breakdown */}
        {isExpanded && (
          <View style={styles.itemsContainer}>
            <Text style={styles.itemsHeader}>Itemized Categories</Text>
            {items.length === 0 ? (
              <Text style={styles.noItemsText}>No {activity} activity recorded in this period.</Text>
            ) : (
              items.map((item, index) => {
                const isItemIncome = item.type === 'income';
                return (
                  <View key={`${item.categoryName}-${index}`} style={styles.itemRow}>
                    <View style={styles.itemLeft}>
                      <View
                        style={[
                          styles.itemDot,
                          { backgroundColor: isItemIncome ? colors.inflow : colors.outflow },
                        ]}
                      />
                      <Text style={styles.itemName}>{item.categoryName}</Text>
                    </View>
                    <Text
                      style={[
                        styles.itemAmount,
                        { color: isItemIncome ? colors.inflow : colors.textPrimary },
                      ]}
                    >
                      {isItemIncome ? '+' : '-'}
                      {formatCurrency(item.amount, currency)}
                    </Text>
                  </View>
                );
              })
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Statement Title Banner */}
      <View style={styles.banner}>
        <View>
          <Text style={styles.bannerTitle}>Statement of Cash Flows</Text>
          <Text style={styles.bannerSubtitle}>Household Accounting Model • {periodLabel}</Text>
        </View>
        <View style={styles.statementBadge}>
          <Text style={styles.statementBadgeText}>GAAP Adjusted</Text>
        </View>
      </View>

      {/* 1. Operating Activities */}
      {renderActivityCard(
        'operating',
        statement.operatingInflows,
        statement.operatingOutflows,
        statement.netOperating,
        statement.operatingItems
      )}

      {/* 2. Investing Activities */}
      {renderActivityCard(
        'investing',
        statement.investingInflows,
        statement.investingOutflows,
        statement.netInvesting,
        statement.investingItems
      )}

      {/* 3. Financing Activities */}
      {renderActivityCard(
        'financing',
        statement.financingInflows,
        statement.financingOutflows,
        statement.netFinancing,
        statement.financingItems
      )}

      {/* Bottom Line Reconciliation */}
      <View style={styles.bottomLineCard}>
        <View style={styles.bottomLineHeader}>
          <Text style={styles.bottomLineTitle}>Net Change in Cash</Text>
          <Text style={styles.reconciliationFormula}>CFO + CFI + CFF</Text>
        </View>

        <View style={styles.reconciliationRow}>
          <View style={styles.formulaPill}>
            <Text style={styles.formulaPillLabel}>Operating</Text>
            <Text
              style={[
                styles.formulaPillVal,
                { color: statement.netOperating >= 0 ? colors.inflow : colors.outflow },
              ]}
            >
              {formatCurrency(statement.netOperating, currency, true)}
            </Text>
          </View>
          <Text style={styles.mathSymbol}>+</Text>
          <View style={styles.formulaPill}>
            <Text style={styles.formulaPillLabel}>Investing</Text>
            <Text
              style={[
                styles.formulaPillVal,
                { color: statement.netInvesting >= 0 ? colors.inflow : colors.outflow },
              ]}
            >
              {formatCurrency(statement.netInvesting, currency, true)}
            </Text>
          </View>
          <Text style={styles.mathSymbol}>+</Text>
          <View style={styles.formulaPill}>
            <Text style={styles.formulaPillLabel}>Financing</Text>
            <Text
              style={[
                styles.formulaPillVal,
                { color: statement.netFinancing >= 0 ? colors.inflow : colors.outflow },
              ]}
            >
              {formatCurrency(statement.netFinancing, currency, true)}
            </Text>
          </View>
        </View>

        <View style={styles.netCashResultRow}>
          <Text style={styles.netCashResultLabel}>Net Household Cash Flow:</Text>
          <Text
            style={[
              styles.netCashResultAmount,
              { color: statement.netCashFlow >= 0 ? colors.inflow : colors.outflow },
            ]}
          >
            {formatCurrency(statement.netCashFlow, currency, true)}
          </Text>
        </View>
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
    banner: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 6,
      marginBottom: 16,
      backgroundColor: colors.surface,
      padding: 16,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    bannerTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    bannerSubtitle: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 2,
    },
    statementBadge: {
      backgroundColor: colors.primaryMuted,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    statementBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.primary,
    },
    sectionCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    badgePill: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      marginRight: 10,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: '800',
    },
    activityTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    activitySubtitle: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 1,
    },
    summaryBar: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 12,
      marginTop: 14,
      alignItems: 'center',
    },
    summaryItem: {
      flex: 1,
      alignItems: 'center',
    },
    summaryItemLabel: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.textMuted,
      textTransform: 'uppercase',
      marginBottom: 2,
    },
    summaryItemValue: {
      fontSize: 13,
      fontWeight: '600',
    },
    verticalDivider: {
      width: 1,
      height: 24,
      backgroundColor: colors.cardBorder,
    },
    itemsContainer: {
      marginTop: 14,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
      paddingTop: 12,
    },
    itemsHeader: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textMuted,
      textTransform: 'uppercase',
      marginBottom: 8,
    },
    noItemsText: {
      fontSize: 12,
      color: colors.textMuted,
      fontStyle: 'italic',
      paddingVertical: 4,
    },
    itemRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 6,
    },
    itemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    itemDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      marginRight: 8,
    },
    itemName: {
      fontSize: 13,
      color: colors.textPrimary,
    },
    itemAmount: {
      fontSize: 13,
      fontWeight: '600',
    },
    bottomLineCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 18,
      borderWidth: 1.5,
      borderColor: colors.primary,
      marginBottom: 16,
    },
    bottomLineHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    bottomLineTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    reconciliationFormula: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.primary,
    },
    reconciliationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    formulaPill: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 8,
      paddingVertical: 6,
      paddingHorizontal: 8,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    formulaPillLabel: {
      fontSize: 9,
      fontWeight: '600',
      color: colors.textMuted,
      textTransform: 'uppercase',
    },
    formulaPillVal: {
      fontSize: 11,
      fontWeight: '700',
      marginTop: 2,
    },
    mathSymbol: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textMuted,
      marginHorizontal: 4,
    },
    netCashResultRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
      paddingTop: 12,
    },
    netCashResultLabel: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    netCashResultAmount: {
      fontSize: 20,
      fontWeight: '800',
    },
  });
