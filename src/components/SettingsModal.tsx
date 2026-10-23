import React, { useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useTransactions } from '../context/TransactionContext';
import { ThemePalette } from '../theme/colors';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  onOpenCurrencyModal: () => void;
  onOpenSmartMergeModal: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  visible,
  onClose,
  onOpenCurrencyModal,
  onOpenSmartMergeModal,
}) => {
  const { colors, isDark, themeMode, toggleTheme, setThemeMode } = useTheme();
  const { currentUser, logout } = useAuth();
  const { currency, clearAllTransactions, filteredTransactions } = useTransactions();

  const styles = useMemo(() => getStyles(colors), [colors]);

  const handleClearAll = () => {
    Alert.alert(
      'Reset Ledger',
      'Are you sure you want to delete all transactions? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            if (clearAllTransactions) {
              await clearAllTransactions();
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheetCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconCircle}>
                <Ionicons name="settings" size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.title}>Settings</Text>
                <Text style={styles.subtitle}>Appearance & Ledger Preferences</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Section: Appearance / Theme Toggle */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>APPEARANCE</Text>

              {/* Theme Selector Cards */}
              <View style={styles.themeCardsRow}>
                {/* Dark Mode Card */}
                <TouchableOpacity
                  style={[
                    styles.themeCard,
                    isDark && styles.themeCardActive,
                  ]}
                  onPress={() => setThemeMode('dark')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.themeCardHeader, { backgroundColor: '#151E2E' }]}>
                    <Ionicons name="moon" size={22} color="#38BDF8" />
                    {isDark && (
                      <View style={styles.activeCheckBadge}>
                        <Ionicons name="checkmark" size={12} color="#0B0F19" />
                      </View>
                    )}
                  </View>
                  <View style={styles.themeCardBody}>
                    <Text style={[styles.themeCardTitle, isDark && { color: colors.primary }]}>
                      Dark Mode
                    </Text>
                    <Text style={styles.themeCardDesc}>
                      Deep midnight palette with low-glare contrast
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Light Mode Card */}
                <TouchableOpacity
                  style={[
                    styles.themeCard,
                    !isDark && styles.themeCardActive,
                  ]}
                  onPress={() => setThemeMode('light')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.themeCardHeader, { backgroundColor: '#F1F5F9' }]}>
                    <Ionicons name="sunny" size={22} color="#F59E0B" />
                    {!isDark && (
                      <View style={styles.activeCheckBadge}>
                        <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                      </View>
                    )}
                  </View>
                  <View style={styles.themeCardBody}>
                    <Text style={[styles.themeCardTitle, !isDark && { color: colors.primary }]}>
                      Light Mode
                    </Text>
                    <Text style={styles.themeCardDesc}>
                      Crisp daylight palette with clear soft borders
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Quick Toggle Switch Row */}
              <View style={styles.settingRow}>
                <View style={styles.settingIconCol}>
                  <Ionicons
                    name={isDark ? 'moon-outline' : 'sunny-outline'}
                    size={20}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.settingTextCol}>
                  <Text style={styles.settingLabel}>Dark Theme Active</Text>
                  <Text style={styles.settingSubtext}>
                    {isDark ? 'Midnight slate mode enabled' : 'Daylight clean mode enabled'}
                  </Text>
                </View>
                <Switch
                  value={isDark}
                  onValueChange={toggleTheme}
                  trackColor={{ false: colors.cardBorder, true: colors.primary }}
                  thumbColor={colors.surface}
                />
              </View>
            </View>

            {/* Section: Accounting Preferences */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>CURRENCY & FORMATTING</Text>

              <TouchableOpacity
                style={styles.settingRow}
                onPress={() => {
                  onClose();
                  onOpenCurrencyModal();
                }}
                activeOpacity={0.7}
              >
                <View style={styles.settingIconCol}>
                  <Ionicons name="cash-outline" size={20} color={colors.operating} />
                </View>
                <View style={styles.settingTextCol}>
                  <Text style={styles.settingLabel}>Default Currency</Text>
                  <Text style={styles.settingSubtext}>
                    {currency.name} ({currency.code} • {currency.symbol})
                  </Text>
                </View>
                <View style={styles.badgeValue}>
                  <Text style={styles.badgeValueText}>{currency.symbol} {currency.code}</Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
                </View>
              </TouchableOpacity>
            </View>

            {/* Section: Smart Merge Auto-Detection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>AUTOMATION & PARSING</Text>

              <TouchableOpacity
                style={styles.settingRow}
                onPress={() => {
                  onClose();
                  onOpenSmartMergeModal();
                }}
                activeOpacity={0.7}
              >
                <View style={styles.settingIconCol}>
                  <Ionicons name="git-merge-outline" size={20} color={colors.primary} />
                </View>
                <View style={styles.settingTextCol}>
                  <Text style={styles.settingLabel}>Smart Merge Engine</Text>
                  <Text style={styles.settingSubtext}>
                    Universal deduplication, SMS & Notification status
                  </Text>
                </View>
                <View style={styles.badgeStatus}>
                  <Text style={styles.badgeStatusText}>ACTIVE</Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
                </View>
              </TouchableOpacity>
            </View>

            {/* Section: Household Profile */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>HOUSEHOLD SESSION</Text>

              <View style={styles.profileCard}>
                <View style={styles.profileAvatarBox}>
                  <Text style={styles.profileAvatarText}>{currentUser?.avatar || '👤'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.profileName}>{currentUser?.name || 'Household Member'}</Text>
                  <Text style={styles.profileMeta}>
                    {filteredTransactions.length} transactions recorded
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.switchUserBtn}
                  onPress={() => {
                    onClose();
                    logout();
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="log-out-outline" size={14} color={colors.outflow} />
                  <Text style={styles.switchUserBtnText}>Switch</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Section: Data Management */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>DATA MANAGEMENT</Text>

              <TouchableOpacity
                style={[styles.settingRow, styles.dangerRow]}
                onPress={handleClearAll}
                activeOpacity={0.7}
              >
                <View style={styles.settingIconCol}>
                  <Ionicons name="trash-outline" size={20} color={colors.outflow} />
                </View>
                <View style={styles.settingTextCol}>
                  <Text style={[styles.settingLabel, { color: colors.outflow }]}>
                    Reset All Transactions
                  </Text>
                  <Text style={styles.settingSubtext}>
                    Clear all entries from local SQLite ledger
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.footerNote}>
              <Text style={styles.footerNoteText}>
                Home CashFlow • Corporate Statement Accounting Engine
              </Text>
              <Text style={styles.footerNoteSubtext}>
                Offline-First • Local SQLite Encrypted Storage
              </Text>
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
      gap: 12,
    },
    headerIconCircle: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: colors.primaryMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    subtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    closeBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.cardMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 40,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textMuted,
      letterSpacing: 0.8,
      marginBottom: 10,
    },
    themeCardsRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 14,
    },
    themeCard: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      overflow: 'hidden',
    },
    themeCardActive: {
      borderColor: colors.primary,
      backgroundColor: colors.card,
    },
    themeCardHeader: {
      height: 52,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    activeCheckBadge: {
      position: 'absolute',
      top: 6,
      right: 6,
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    themeCardBody: {
      padding: 10,
    },
    themeCardTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 2,
    },
    themeCardDesc: {
      fontSize: 11,
      color: colors.textSecondary,
      lineHeight: 14,
    },
    settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      marginBottom: 8,
    },
    dangerRow: {
      borderColor: `${colors.outflow}35`,
    },
    settingIconCol: {
      marginRight: 12,
    },
    settingTextCol: {
      flex: 1,
    },
    settingLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    settingSubtext: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    badgeValue: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.cardMuted,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    badgeValueText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    badgeStatus: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: `${colors.operating}15`,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    badgeStatusText: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.operating,
    },
    profileCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      gap: 12,
    },
    profileAvatarBox: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.cardMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    profileAvatarText: {
      fontSize: 20,
    },
    profileName: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    profileMeta: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    switchUserBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: `${colors.outflow}15`,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: `${colors.outflow}30`,
    },
    switchUserBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.outflow,
    },
    footerNote: {
      alignItems: 'center',
      marginTop: 10,
      marginBottom: 10,
    },
    footerNoteText: {
      fontSize: 11,
      color: colors.textMuted,
      fontWeight: '500',
    },
    footerNoteSubtext: {
      fontSize: 10,
      color: colors.textMuted,
      marginTop: 2,
    },
  });
