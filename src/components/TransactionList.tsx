import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemePalette } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import { Transaction, Category, Currency } from '../types/transaction';
import { formatCurrency, formatDatePretty, getActivityConfig } from '../utils/formatters';
import { useTransactions } from '../context/TransactionContext';
import { TransactionDetailModal } from './TransactionDetailModal';

interface TransactionListProps {
  transactions: Transaction[];
  categoriesMap: Map<string, Category>;
  onDeleteTransaction: (id: string) => Promise<void>;
  onDeleteTransactions?: (ids: string[]) => Promise<void>;
  onClearAll?: () => Promise<void>;
  onAddNew: () => void;
  periodLabel: string;
}

// Memoized single row component
const TransactionRow = React.memo<{
  item: Transaction;
  cat?: Category;
  currency?: Currency;
  isSelected: boolean;
  isSelectMode: boolean;
  onToggleSelect: (id: string) => void;
  onStartSelectMode: (id: string) => void;
  onDeleteSingle: (item: Transaction) => void;
  onPressItem: (item: Transaction) => void;
}>(({
  item,
  cat,
  currency,
  isSelected,
  isSelectMode,
  onToggleSelect,
  onStartSelectMode,
  onDeleteSingle,
  onPressItem,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const actConfig = getActivityConfig(item.activity);
  const isIncome = item.type === 'income';

  return (
    <TouchableOpacity
      style={[
        styles.txRow,
        isSelected && styles.txRowSelected,
      ]}
      activeOpacity={0.75}
      onPress={() => {
        if (isSelectMode) {
          onToggleSelect(item.id);
        } else {
          onPressItem(item);
        }
      }}
      onLongPress={() => {
        if (!isSelectMode) {
          onStartSelectMode(item.id);
        }
      }}
    >
      <View style={styles.leftCol}>
        {isSelectMode && (
          <TouchableOpacity
            style={styles.checkCol}
            onPress={() => onToggleSelect(item.id)}
          >
            <Ionicons
              name={isSelected ? 'checkbox' : 'square-outline'}
              size={22}
              color={isSelected ? colors.primary : colors.textMuted}
            />
          </TouchableOpacity>
        )}

        <View
          style={[
            styles.iconBox,
            { backgroundColor: cat ? `${cat.color}20` : colors.surface },
          ]}
        >
          <Ionicons
            name={(cat?.icon as any) || 'pricetag-outline'}
            size={18}
            color={cat?.color || colors.textSecondary}
          />
        </View>

        <View style={styles.metaCol}>
          <View style={styles.titleRow}>
            <View style={styles.catDropdownPill}>
              <Text style={styles.catName}>{cat?.name || 'Uncategorized'}</Text>
              <Ionicons name="chevron-down" size={10} color={colors.primary} style={{ marginLeft: 3 }} />
            </View>
            <View style={[styles.actBadge, { backgroundColor: actConfig.badgeBg }]}>
              <Text style={[styles.actBadgeText, { color: actConfig.color }]}>
                {actConfig.code}
              </Text>
            </View>
          </View>
          <Text style={styles.notesText} numberOfLines={1}>
            {item.notes || 'No description'}
          </Text>
          <View style={styles.subMetaRow}>
            <Text style={styles.dateText}>{formatDatePretty(item.date)}</Text>
            <Text style={styles.accountDot}>•</Text>
            <Text style={styles.accountText} numberOfLines={1}>{item.sourceAccount || 'Cash'}</Text>
            {item.rawSms ? (
              <View style={[styles.autoBadge, { backgroundColor: `${colors.primary}20`, borderColor: `${colors.primary}40` }]}>
                <Ionicons name="document-text" size={8} color={colors.primary} style={{ marginRight: 2 }} />
                <Text style={[styles.autoBadgeText, { color: colors.primary }]}>SMS AUDIT</Text>
              </View>
            ) : item.detectedUpiApp ? (
              <View style={[styles.autoBadge, { backgroundColor: `${colors.financing}20`, borderColor: `${colors.financing}40` }]}>
                <Ionicons name="flash" size={8} color={colors.financing} style={{ marginRight: 2 }} />
                <Text style={[styles.autoBadgeText, { color: colors.financing }]}>{item.detectedUpiApp}</Text>
              </View>
            ) : item.entryMode === 'AUTOMATED' ? (
              <View style={styles.autoBadge}>
                <Ionicons name="flash" size={8} color={colors.primary} style={{ marginRight: 2 }} />
                <Text style={styles.autoBadgeText}>AUTO</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      <View style={styles.rightCol}>
        <Text
          style={[
            styles.amountText,
            { color: isIncome ? colors.inflow : colors.textPrimary },
          ]}
        >
          {formatCurrency(item.amount, currency, true)}
        </Text>

        {!isSelectMode && (
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => onDeleteSingle(item)}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={15} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
});

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  categoriesMap,
  onDeleteTransaction,
  onDeleteTransactions,
  onClearAll,
  onAddNew,
  periodLabel,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const { currency, categories, updateTransaction } = useTransactions();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isSelectMode, setIsSelectMode] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Detail Sheet state
  const [selectedTxForDetail, setSelectedTxForDetail] = useState<Transaction | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState<boolean>(false);

  // Memoized search filtering
  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return transactions;
    const query = searchTerm.toLowerCase();
    return transactions.filter((tx) => {
      const cat = categoriesMap.get(tx.categoryId);
      const catName = cat ? cat.name.toLowerCase() : '';
      const notes = (tx.notes || '').toLowerCase();
      const source = (tx.sourceAccount || '').toLowerCase();
      const mode = (tx.entryMode || '').toLowerCase();
      const raw = (tx.rawSms || '').toLowerCase();
      return (
        catName.includes(query) ||
        notes.includes(query) ||
        tx.date.includes(query) ||
        source.includes(query) ||
        mode.includes(query) ||
        raw.includes(query)
      );
    });
  }, [transactions, categoriesMap, searchTerm]);

  const toggleSelectTx = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const startSelectMode = useCallback((id: string) => {
    setIsSelectMode(true);
    setSelectedIds(new Set([id]));
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((t) => t.id)));
    }
  }, [selectedIds.size, filtered]);

  const exitSelectMode = useCallback(() => {
    setIsSelectMode(false);
    setSelectedIds(new Set());
  }, []);

  const handleOpenDetail = useCallback((item: Transaction) => {
    setSelectedTxForDetail(item);
    setDetailModalVisible(true);
  }, []);

  const handleUpdateCategory = useCallback(
    async (txId: string, newCategoryId: string) => {
      const tx = transactions.find((t) => t.id === txId);
      if (!tx) return;

      const newCat = categoriesMap.get(newCategoryId);
      const updatedTx: Transaction = {
        ...tx,
        categoryId: newCategoryId,
        activity: newCat?.activity || tx.activity,
      };

      await updateTransaction(updatedTx);
      setSelectedTxForDetail(updatedTx);
    },
    [transactions, categoriesMap, updateTransaction]
  );

  const confirmDeleteSingle = useCallback(
    (tx: Transaction) => {
      const cat = categoriesMap.get(tx.categoryId);
      const name = cat?.name || 'this transaction';
      const msg = `Are you sure you want to delete ${name} (${formatCurrency(tx.amount, currency)})?`;

      if (Platform.OS === 'web') {
        if (confirm(msg)) {
          onDeleteTransaction(tx.id);
        }
      } else {
        Alert.alert('Delete Transaction', msg, [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => onDeleteTransaction(tx.id),
          },
        ]);
      }
    },
    [categoriesMap, currency, onDeleteTransaction]
  );

  const confirmDeleteSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    const msg = `Are you sure you want to delete ${count} selected transaction${count > 1 ? 's' : ''}? This cannot be undone.`;

    const executeDelete = async () => {
      if (onDeleteTransactions) {
        await onDeleteTransactions(Array.from(selectedIds));
      } else {
        for (const id of Array.from(selectedIds)) {
          await onDeleteTransaction(id);
        }
      }
      exitSelectMode();
    };

    if (Platform.OS === 'web') {
      if (confirm(msg)) {
        executeDelete();
      }
    } else {
      Alert.alert('Delete Selected', msg, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: `Delete (${count})`,
          style: 'destructive',
          onPress: executeDelete,
        },
      ]);
    }
  }, [selectedIds, onDeleteTransactions, onDeleteTransaction, exitSelectMode]);

  const confirmClearAll = useCallback(() => {
    if (transactions.length === 0) return;
    const msg = `Are you sure you want to clear all ${transactions.length} transactions from the ledger? All records will be reset to zero.`;

    const executeClear = async () => {
      if (onClearAll) {
        await onClearAll();
      } else if (onDeleteTransactions) {
        await onDeleteTransactions(transactions.map((t) => t.id));
      }
      exitSelectMode();
    };

    if (Platform.OS === 'web') {
      if (confirm(msg)) {
        executeClear();
      }
    } else {
      Alert.alert('Clear Entire Ledger', msg, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: executeClear,
        },
      ]);
    }
  }, [transactions, onClearAll, onDeleteTransactions, exitSelectMode]);

  const renderItem = useCallback(
    ({ item }: { item: Transaction }) => {
      const cat = categoriesMap.get(item.categoryId);
      const isSelected = selectedIds.has(item.id);

      return (
        <TransactionRow
          item={item}
          cat={cat}
          currency={currency}
          isSelected={isSelected}
          isSelectMode={isSelectMode}
          onToggleSelect={toggleSelectTx}
          onStartSelectMode={startSelectMode}
          onDeleteSingle={confirmDeleteSingle}
          onPressItem={handleOpenDetail}
        />
      );
    },
    [
      categoriesMap,
      selectedIds,
      currency,
      isSelectMode,
      toggleSelectTx,
      startSelectMode,
      confirmDeleteSingle,
      handleOpenDetail,
    ]
  );

  return (
    <View style={styles.container}>
      {/* Search & Actions Header */}
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search notes, category, date, or SMS..."
            placeholderTextColor={colors.placeholder}
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => setSearchTerm('')}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={onAddNew}>
          <Ionicons name="add" size={20} color={colors.primaryText} />
        </TouchableOpacity>
      </View>

      {/* Period Header & Batch Actions Bar */}
      <View style={styles.toolbarRow}>
        <Text style={styles.periodHeader}>
          {filtered.length} entries for <Text style={{ color: colors.primary }}>{periodLabel}</Text>
        </Text>

        <View style={styles.toolbarActions}>
          {isSelectMode ? (
            <>
              <TouchableOpacity
                style={styles.toolBtn}
                onPress={handleSelectAll}
                activeOpacity={0.7}
              >
                <Text style={styles.toolBtnText}>
                  {selectedIds.size === filtered.length && filtered.length > 0 ? 'Deselect' : 'Select All'}
                </Text>
              </TouchableOpacity>

              {selectedIds.size > 0 && (
                <TouchableOpacity
                  style={[styles.toolBtn, styles.toolBtnDanger]}
                  onPress={confirmDeleteSelected}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash" size={13} color="#FFFFFF" style={{ marginRight: 3 }} />
                  <Text style={styles.toolBtnTextDanger}>Delete ({selectedIds.size})</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.toolBtnCancel}
                onPress={exitSelectMode}
                activeOpacity={0.7}
              >
                <Text style={styles.toolBtnTextCancel}>Cancel</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {filtered.length > 0 && (
                <TouchableOpacity
                  style={styles.toolBtn}
                  onPress={() => setIsSelectMode(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="checkmark-circle-outline" size={13} color={colors.textSecondary} style={{ marginRight: 3 }} />
                  <Text style={styles.toolBtnText}>Select</Text>
                </TouchableOpacity>
              )}

              {transactions.length > 0 && (
                <TouchableOpacity
                  style={styles.toolBtnMuted}
                  onPress={confirmClearAll}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={13} color={colors.outflow} style={{ marginRight: 3 }} />
                  <Text style={styles.toolBtnTextClear}>Clear All</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>

      {/* Transaction List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.listContent,
          filtered.length === 0 && styles.listContentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="receipt-outline" size={32} color={colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>No Transactions Found</Text>
            <Text style={styles.emptySubtitle}>
              {searchTerm
                ? 'No matches for your search query.'
                : `No expenses or income recorded for ${periodLabel}. Tap + to add an entry or sync bank SMS.`}
            </Text>
            <TouchableOpacity style={styles.emptyAddBtn} onPress={onAddNew}>
              <Ionicons name="add" size={16} color={colors.primaryText} style={{ marginRight: 4 }} />
              <Text style={styles.emptyAddBtnText}>Add Transaction</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Transaction Detail & Raw SMS Audit Sheet */}
      <TransactionDetailModal
        visible={detailModalVisible}
        transaction={selectedTxForDetail}
        categories={categories}
        categoriesMap={categoriesMap}
        currency={currency}
        onClose={() => setDetailModalVisible(false)}
        onUpdateCategory={handleUpdateCategory}
        onDelete={confirmDeleteSingle}
      />
    </View>
  );
};

const getStyles = (colors: ThemePalette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: 16,
    },
    searchRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 4,
      marginBottom: 8,
    },
    searchBar: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 12,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    searchInput: {
      flex: 1,
      color: colors.textPrimary,
      fontSize: 13,
      paddingVertical: 10,
    },
    addBtn: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    toolbarRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
      minHeight: 28,
    },
    periodHeader: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    toolbarActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    toolBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    toolBtnText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    toolBtnMuted: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      backgroundColor: `${colors.outflow}15`,
      borderWidth: 1,
      borderColor: `${colors.outflow}30`,
    },
    toolBtnTextClear: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.outflow,
    },
    toolBtnDanger: {
      backgroundColor: colors.outflow,
      borderColor: colors.outflow,
    },
    toolBtnTextDanger: {
      fontSize: 11,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    toolBtnCancel: {
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    toolBtnTextCancel: {
      fontSize: 11,
      color: colors.textMuted,
    },
    listContent: {
      paddingBottom: 60,
    },
    listContentEmpty: {
      flexGrow: 1,
      justifyContent: 'center',
    },
    txRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.card,
      padding: 12,
      borderRadius: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    txRowSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryMuted,
    },
    leftCol: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    checkCol: {
      marginRight: 8,
    },
    iconBox: {
      width: 38,
      height: 38,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    metaCol: {
      flex: 1,
      marginRight: 8,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    catDropdownPill: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    catName: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    actBadge: {
      paddingHorizontal: 5,
      paddingVertical: 1,
      borderRadius: 4,
    },
    actBadgeText: {
      fontSize: 9,
      fontWeight: '700',
    },
    notesText: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 2,
    },
    subMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 3,
      flexWrap: 'wrap',
    },
    dateText: {
      fontSize: 10,
      color: colors.textMuted,
    },
    accountDot: {
      fontSize: 10,
      color: colors.textMuted,
      marginHorizontal: 4,
    },
    accountText: {
      fontSize: 10,
      color: colors.textMuted,
      maxWidth: 90,
    },
    autoBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primaryMuted,
      paddingHorizontal: 5,
      paddingVertical: 1,
      borderRadius: 4,
      marginLeft: 6,
      borderWidth: 1,
      borderColor: `${colors.primary}35`,
    },
    autoBadgeText: {
      fontSize: 8,
      fontWeight: '800',
      color: colors.primary,
    },
    rightCol: {
      alignItems: 'flex-end',
      justifyContent: 'center',
    },
    amountText: {
      fontSize: 14,
      fontWeight: '700',
    },
    deleteBtn: {
      padding: 4,
      marginTop: 4,
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 40,
      paddingHorizontal: 20,
    },
    emptyIconCircle: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    emptyTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 4,
    },
    emptySubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 18,
      marginBottom: 16,
    },
    emptyAddBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 9,
      borderRadius: 10,
    },
    emptyAddBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.primaryText,
    },
  });
