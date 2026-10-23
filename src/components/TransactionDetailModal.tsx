import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemePalette } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import { Category, Currency, Transaction } from '../types/transaction';
import { formatCurrency, formatDatePretty, getActivityConfig } from '../utils/formatters';

interface TransactionDetailModalProps {
  visible: boolean;
  transaction: Transaction | null;
  categories: Category[];
  categoriesMap: Map<string, Category>;
  currency: Currency;
  onClose: () => void;
  onUpdateCategory: (txId: string, newCategoryId: string) => Promise<void>;
  onDelete: (tx: Transaction) => void;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  visible,
  transaction,
  categories,
  categoriesMap,
  currency,
  onClose,
  onUpdateCategory,
  onDelete,
}) => {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [isSmsExpanded, setIsSmsExpanded] = useState<boolean>(false);
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState<boolean>(false);
  const [copiedFeedback, setCopiedFeedback] = useState<boolean>(false);

  if (!transaction) return null;

  const currentCat = categoriesMap.get(transaction.categoryId);
  const actConfig = getActivityConfig(transaction.activity);
  const isIncome = transaction.type === 'income';

  // Filter categories matching current transaction type (income vs expense)
  const availableCategories = categories.filter((c) => c.type === transaction.type);

  const rawSmsText = transaction.rawSms || (transaction.entryMode === 'AUTOMATED' ? transaction.notes : null);

  const handleSelectCategory = async (catId: string) => {
    setIsCategoryPickerOpen(false);
    await onUpdateCategory(transaction.id, catId);
  };

  const handleCopySms = async () => {
    if (!rawSmsText) return;
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(rawSmsText);
        setCopiedFeedback(true);
        setTimeout(() => setCopiedFeedback(false), 2000);
      } else {
        setCopiedFeedback(true);
        setTimeout(() => setCopiedFeedback(false), 2000);
      }
    } catch {
      // Ignore copy error
    }
  };

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheetCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View
                style={[
                  styles.headerIconBox,
                  { backgroundColor: currentCat ? `${currentCat.color}25` : colors.surface },
                ]}
              >
                <Ionicons
                  name={(currentCat?.icon as any) || 'receipt-outline'}
                  size={20}
                  color={currentCat?.color || colors.primary}
                />
              </View>
              <View>
                <Text style={styles.headerTitle}>Transaction Audit & Detail</Text>
                <Text style={styles.headerSubtitle}>
                  {transaction.entryMode === 'AUTOMATED' ? 'Automated Bank Sync Entry' : 'Manual Ledger Entry'}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* 1. Hero Amount Display */}
            <View style={styles.amountHeroCard}>
              <Text style={styles.amountHeroLabel}>
                {isIncome ? 'TOTAL CASH INFLOW' : 'TOTAL CASH OUTFLOW'}
              </Text>
              <Text
                style={[
                  styles.amountHeroValue,
                  { color: isIncome ? colors.inflow : colors.textPrimary },
                ]}
              >
                {isIncome ? '+' : '-'}{formatCurrency(transaction.amount, currency, true)}
              </Text>
              <View style={[styles.typeBadge, { backgroundColor: isIncome ? `${colors.inflow}20` : `${colors.outflow}20` }]}>
                <Ionicons
                  name={isIncome ? 'arrow-down-circle' : 'arrow-up-circle'}
                  size={12}
                  color={isIncome ? colors.inflow : colors.outflow}
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={[
                    styles.typeBadgeText,
                    { color: isIncome ? colors.inflow : colors.outflow },
                  ]}
                >
                  {isIncome ? 'INFLOW • INCOME' : 'OUTFLOW • EXPENSE'}
                </Text>
              </View>
            </View>

            {/* 2. Category Correction Dropdown */}
            <Text style={styles.sectionHeading}>CATEGORY CLASSIFICATION (USER OVERRIDE):</Text>
            <View style={styles.categoryOverrideCard}>
              <TouchableOpacity
                style={styles.categoryDropdownTrigger}
                onPress={() => setIsCategoryPickerOpen(!isCategoryPickerOpen)}
                activeOpacity={0.75}
              >
                <View style={styles.categoryTriggerLeft}>
                  <View
                    style={[
                      styles.catIconCircle,
                      { backgroundColor: currentCat ? `${currentCat.color}25` : colors.surface },
                    ]}
                  >
                    <Ionicons
                      name={(currentCat?.icon as any) || 'pricetag-outline'}
                      size={16}
                      color={currentCat?.color || colors.primary}
                    />
                  </View>
                  <View>
                    <Text style={styles.currentCatName}>{currentCat?.name || 'Uncategorized'}</Text>
                    <View style={[styles.actPill, { backgroundColor: actConfig.badgeBg }]}>
                      <Text style={[styles.actPillText, { color: actConfig.color }]}>
                        {actConfig.code}: {actConfig.label} Activities
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.dropdownChevronBox}>
                  <Text style={styles.changeLabelText}>Change</Text>
                  <Ionicons
                    name={isCategoryPickerOpen ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={colors.primary}
                  />
                </View>
              </TouchableOpacity>

              {/* Collapsible Category Picker List */}
              {isCategoryPickerOpen && (
                <View style={styles.categoryPickerList}>
                  <Text style={styles.pickerHelperText}>
                    Select category to immediately correct this transaction's accounting allocation:
                  </Text>
                  {availableCategories.map((cat) => {
                    const isSelected = cat.id === transaction.categoryId;
                    const catActConfig = getActivityConfig(cat.activity);
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          styles.categoryOptionRow,
                          isSelected && styles.categoryOptionRowSelected,
                        ]}
                        onPress={() => handleSelectCategory(cat.id)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.categoryOptionLeft}>
                          <View
                            style={[
                              styles.catOptionIcon,
                              { backgroundColor: `${cat.color}20` },
                            ]}
                          >
                            <Ionicons name={cat.icon as any} size={15} color={cat.color} />
                          </View>
                          <View>
                            <Text
                              style={[
                                styles.catOptionName,
                                isSelected && { color: colors.primary, fontWeight: '700' },
                              ]}
                            >
                              {cat.name}
                            </Text>
                            <Text style={styles.catOptionActivity}>
                              {catActConfig.code} • {catActConfig.label}
                            </Text>
                          </View>
                        </View>
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

            {/* 3. Transaction Metadata Overview */}
            <Text style={styles.sectionHeading}>TRANSACTION METADATA:</Text>
            <View style={styles.metaBox}>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Date Recorded</Text>
                <Text style={styles.metaValue}>{formatDatePretty(transaction.date)} ({transaction.date})</Text>
              </View>

              <View style={styles.metaDivider} />

              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Source Account</Text>
                <Text style={styles.metaValue}>{transaction.sourceAccount || 'Cash'}</Text>
              </View>

              <View style={styles.metaDivider} />

              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Payment Channel</Text>
                <Text style={styles.metaValue}>
                  {transaction.detectedUpiApp ||
                    (transaction.entryMode === 'AUTOMATED' ? 'Auto Detect (Smart Merge)' : 'Manual Entry')}
                </Text>
              </View>

              <View style={styles.metaDivider} />

              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Accounting Pillar</Text>
                <View style={[styles.actBadgeInline, { backgroundColor: actConfig.badgeBg }]}>
                  <Text style={[styles.actBadgeInlineText, { color: actConfig.color }]}>
                    {actConfig.code} ({actConfig.label})
                  </Text>
                </View>
              </View>

              {transaction.notes ? (
                <>
                  <View style={styles.metaDivider} />
                  <View style={styles.metaRowCol}>
                    <Text style={styles.metaLabel}>Vendor / Parsed Notes</Text>
                    <Text style={styles.metaNotes}>{transaction.notes}</Text>
                  </View>
                </>
              ) : null}
            </View>

            {/* 4. Full Message Audit Visibility */}
            <Text style={styles.sectionHeading}>FULL MESSAGE AUDIT VISIBILITY:</Text>
            <View style={styles.auditCard}>
              <TouchableOpacity
                style={styles.expandSmsTrigger}
                onPress={() => setIsSmsExpanded(!isSmsExpanded)}
                activeOpacity={0.75}
              >
                <View style={styles.expandSmsLeft}>
                  <Ionicons
                    name={rawSmsText ? 'document-text-outline' : 'help-circle-outline'}
                    size={18}
                    color={rawSmsText ? colors.primary : colors.textMuted}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.expandSmsTitle}>View Original SMS</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.expandSmsStatus}>
                    {rawSmsText ? (isSmsExpanded ? 'Collapse' : 'Expand') : 'No SMS'}
                  </Text>
                  <Ionicons
                    name={isSmsExpanded ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={colors.primary}
                    style={{ marginLeft: 4 }}
                  />
                </View>
              </TouchableOpacity>

              {/* Collapsible Unedited String Audit View */}
              {isSmsExpanded && (
                <View style={styles.rawAuditPanel}>
                  <View style={styles.rawAuditHeader}>
                    <View style={styles.rawAuditTag}>
                      <Ionicons name="shield-checkmark" size={12} color={colors.operating} style={{ marginRight: 4 }} />
                      <Text style={styles.rawAuditTagText}>COMPLETE UNEDITED OPERATING SYSTEM STRING</Text>
                    </View>
                    {rawSmsText ? (
                      <TouchableOpacity
                        style={styles.copyBtn}
                        onPress={handleCopySms}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={copiedFeedback ? 'checkmark' : 'copy-outline'}
                          size={12}
                          color={copiedFeedback ? colors.operating : colors.primary}
                          style={{ marginRight: 3 }}
                        />
                        <Text
                          style={[
                            styles.copyBtnText,
                            copiedFeedback && { color: colors.operating },
                          ]}
                        >
                          {copiedFeedback ? 'Copied!' : 'Copy'}
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  <View style={styles.rawAuditTextBox}>
                    <Text style={styles.rawAuditText} selectable={true}>
                      {rawSmsText
                        ? rawSmsText
                        : 'Manual Ledger Entry: No incoming SMS was detected or attached to this transaction.'}
                    </Text>
                  </View>

                  <View style={styles.rawAuditFooter}>
                    <Ionicons name="lock-closed-outline" size={12} color={colors.textMuted} style={{ marginRight: 4 }} />
                    <Text style={styles.rawAuditFooterText}>
                      Stored 100% offline in local SQLite ledger without truncation.
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* 5. Delete Action Button */}
            <View style={styles.dangerSection}>
              <TouchableOpacity
                style={styles.deleteTxBtn}
                onPress={() => onDelete(transaction)}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={16} color={colors.outflow} style={{ marginRight: 6 }} />
                <Text style={styles.deleteTxBtnText}>Delete Transaction</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const getStyles = (colors: ThemePalette) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'flex-end',
    },
    sheetCard: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '90%',
      borderTopWidth: 1,
      borderLeftWidth: 1,
      borderRightWidth: 1,
      borderColor: colors.cardBorder,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 18,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    headerIconBox: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    headerSubtitle: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 2,
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.cardMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 40,
    },
    amountHeroCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 18,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.cardBorder,
      marginBottom: 20,
    },
    amountHeroLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.textMuted,
      letterSpacing: 0.8,
      marginBottom: 4,
    },
    amountHeroValue: {
      fontSize: 32,
      fontWeight: '800',
      letterSpacing: -0.5,
      marginBottom: 8,
    },
    typeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    typeBadgeText: {
      fontSize: 11,
      fontWeight: '800',
    },
    sectionHeading: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textMuted,
      letterSpacing: 0.8,
      marginBottom: 8,
      marginTop: 4,
    },
    categoryOverrideCard: {
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      overflow: 'hidden',
      marginBottom: 16,
    },
    categoryDropdownTrigger: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 14,
    },
    categoryTriggerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    catIconCircle: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    currentCatName: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    actPill: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      marginTop: 3,
      alignSelf: 'flex-start',
    },
    actPillText: {
      fontSize: 10,
      fontWeight: '700',
    },
    dropdownChevronBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      gap: 4,
    },
    changeLabelText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.primary,
    },
    categoryPickerList: {
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
      padding: 12,
      backgroundColor: colors.surface,
      maxHeight: 240,
    },
    pickerHelperText: {
      fontSize: 11,
      color: colors.textMuted,
      marginBottom: 8,
    },
    categoryOptionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
      paddingHorizontal: 10,
      borderRadius: 8,
      marginBottom: 4,
    },
    categoryOptionRowSelected: {
      backgroundColor: colors.primaryMuted,
    },
    categoryOptionLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    catOptionIcon: {
      width: 30,
      height: 30,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    catOptionName: {
      fontSize: 13,
      color: colors.textPrimary,
      fontWeight: '600',
    },
    catOptionActivity: {
      fontSize: 10,
      color: colors.textMuted,
      marginTop: 1,
    },
    metaBox: {
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      marginBottom: 16,
    },
    metaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    metaRowCol: {
      flexDirection: 'column',
      gap: 4,
    },
    metaLabel: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    metaValue: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    metaNotes: {
      fontSize: 12,
      color: colors.textPrimary,
      lineHeight: 18,
    },
    metaDivider: {
      height: 1,
      backgroundColor: colors.cardBorder,
      marginVertical: 10,
    },
    actBadgeInline: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
    },
    actBadgeInlineText: {
      fontSize: 11,
      fontWeight: '700',
    },
    auditCard: {
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      overflow: 'hidden',
      marginBottom: 16,
    },
    expandSmsTrigger: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 14,
    },
    expandSmsLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    expandSmsTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    expandSmsStatus: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.primary,
    },
    rawAuditPanel: {
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
      backgroundColor: colors.surface,
      padding: 14,
    },
    rawAuditHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    rawAuditTag: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    rawAuditTagText: {
      fontSize: 9,
      fontWeight: '800',
      color: colors.textMuted,
      letterSpacing: 0.5,
    },
    copyBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardMuted,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    copyBtnText: {
      fontSize: 11,
      color: colors.primary,
      fontWeight: '700',
    },
    rawAuditTextBox: {
      backgroundColor: colors.cardMuted,
      borderRadius: 8,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      marginBottom: 8,
    },
    rawAuditText: {
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      fontSize: 12,
      color: colors.primary,
      lineHeight: 18,
    },
    rawAuditFooter: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    rawAuditFooterText: {
      fontSize: 10,
      color: colors.textMuted,
    },
    dangerSection: {
      marginTop: 4,
    },
    deleteTxBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: `${colors.outflow}15`,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: `${colors.outflow}35`,
    },
    deleteTxBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.outflow,
    },
  });
