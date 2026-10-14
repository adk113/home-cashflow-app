import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { formatDatePretty } from '../utils/formatters';

interface DatePickerModalProps {
  visible: boolean;
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (dateStr: string) => void;
  onClose: () => void;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// Helper to format date parts to YYYY-MM-DD
function formatIso(year: number, monthIndex: number, day: number): string {
  const m = String(monthIndex + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

// Helper to get today's YYYY-MM-DD
function getTodayIso(): string {
  const now = new Date();
  return formatIso(now.getFullYear(), now.getMonth(), now.getDate());
}

// Helper to get yesterday's YYYY-MM-DD
function getYesterdayIso(): string {
  const now = new Date();
  now.setDate(now.getDate() - 1);
  return formatIso(now.getFullYear(), now.getMonth(), now.getDate());
}

export const DatePickerModal: React.FC<DatePickerModalProps> = ({
  visible,
  selectedDate,
  onSelectDate,
  onClose,
}) => {
  // Parse incoming date or fallback to today
  const initialDate = selectedDate ? new Date(selectedDate + 'T00:00:00') : new Date();
  const validInitial = isNaN(initialDate.getTime()) ? new Date() : initialDate;

  const [viewYear, setViewYear] = useState<number>(validInitial.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(validInitial.getMonth());

  useEffect(() => {
    if (visible && selectedDate) {
      const d = new Date(selectedDate + 'T00:00:00');
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [visible, selectedDate]);

  const todayIso = getTodayIso();
  const yesterdayIso = getYesterdayIso();

  // Navigation handlers
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Calculate days in the active viewing month
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 is Sunday

  // Generate calendar grid slots
  const daysGrid: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    daysGrid.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    daysGrid.push(day);
  }

  const handlePickDay = (day: number) => {
    const iso = formatIso(viewYear, viewMonth, day);
    onSelectDate(iso);
    onClose();
  };

  const handlePickPreset = (presetIso: string) => {
    onSelectDate(presetIso);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.dialogCard} onPress={(e) => e.stopPropagation()}>
          {/* Header with Title & Close */}
          <View style={styles.header}>
            <View style={styles.headerTitleWrap}>
              <Ionicons name="calendar" size={18} color={Colors.primary} style={{ marginRight: 8 }} />
              <Text style={styles.headerTitle}>Select Date</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Quick Presets (Today, Yesterday) */}
          <View style={styles.presetRow}>
            <TouchableOpacity
              style={[styles.presetBtn, selectedDate === todayIso && styles.presetBtnActive]}
              onPress={() => handlePickPreset(todayIso)}
            >
              <Text
                style={[
                  styles.presetBtnText,
                  selectedDate === todayIso && styles.presetBtnTextActive,
                ]}
              >
                Today
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.presetBtn, selectedDate === yesterdayIso && styles.presetBtnActive]}
              onPress={() => handlePickPreset(yesterdayIso)}
            >
              <Text
                style={[
                  styles.presetBtnText,
                  selectedDate === yesterdayIso && styles.presetBtnTextActive,
                ]}
              >
                Yesterday
              </Text>
            </TouchableOpacity>
          </View>

          {/* Month / Year Navigator */}
          <View style={styles.monthNavRow}>
            <TouchableOpacity onPress={handlePrevMonth} style={styles.navArrowBtn}>
              <Ionicons name="chevron-back" size={20} color={Colors.textPrimary} />
            </TouchableOpacity>

            <Text style={styles.monthLabel}>
              {MONTH_NAMES[viewMonth]} {viewYear}
            </Text>

            <TouchableOpacity onPress={handleNextMonth} style={styles.navArrowBtn}>
              <Ionicons name="chevron-forward" size={20} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Weekday Labels */}
          <View style={styles.weekdayRow}>
            {WEEKDAYS.map((wd) => (
              <Text key={wd} style={styles.weekdayText}>
                {wd}
              </Text>
            ))}
          </View>

          {/* Calendar Day Grid */}
          <View style={styles.gridContainer}>
            {daysGrid.map((day, idx) => {
              if (day === null) {
                return <View key={`empty-${idx}`} style={styles.dayCell} />;
              }

              const cellIso = formatIso(viewYear, viewMonth, day);
              const isSelected = cellIso === selectedDate;
              const isToday = cellIso === todayIso;

              return (
                <TouchableOpacity
                  key={`day-${day}`}
                  style={[
                    styles.dayCell,
                    isSelected && styles.dayCellSelected,
                    isToday && !isSelected && styles.dayCellToday,
                  ]}
                  onPress={() => handlePickDay(day)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dayText,
                      isSelected && styles.dayTextSelected,
                      isToday && !isSelected && styles.dayTextToday,
                    ]}
                  >
                    {day}
                  </Text>
                  {isToday && !isSelected && <View style={styles.todayDot} />}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Selected Date Summary & Done */}
          <View style={styles.footerRow}>
            <View>
              <Text style={styles.footerDateLabel}>Selected:</Text>
              <Text style={styles.footerDateVal}>{formatDatePretty(selectedDate)}</Text>
            </View>

            <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
              <Text style={styles.doneBtnText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialogCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    width: '100%',
    maxWidth: 360,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  closeBtn: {
    padding: 4,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  presetBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    alignItems: 'center',
  },
  presetBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
  },
  presetBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  presetBtnTextActive: {
    color: Colors.primary,
  },
  monthNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
  },
  monthLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  navArrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 6,
  },
  weekdayText: {
    width: 38,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginBottom: 14,
  },
  dayCell: {
    width: '14.28%',
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    marginVertical: 2,
    position: 'relative',
  },
  dayCellSelected: {
    backgroundColor: Colors.primary,
  },
  dayCellToday: {
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  dayText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  dayTextSelected: {
    color: '#0B0F19',
    fontWeight: '800',
  },
  dayTextToday: {
    color: Colors.primary,
    fontWeight: '700',
  },
  todayDot: {
    position: 'absolute',
    bottom: 3,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
  },
  footerDateLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  footerDateVal: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 1,
  },
  doneBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 10,
  },
  doneBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0B0F19',
  },
});
