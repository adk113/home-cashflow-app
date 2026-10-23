import React, { useState, useEffect, useMemo } from 'react';
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
import { ThemePalette } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import { Category, AccountingActivity, TransactionType, Currency, EntryMode } from '../types/transaction';
import { formatDatePretty, getActivityConfig } from '../utils/formatters';
import { getTodayIso } from '../utils/dateFilters';
import { DatePickerModal } from './DatePickerModal';

interface CommonAccount {
  label: string;
  value: string;
  suggestedMode: EntryMode;
}

const COMMON_ACCOUNTS: CommonAccount[] = [
  { label: '💵 Cash', value: 'Cash', suggestedMode: 'MANUAL' },
  { label: '🏛️ HDFC', value: 'HDFC Bank', suggestedMode: 'AUTOMATED' },
  { label: '🏛️ SBI', value: 'SBI Bank', suggestedMode: 'AUTOMATED' },
  { label: '🏛️ ICICI', value: 'ICICI Bank', suggestedMode: 'AUTOMATED' },
  { label: '📱 UPI', value: 'UPI / GPay', suggestedMode: 'AUTOMATED' },
  { label: '💳 Card', value: 'Credit Card', suggestedMode: 'AUTOMATED' },
  { label: '🏛️ Axis', value: 'Axis Bank', suggestedMode: 'AUTOMATED' },
];

// In-memory cache to remember user's preferred source account & entry mode across modal openings
let cachedLastSourceAccount: string = 'Cash';
let cachedLastEntryMode: EntryMode = 'MANUAL';

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
  initialSourceAccount,
  initialDate,
  initialNotes,
  initialEntryMode,
  categories,
  currency,
  onClose,
  onSave,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [type, setType] = useState<TransactionType>(initialType);
  const [amountStr, setAmountStr] = useState<string>(initialAmount ? String(initialAmount) : '');
  const [selectedCatId, setSelectedCatId] = useState<string>(initialCategoryId || '');
  const [activity, setActivity] = useState<AccountingActivity>(initialActivity || 'operating');
  const [sourceAccount, setSourceAccount] = useState<string>(initialSourceAccount || cachedLastSourceAccount);
  const [entryMode, setEntryMode] = useState<EntryMode>(initialEntryMode || cachedLastEntryMode);
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

      // Intelligently initialize account and mode
      if (initialSourceAccount !== undefined && initialSourceAccount !== '') {
        setSourceAccount(initialSourceAccount);
      } else if (initialEntryMode === 'AUTOMATED') {
        setSourceAccount(cachedLastSourceAccount !== 'Cash' ? cachedLastSourceAccount : 'HDFC Bank');
      } else {
        setSourceAccount(cachedLastSourceAccount);
      }

      if (initialEntryMode !== undefined) {
        setEntryMode(initialEntryMode);
      } else {
        setEntryMode(cachedLastEntryMode);
      }

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
      const chosenSource = sourceAccount.trim() || (entryMode === 'AUTOMATED' ? 'Bank Account' : 'Cash');

      // Update in-memory cache so subsequent manual entries remember user's choice
      cachedLastSourceAccount = chosenSource;
      cachedLastEntryMode = entryMode;

      await onSave({
        amount: num,
        type,
        activity,
        categoryId: selectedCatId,
        date: dateStr || getTodayIso(),
        notes: notes.trim(),
        entryMode,
        sourceAccount: chosenSource,
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
                {initialNotes?.includes('SMS') || (initialEntryMode === 'AUTOMATED' && initialAmount)
                  ? 'Review Automated SMS'
                  : entryMode === 'AUTOMATED'
                  ? 'Bank / Electronic Entry'
                  : 'Manual Transaction'}
              </Text>
              <Text style={styles.sheetSubtitle}>
                {entryMode === 'AUTOMATED'
                  ? (initialNotes?.includes('SMS')
                      ? 'Verified via background bank SMS'
                      : 'Manual bank/UPI entry (SMS missed or direct)')
                  : 'Offline cash or hand ledger entry'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
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
                  color={type === 'expense' ? '#FFF' : colors.textSecondary}
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
                  color={type === 'income' ? '#FFFFFF' : colors.textSecondary}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.typeBtnText, type === 'income' && styles.typeBtnTextActiveIncome]}>
                  Income (Inflow)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Amount Field */}
            <View style={styles.amountFieldWrap}>
              <Text style={styles.dollarSymbol}>{currency?.symbol || '₹'}</Text>
              <TextInput
                style={styles.amountInput}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor={colors.placeholder}
                value={amountStr}
                onChangeText={setAmountStr}
                autoFocus={!initialAmount}
              />
            </View>

            {/* Entry Mode / Capture Method Selector */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionLabel}>Entry Mode</Text>
              <View style={[styles.modeIndicatorBadge, entryMode === 'AUTOMATED' ? styles.badgeAuto : styles.badgeManual]}>
                <Ionicons
                  name={entryMode === 'AUTOMATED' ? 'flash' : 'create'}
                  size={10}
                  color={entryMode === 'AUTOMATED' ? colors.primary : colors.textSecondary}
                  style={{ marginRight: 3 }}
                />
                <Text style={[styles.modeIndicatorText, entryMode === 'AUTOMATED' ? styles.textAuto : styles.textManual]}>
                  {entryMode === 'AUTOMATED' ? 'Bank / Online' : 'Manual / Cash'}
                </Text>
              </View>
            </View>

            <View style={styles.modeTabsRow}>
              <TouchableOpacity
                style={[
                  styles.modeTab,
                  entryMode === 'MANUAL' && styles.modeTabActiveManual,
                ]}
                onPress={() => {
                  setEntryMode('MANUAL');
                  if (sourceAccount !== 'Cash' && !sourceAccount.includes('Bank') && !sourceAccount.includes('UPI')) {
                    // keep custom
                  } else {
                    setSourceAccount('Cash');
                  }
                }}
                activeOpacity={0.8}
              >
                <View style={[styles.modeTabIconBox, entryMode === 'MANUAL' && styles.modeTabIconBoxActiveManual]}>
                  <Ionicons
                    name="wallet-outline"
                    size={16}
                    color={entryMode === 'MANUAL' ? colors.primary : colors.textSecondary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modeTabTitle, entryMode === 'MANUAL' && styles.modeTabTitleActive]}>
                    Manual / Cash
                  </Text>
                  <Text style={styles.modeTabSubtitle} numberOfLines={1}>
                    Cash, wallet & hand ledger
                  </Text>
                </View>
                {entryMode === 'MANUAL' && (
                  <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modeTab,
                  entryMode === 'AUTOMATED' && styles.modeTabActiveAuto,
                ]}
                onPress={() => {
                  setEntryMode('AUTOMATED');
                  if (sourceAccount.toLowerCase() === 'cash') {
                    setSourceAccount('HDFC Bank');
                  }
                }}
                activeOpacity={0.8}
              >
                <View style={[styles.modeTabIconBox, entryMode === 'AUTOMATED' && styles.modeTabIconBoxActiveAuto]}>
                  <Ionicons
                    name="flash"
                    size={15}
                    color={entryMode === 'AUTOMATED' ? colors.primary : colors.textSecondary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modeTabTitle, entryMode === 'AUTOMATED' && styles.modeTabTitleActive]}>
                    Bank / Electronic
                  </Text>
                  <Text style={styles.modeTabSubtitle} numberOfLines={1}>
                    Missed SMS, UPI & NetBanking
                  </Text>
                </View>
                {entryMode === 'AUTOMATED' && (
                  <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                )}
              </TouchableOpacity>
            </View>

            {/* Payment Source / Account Selection */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionLabel}>Source Account / Method</Text>
              <Text style={styles.sectionHint}>
                {entryMode === 'AUTOMATED' ? 'Bank, UPI or Card' : 'Cash or Account'}
              </Text>
            </View>
            <View style={styles.chipsRow}>
              {COMMON_ACCOUNTS.map((acc) => {
                const isSelected = sourceAccount.toLowerCase() === acc.value.toLowerCase();
                return (
                  <TouchableOpacity
                    key={acc.value}
                    style={[styles.accountChip, isSelected && styles.accountChipSelected]}
                    onPress={() => {
                      setSourceAccount(acc.value);
                      if (acc.suggestedMode) {
                        setEntryMode(acc.suggestedMode);
                      }
                    }}
                    activeOpacity={0.75}
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
              placeholder="Or type custom account (e.g. Axis Bank, HDFC XX4521, GPay UPI)"
              placeholderTextColor={colors.placeholder}
              value={sourceAccount}
              onChangeText={(txt) => {
                setSourceAccount(txt);
                if (
                  txt.toLowerCase().includes('bank') ||
                  txt.toLowerCase().includes('a/c') ||
                  txt.toLowerCase().includes('upi') ||
                  txt.toLowerCase().includes('card')
                ) {
                  if (entryMode === 'MANUAL') {
                    setEntryMode('AUTOMATED');
                  }
                }
              }}
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
                        { backgroundColor: isSelected ? cat.color : colors.surface },
                      ]}
                    >
                      <Ionicons
                        name={(cat.icon as any) || 'pricetag-outline'}
                        size={16}
                        color={isSelected ? colors.primaryText : cat.color}
                      />
                    </View>
                    <Text
                      style={[
                        styles.categoryCardName,
                        isSelected && { color: colors.textPrimary, fontWeight: '700' },
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
                  <Ionicons name="calendar" size={16} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.datePickerText}>{formatDatePretty(dateStr)}</Text>
                  <Text style={styles.dateSubtext}>{dateStr}</Text>
                </View>
                <View style={styles.dateChangeBadge}>
                  <Text style={styles.dateChangeText}>Calendar</Text>
                  <Ionicons name="chevron-down" size={12} color={colors.primary} style={{ marginLeft: 3 }} />
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
              placeholderTextColor={colors.placeholder}
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
                  ? `Save Bank ${type === 'income' ? 'Income' : 'Expense'} (Auto)`
                  : `Save Manual ${type === 'income' ? 'Income' : 'Expense'} (Cash)`}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
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
    sheetContainer: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '90%',
      paddingBottom: Platform.OS === 'ios' ? 40 : 20,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    sheetHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
    },
    sheetTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    sheetSubtitle: {
      fontSize: 11,
      color: colors.primary,
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
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    typeBtnActiveExpense: {
      backgroundColor: colors.outflow,
      borderColor: colors.outflow,
    },
    typeBtnActiveIncome: {
      backgroundColor: colors.inflow,
      borderColor: colors.inflow,
    },
    typeBtnText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    typeBtnTextActive: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
    typeBtnTextActiveIncome: {
      color: '#FFFFFF',
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
      color: colors.textMuted,
      marginRight: 6,
    },
    amountInput: {
      fontSize: 42,
      fontWeight: '800',
      color: colors.textPrimary,
      minWidth: 140,
      textAlign: 'center',
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    sectionHint: {
      fontSize: 11,
      color: colors.textMuted,
    },
    modeIndicatorBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 6,
      borderWidth: 1,
    },
    badgeAuto: {
      backgroundColor: colors.primaryMuted,
      borderColor: `${colors.primary}35`,
    },
    badgeManual: {
      backgroundColor: `${colors.textMuted}15`,
      borderColor: `${colors.textMuted}30`,
    },
    modeIndicatorText: {
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.4,
    },
    textAuto: {
      color: colors.primary,
    },
    textManual: {
      color: colors.textSecondary,
    },
    modeTabsRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 16,
    },
    modeTab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      padding: 10,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    modeTabActiveManual: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryMuted,
    },
    modeTabActiveAuto: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryMuted,
    },
    modeTabIconBox: {
      width: 30,
      height: 30,
      borderRadius: 8,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
    },
    modeTabIconBoxActiveManual: {
      backgroundColor: colors.primaryMuted,
    },
    modeTabIconBoxActiveAuto: {
      backgroundColor: colors.primaryMuted,
    },
    modeTabTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    modeTabTitleActive: {
      color: colors.textPrimary,
    },
    modeTabSubtitle: {
      fontSize: 10,
      color: colors.textMuted,
      marginTop: 1,
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
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    accountChipSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryMuted,
    },
    accountChipText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    accountChipTextSelected: {
      color: colors.primary,
      fontWeight: '700',
    },
    accountCustomInput: {
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      color: colors.textPrimary,
      fontSize: 13,
      marginBottom: 16,
    },
    activityCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 12,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    activityCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    activityCardLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textMuted,
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
      color: colors.textSecondary,
      marginTop: 4,
    },
    sectionLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
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
      backgroundColor: colors.surface,
      padding: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
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
      color: colors.textSecondary,
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
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    dateIconCircle: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: colors.primaryMuted,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    datePickerText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    dateSubtext: {
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 1,
    },
    dateChangeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primaryMuted,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    dateChangeText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.primary,
    },
    todayBtn: {
      backgroundColor: colors.primaryMuted,
      paddingHorizontal: 16,
      borderRadius: 10,
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.primary,
    },
    todayBtnText: {
      color: colors.primary,
      fontWeight: '600',
      fontSize: 13,
    },
    notesInput: {
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      color: colors.textPrimary,
      fontSize: 14,
      marginBottom: 20,
    },
    saveBtn: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
    },
    saveBtnText: {
      color: colors.primaryText,
      fontSize: 15,
      fontWeight: '700',
    },
  });
