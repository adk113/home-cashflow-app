import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Category, AccountingActivity, TransactionType } from '../types/transaction';
import { getActivityConfig } from '../utils/formatters';
import { getTodayIso } from '../utils/dateFilters';

interface TransactionModalProps {
  visible: boolean;
  initialType?: TransactionType;
  categories: Category[];
  onClose: () => void;
  onSave: (data: {
    amount: number;
    type: TransactionType;
    activity: AccountingActivity;
    categoryId: string;
    date: string;
    notes?: string;
  }) => Promise<void>;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  visible,
  initialType = 'expense',
  categories,
  onClose,
  onSave,
}) => {
  const [type, setType] = useState<TransactionType>(initialType);
  const [amountStr, setAmountStr] = useState<string>('');
  const [selectedCatId, setSelectedCatId] = useState<string>('');
  const [activity, setActivity] = useState<AccountingActivity>('operating');
  const [dateStr, setDateStr] = useState<string>(getTodayIso());
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Filter categories by chosen transaction type
  const matchingCategories = categories.filter((c) => c.type === type);

  useEffect(() => {
    setType(initialType);
    setAmountStr('');
    setDateStr(getTodayIso());
    setNotes('');
  }, [visible, initialType]);

  useEffect(() => {
    // Select first category by default when matching list updates
    if (matchingCategories.length > 0) {
      const first = matchingCategories[0];
      setSelectedCatId(first.id);
      setActivity(first.activity);
    }
  }, [type]);

  const handleSelectCategory = (cat: Category) => {
    setSelectedCatId(cat.id);
    setActivity(cat.activity);
  };

  const handleSubmit = async () => {
    const num = parseFloat(amountStr);
    if (isNaN(num) || num <= 0) {
      if (Platform.OS === 'web') {
        alert('Please enter a valid transaction amount.');
      } else {
        Alert.alert('Invalid Amount', 'Please enter a valid transaction amount greater than 0.');
      }
      return;
    }

    if (!selectedCatId) {
      if (Platform.OS === 'web') {
        alert('Please select a category.');
      } else {
        Alert.alert('Missing Category', 'Please select a category for this transaction.');
      }
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave({
        amount: num,
        type,
        activity,
        categoryId: selectedCatId,
        date: dateStr || getTodayIso(),
        notes: notes.trim(),
      });
      onClose();
    } catch (err) {
      console.error('Failed to save transaction:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const actConfig = getActivityConfig(activity);

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>New Transaction</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Flow Type Toggle (Inflow vs Outflow) */}
            <View style={styles.typeToggleRow}>
              <TouchableOpacity
                style={[styles.typeBtn, type === 'expense' && styles.typeBtnActiveExpense]}
                onPress={() => setType('expense')}
              >
                <Ionicons
                  name="arrow-up"
                  size={16}
                  color={type === 'expense' ? '#FFF' : Colors.textSecondary}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.typeBtnText, type === 'expense' && styles.typeBtnTextActive]}>
                  Expense (Outflow)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.typeBtn, type === 'income' && styles.typeBtnActiveIncome]}
                onPress={() => setType('income')}
              >
                <Ionicons
                  name="arrow-down"
                  size={16}
                  color={type === 'income' ? '#0B0F19' : Colors.textSecondary}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.typeBtnText, type === 'income' && styles.typeBtnTextActiveIncome]}>
                  Income (Inflow)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Amount Field */}
            <View style={styles.amountFieldWrap}>
              <Text style={styles.dollarSymbol}>$</Text>
              <TextInput
                style={styles.amountInput}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor={Colors.textMuted}
                value={amountStr}
                onChangeText={setAmountStr}
                autoFocus={true}
              />
            </View>

            {/* Accounting Activity Classification Badge */}
            <View style={styles.activityCard}>
              <View style={styles.activityCardHeader}>
                <Text style={styles.activityCardLabel}>Cash Flow Classification:</Text>
                <View style={[styles.actPill, { backgroundColor: actConfig.badgeBg }]}>
                  <Text style={[styles.actPillCode, { color: actConfig.color }]}>
                    {actConfig.code} • {actConfig.label}
                  </Text>
                </View>
              </View>
              <Text style={styles.activityCardDesc}>{actConfig.description}</Text>
            </View>

            {/* Category Selector Grid */}
            <Text style={styles.sectionLabel}>Select Category</Text>
            <View style={styles.categoriesGrid}>
              {matchingCategories.map((cat) => {
                const isSelected = cat.id === selectedCatId;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryCard,
                      isSelected && { borderColor: cat.color, backgroundColor: `${cat.color}15` },
                    ]}
                    onPress={() => handleSelectCategory(cat)}
                  >
                    <View
                      style={[
                        styles.catIconCircle,
                        { backgroundColor: isSelected ? cat.color : Colors.surface },
                      ]}
                    >
                      <Ionicons
                        name={(cat.icon as any) || 'pricetag-outline'}
                        size={16}
                        color={isSelected ? '#0B0F19' : cat.color}
                      />
                    </View>
                    <Text
                      style={[
                        styles.categoryCardName,
                        isSelected && { color: Colors.textPrimary, fontWeight: '700' },
                      ]}
                      numberOfLines={1}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Date Input */}
            <Text style={styles.sectionLabel}>Date (YYYY-MM-DD)</Text>
            <View style={styles.dateRow}>
              <TextInput
                style={styles.dateInput}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={Colors.textMuted}
                value={dateStr}
                onChangeText={setDateStr}
              />
              <TouchableOpacity
                style={styles.todayBtn}
                onPress={() => setDateStr(getTodayIso())}
              >
                <Text style={styles.todayBtnText}>Today</Text>
              </TouchableOpacity>
            </View>

            {/* Notes / Description */}
            <Text style={styles.sectionLabel}>Notes / Vendor (Optional)</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="e.g. Grocery restock, HVAC maintenance..."
              placeholderTextColor={Colors.textMuted}
              value={notes}
              onChangeText={setNotes}
            />

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveBtn, isSubmitting && { opacity: 0.7 }]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              <Text style={styles.saveBtnText}>
                {isSubmitting ? 'Recording...' : `Record ${type === 'income' ? 'Income' : 'Expense'}`}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingHorizontal: 20,
    maxHeight: '90%',
    borderTopWidth: 1,
    borderColor: Colors.cardBorder,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  typeToggleRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  typeBtnActiveExpense: {
    backgroundColor: Colors.outflow,
  },
  typeBtnActiveIncome: {
    backgroundColor: Colors.inflow,
  },
  typeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  typeBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  typeBtnTextActiveIncome: {
    color: '#0B0F19',
    fontWeight: '700',
  },
  amountFieldWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingVertical: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  dollarSymbol: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginRight: 6,
  },
  amountInput: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.textPrimary,
    minWidth: 120,
  },
  activityCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  activityCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activityCardLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  actPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  actPillCode: {
    fontSize: 11,
    fontWeight: '800',
  },
  activityCardDesc: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  categoryCard: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  catIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  categoryCardName: {
    fontSize: 12,
    color: Colors.textSecondary,
    flex: 1,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  dateInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: Colors.textPrimary,
    fontSize: 14,
  },
  todayBtn: {
    backgroundColor: Colors.primaryMuted,
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  todayBtnText: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 13,
  },
  notesInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: Colors.textPrimary,
    fontSize: 14,
    marginBottom: 20,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnText: {
    color: '#0B0F19',
    fontSize: 16,
    fontWeight: '800',
  },
});
