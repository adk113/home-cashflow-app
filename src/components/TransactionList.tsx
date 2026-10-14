import React, { useState } from 'react';
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
import { Colors } from '../theme/colors';
import { Transaction, Category } from '../types/transaction';
import { formatCurrency, formatDatePretty, getActivityConfig } from '../utils/formatters';
import { useTransactions } from '../context/TransactionContext';

interface TransactionListProps {
  transactions: Transaction[];
  categoriesMap: Map<string, Category>;
  onDeleteTransaction: (id: string) => Promise<void>;
  onDeleteTransactions?: (ids: string[]) => Promise<void>;
  onClearAll?: () => Promise<void>;
  onAddNew: () => void;
  periodLabel: string;
}

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  categoriesMap,
  onDeleteTransaction,
  onDeleteTransactions,
  onClearAll,
  onAddNew,
  periodLabel,
}) => {
  const { currency } = useTransactions();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isSelectMode, setIsSelectMode] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filtered = transactions.filter((tx) => {
    const cat = categoriesMap.get(tx.categoryId);
    const catName = cat ? cat.name.toLowerCase() : '';
    const notes = (tx.notes || '').toLowerCase();
    const query = searchTerm.toLowerCase();
    return catName.includes(query) || notes.includes(query) || tx.date.includes(query);
  });

  const toggleSelectTx = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((t) => t.id)));
    }
  };

  const exitSelectMode = () => {
    setIsSelectMode(false);
    setSelectedIds(new Set());
  };

  const confirmDeleteSingle = (tx: Transaction) => {
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
  };

  const confirmDeleteSelected = () => {
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
  };

  const confirmClearAll = () => {
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
  };

  const renderItem = ({ item }: { item: Transaction }) => {
    const cat = categoriesMap.get(item.categoryId);
    const actConfig = getActivityConfig(item.activity);
    const isIncome = item.type === 'income';
    const isSelected = selectedIds.has(item.id);

    return (
      <TouchableOpacity
        style={[
          styles.txRow,
          isSelected && styles.txRowSelected,
        ]}
        activeOpacity={0.75}
        onPress={() => {
          if (isSelectMode) {
            toggleSelectTx(item.id);
          }
        }}
        onLongPress={() => {
          if (!isSelectMode) {
            setIsSelectMode(true);
            setSelectedIds(new Set([item.id]));
          }
        }}
      >
        <View style={styles.leftCol}>
          {isSelectMode && (
            <TouchableOpacity
              style={styles.checkCol}
              onPress={() => toggleSelectTx(item.id)}
            >
              <Ionicons
                name={isSelected ? 'checkbox' : 'square-outline'}
                size={22}
                color={isSelected ? Colors.primary : Colors.textMuted}
              />
            </TouchableOpacity>
          )}

          <View
            style={[
              styles.iconBox,
              { backgroundColor: cat ? `${cat.color}20` : Colors.surface },
            ]}
          >
            <Ionicons
              name={(cat?.icon as any) || 'pricetag-outline'}
              size={18}
              color={cat?.color || Colors.textSecondary}
            />
          </View>

          <View style={styles.metaCol}>
            <View style={styles.titleRow}>
              <Text style={styles.catName}>{cat?.name || 'Uncategorized'}</Text>
              <View style={[styles.actBadge, { backgroundColor: actConfig.badgeBg }]}>
                <Text style={[styles.actBadgeText, { color: actConfig.color }]}>
                  {actConfig.code}
                </Text>
              </View>
            </View>
            <Text style={styles.notesText} numberOfLines={1}>
              {item.notes || 'No description'}
            </Text>
            <Text style={styles.dateText}>{formatDatePretty(item.date)}</Text>
          </View>
        </View>

        <View style={styles.rightCol}>
          <Text
            style={[
              styles.amountText,
              { color: isIncome ? Colors.inflow : Colors.textPrimary },
            ]}
          >
            {formatCurrency(item.amount, currency, true)}
          </Text>

          {!isSelectMode && (
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => confirmDeleteSingle(item)}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={15} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search & Actions Header */}
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={16} color={Colors.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search notes, category, or date..."
            placeholderTextColor={Colors.textMuted}
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => setSearchTerm('')}>
              <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={onAddNew}>
          <Ionicons name="add" size={20} color="#0B0F19" />
        </TouchableOpacity>
      </View>

      {/* Period Header & Batch Actions Bar */}
      <View style={styles.toolbarRow}>
        <Text style={styles.periodHeader}>
          {filtered.length} entries for <Text style={{ color: Colors.primary }}>{periodLabel}</Text>
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
                <Text style={styles.toolBtnTextCancel}>Done</Text>
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
                  <Ionicons name="checkbox-outline" size={13} color={Colors.textSecondary} style={{ marginRight: 4 }} />
                  <Text style={styles.toolBtnText}>Select</Text>
                </TouchableOpacity>
              )}

              {transactions.length > 0 && (
                <TouchableOpacity
                  style={styles.toolBtnMuted}
                  onPress={confirmClearAll}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={13} color="#F43F5E" style={{ marginRight: 3 }} />
                  <Text style={styles.toolBtnTextClear}>Clear All</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>

      {/* Transactions List */}
      {filtered.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={44} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>No transactions found</Text>
          <Text style={styles.emptySubtext}>
            {searchTerm ? 'Try adjusting your search query' : 'Your ledger is completely clean. Record an entry to begin.'}
          </Text>
          <TouchableOpacity style={styles.emptyAddBtn} onPress={onAddNew}>
            <Text style={styles.emptyAddBtnText}>Add First Transaction</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
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
    backgroundColor: Colors.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  searchInput: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 13,
    paddingVertical: 10,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primary,
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
    color: Colors.textSecondary,
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
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  toolBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  toolBtnMuted: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.25)',
  },
  toolBtnTextClear: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F43F5E',
  },
  toolBtnDanger: {
    backgroundColor: '#E11D48',
    borderColor: '#E11D48',
  },
  toolBtnTextDanger: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  toolBtnCancel: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: Colors.cardBorder,
  },
  toolBtnTextCancel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  txRowSelected: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
  },
  leftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkCol: {
    marginRight: 8,
    padding: 2,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  metaCol: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  catName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  actBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  actBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  notesText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  dateText: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  rightCol: {
    alignItems: 'flex-end',
    marginLeft: 10,
  },
  amountText: {
    fontSize: 15,
    fontWeight: '700',
  },
  deleteBtn: {
    marginTop: 6,
    padding: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 30,
  },
  emptyAddBtn: {
    marginTop: 18,
    backgroundColor: Colors.primaryMuted,
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  emptyAddBtnText: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 13,
  },
});
