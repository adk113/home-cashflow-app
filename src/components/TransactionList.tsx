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
  onAddNew: () => void;
  periodLabel: string;
}

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  categoriesMap,
  onDeleteTransaction,
  onAddNew,
  periodLabel,
}) => {
  const { currency } = useTransactions();
  const [searchTerm, setSearchTerm] = useState<string>('');

  const filtered = transactions.filter((tx) => {
    const cat = categoriesMap.get(tx.categoryId);
    const catName = cat ? cat.name.toLowerCase() : '';
    const notes = (tx.notes || '').toLowerCase();
    const query = searchTerm.toLowerCase();
    return catName.includes(query) || notes.includes(query) || tx.date.includes(query);
  });

  const confirmDelete = (tx: Transaction) => {
    const cat = categoriesMap.get(tx.categoryId);
    const name = cat?.name || 'this transaction';
    if (Platform.OS === 'web') {
      if (confirm(`Are you sure you want to delete ${name} (${formatCurrency(tx.amount, currency)})?`)) {
        onDeleteTransaction(tx.id);
      }
    } else {
      Alert.alert(
        'Delete Transaction',
        `Are you sure you want to delete ${name} (${formatCurrency(tx.amount, currency)})?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => onDeleteTransaction(tx.id),
          },
        ]
      );
    }
  };

  const renderItem = ({ item }: { item: Transaction }) => {
    const cat = categoriesMap.get(item.categoryId);
    const actConfig = getActivityConfig(item.activity);
    const isIncome = item.type === 'income';

    return (
      <View style={styles.txRow}>
        <View style={styles.leftCol}>
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
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => confirmDelete(item)}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={15} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search Header */}
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

      <Text style={styles.periodHeader}>
        Showing {filtered.length} entries for <Text style={{ color: Colors.primary }}>{periodLabel}</Text>
      </Text>

      {filtered.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={44} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>No transactions found</Text>
          <Text style={styles.emptySubtext}>
            {searchTerm ? 'Try adjusting your search query' : 'Record a new entry to begin tracking.'}
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
          contentContainerStyle={{ paddingBottom: 50 }}
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
  periodHeader: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 10,
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
  leftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
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
