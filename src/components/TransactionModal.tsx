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
import { Category, AccountingActivity, TransactionType, Currency, EntryMode } from '../types/transaction';
import { formatDatePretty, getActivityConfig } from '../utils/formatters';
import { getTodayIso } from '../utils/dateFilters';
import { DatePickerModal } from './DatePickerModal';

const COMMON_ACCOUNTS = [
  { label: '💵 Cash', value: 'Cash' },
  { label: '🏛️ HDFC', value: 'HDFC Bank' },
  { label: '🏛️ SBI', value: 'SBI Bank' },
  { label: '🏛️ ICICI', value: 'ICICI Bank' },
  { label: '📱 UPI', value: 'UPI / GPay' },
];

interface TransactionModalProps {
  visible: boolean;
  initialType?: TransactionType;
  initialAmount?: number;
  initialCategoryId?: string;
  initialActivity?: AccountingActivity;
  initialSourceAccount?: string;
  initialDate?: string;
  initialNotes?: string;
  initialEntryMode?: EntryMode;
  categories: Category[];
  currency?: Currency;
  onClose: () => void;
  onSave: (data: {
    amount: number;
    type: TransactionType;
    activity: AccountingActivity;
    categoryId: string;
    date: string;
    notes?: string;
    entryMode?: EntryMode;
    sourceAccount?: string;
  }) => Promise<void>;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  visible,
  initialType = 'expense',
  initialAmount,
  initialCategoryId,
  initialActivity,
  initialSourceAccount = 'Cash',
  initialDate,
  initialNotes,
  initialEntryMode = 'MANUAL',
  categories,
  currency,
  onClose,
  onSave,
}) => {
  const [type, setType] = useState<TransactionType>(initialType);
  const [amountStr, setAmountStr] = useState<string>(initialAmount ? String(initialAmount) : '');
  const [selectedCatId, setSelectedCatId] = useState<string>(initialCategoryId || '');
  const [activity, setActivity] = useState<AccountingActivity>(initialActivity || 'operating');
  const [sourceAccount, setSourceAccount] = useState<string>(initialSourceAccount || 'Cash');
  const [entryMode, setEntryMode] = useState<EntryMode>(initialEntryMode || 'MANUAL');
  const [dateStr, setDateStr] = useState<string>(initialDate || getTodayIso());
  const [calendarVisible, setCalendarVisible] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>(initialNotes || '');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Filter categories by chosen transaction type
  const matchingCategories = categories.filter((c) => c.type === type);

  useEffect(() => {
    if (visible) {
      setType(initialType);
      setAmountStr(initialAmount ? String(initialAmount) : '');
      setDateStr(initialDate || getTodayIso());
      setNotes(initialNotes || '');
      setSourceAccount(initialSourceAccount || 'Cash');
      setEntryMode(initialEntryMode || 'MANUAL');

      if (initialCategoryId) {
        setSelectedCatId(initialCategoryId);
        if (initialActivity) {
          setActivity(initialActivity);
        }
      } else if (matchingCategories.length > 0) {
        setSelectedCatId(matchingCategories[0].id);
        setActivity(matchingCategories[0].activity);
      }
    }
  }, [
    visible,
    initialType,
    initialAmount,
    initialCategoryId,
    initialActivity,
    initialSourceAccount,
    initialDate,
    initialNotes,
    initialEntryMode,
  ]);

  useEffect(() => {
    // If current selected category doesn't match new type, pick the first matching
    if (!matchingCategories.some((c) => c.id === selectedCatId) && matchingCategories.length > 0) {
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
        entryMode,
        sourceAccount: sourceAccount.trim() || 'Cash',
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
            <View>
              <Text style={styles.sheetTitle}>
                {entryMode === 'AUTOMATED' ? 'Review Automated SMS' : 'New Transaction'}
              </Text>
              {entryMode === 'AUTOMATED' && (
                <Text style={styles.sheetSubtitle}>Verified via background bank SMS</Text>
              )}
            </View>
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
              <Text style={styles.dollarSymbol}>{currency?.symbol || '$'}</Text>
              <TextInput
                style={styles.amountInput}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor={Colors.textMuted}
                value={amountStr}
                onChangeText={setAmountStr}
                autoFocus={!initialAmount}
              />
            </View>

            {/* Payment Source / Account Selection */}
            <Text style={styles.sectionLabel}>Source Account / Method</Text>
            <View style={styles.chipsRow}>
              {COMMON_ACCOUNTS.map((acc) => {
                const isSelected = sourceAccount.toLowerCase() === acc.value.toLowerCase();
                return (
                  <TouchableOpacity
                    key={acc.value}
                    style={[styles.accountChip, isSelected && styles.accountChipSelected]}
                    onPress={() => setSourceAccount(acc.value)}
                  >
                    <Text style={[styles.accountChipText, isSelected && styles.accountChipTextSelected]}>
                      {acc.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TextInput
              style={styles.accountCustomInput}
              placeholder="Or type custom account (e.g. HDFC A/c XX4521, UPI ID)"
              placeholderTextColor={Colors.textMuted}
              value={sourceAccount}
              onChangeText={setSourceAccount}
            />

            {/* Accounting Activity Classification Badge */}
            <View style={styles.activityCard}>
              <View style={styles.activityCardHeader}>
                <Text style={styles.activityCardLabel}>Cash Flow Pillar:</Text>
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

            {/* Date Picker Button with Calendar Popup */}
            <Text style={styles.sectionLabel}>Date</Text>
            <View style={styles.dateRow}>
              <TouchableOpacity
                style={styles.datePickerBtn}
                onPress={() => setCalendarVisible(true)}
                activeOpacity={0.75}
              >
                <View style={styles.dateIconCircle}>
                  <Ionicons name="calendar" size={16} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.datePickerText}>{formatDatePretty(dateStr)}</Text>
                  <Text style={styles.dateSubtext}>{dateStr}</Text>
                </View>
                <View style={styles.dateChangeBadge}>
                  <Text style={styles.dateChangeText}>Calendar</Text>
                  <Ionicons name="chevron-down" size={12} color={Colors.primary} style={{ marginLeft: 3 }} />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.todayBtn}
                onPress={() => setDateStr(getTodayIso())}
                activeOpacity={0.75}
              >
                <Text style={styles.todayBtnText}>Today</Text>
              </TouchableOpacity>
            </View>

            <DatePickerModal
              visible={calendarVisible}
              selectedDate={dateStr}
              onSelectDate={(newDate) => setDateStr(newDate)}
              onClose={() => setCalendarVisible(false)}
            />

            {/* Notes / Description */}
            <Text style={styles.sectionLabel}>Notes / Vendor (Optional)</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="e.g. Swiggy, Salary payroll, Metro card refill..."
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
                {isSubmitting
                  ? 'Recording...'
                  : entryMode === 'AUTOMATED'
                  ? `Approve & Record ${type === 'income' ? 'Income' : 'Expense'}`
                  : `Record Manual ${type === 'income' ? 'Income' : 'Expense'}`}
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  sheetSubtitle: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  scrollContent: {
    padding: 20,
  },
  typeToggleRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  typeBtnActiveExpense: {
    backgroundColor: Colors.outflow,
    borderColor: Colors.outflow,
  },
  typeBtnActiveIncome: {
    backgroundColor: Colors.inflow,
    borderColor: Colors.inflow,
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
    paddingVertical: 10,
    marginBottom: 16,
  },
  dollarSymbol: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.textMuted,
    marginRight: 6,
  },
  amountInput: {
    fontSize: 42,
    fontWeight: '800',
    color: Colors.textPrimary,
    minWidth: 140,
    textAlign: 'center',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  accountChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  accountChipSelected: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  accountChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  accountChipTextSelected: {
    color: Colors.primary,
    fontWeight: '700',
  },
  accountCustomInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: Colors.textPrimary,
    fontSize: 13,
    marginBottom: 16,
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
  datePickerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dateIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  datePickerText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  dateSubtext: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  dateChangeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  dateChangeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
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
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#0B0F19',
    fontSize: 15,
    fontWeight: '700',
  },
});
