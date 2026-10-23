import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemePalette } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import { useTransactions } from '../context/TransactionContext';

interface MessageSourceModalProps {
  visible: boolean;
  onClose: () => void;
}

export const MessageSourceModal: React.FC<MessageSourceModalProps> = ({ visible, onClose }) => {
  const { colors, isDark, toggleTheme } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const {
    messageSourceConfig,
    setAutoPostToLedger,
    updateMessageSourceConfig,
    openNotificationSettings,
    requestSmsPermission,
    getCrashLogs,
    clearCrashLogs,
  } = useTransactions();

  const [crashLogs, setCrashLogs] = useState<string>('');
  const [showLogs, setShowLogs] = useState<boolean>(false);

  useEffect(() => {
    if (visible) {
      loadLogs();
    }
  }, [visible]);

  const loadLogs = async () => {
    try {
      const logs = await getCrashLogs();
      setCrashLogs(logs);
    } catch {
      setCrashLogs('Logs unavailable');
    }
  };

  const handleClearLogs = async () => {
    await clearCrashLogs();
    await loadLogs();
  };

  const handleToggleDeduplication = async (val: boolean) => {
    await updateMessageSourceConfig({ autoDeduplicate: val });
  };

  const handleToggleAutoPost = async (val: boolean) => {
    await setAutoPostToLedger(val);
  };

  const handleSetSyncRange = async (days: number) => {
    await updateMessageSourceConfig({ syncWindowDays: days });
  };

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheetCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconCircle}>
                <Ionicons name="git-merge" size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.title}>Smart Merge Engine</Text>
                <Text style={styles.subtitle}>Unified Auto-Detection & Deduplication Center</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Active Engine Card */}
            <View style={styles.heroEngineCard}>
              <View style={styles.engineTopRow}>
                <View style={styles.engineIconBox}>
                  <Ionicons name="shield-checkmark" size={22} color={colors.operating} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.engineTitle}>Auto Detect (Smart Merge)</Text>
                    <View style={styles.activePill}>
                      <Text style={styles.activePillText}>ALWAYS ACTIVE</Text>
                    </View>
                  </View>
                  <Text style={styles.engineSubtitle}>
                    Universal multi-channel engine automatically intercepts and parses financial SMS and app push notifications across all platforms.
                  </Text>
                </View>
              </View>

              {/* Supported Channels Pill Grid */}
              <View style={styles.channelsGrid}>
                {[
                  { name: 'System SMS', icon: 'chatbox-ellipses-outline' },
                  { name: 'Google Messages', icon: 'chatbubbles-outline' },
                  { name: 'Truecaller', icon: 'call-outline' },
                  { name: 'PhonePe', icon: 'flash-outline' },
                  { name: 'GPay / UPI', icon: 'qr-code-outline' },
                  { name: 'CRED Pay', icon: 'card-outline' },
                  { name: 'Bank Alerts', icon: 'business-outline' },
                ].map((ch) => (
                  <View key={ch.name} style={styles.channelChip}>
                    <Ionicons name={ch.icon as any} size={12} color={colors.primary} />
                    <Text style={styles.channelText}>{ch.name}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Smart Detection Guarantees */}
            <Text style={styles.sectionHeading}>INTELLIGENT PARSING GUARANTEES</Text>

            <View style={styles.featureBox}>
              <View style={styles.featureRow}>
                <Ionicons name="git-compare" size={18} color={colors.primary} style={{ marginTop: 2 }} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.featureTitle}>5-Second Universal Deduplication</Text>
                  <Text style={styles.featureDesc}>
                    Identifies duplicate transactions across SMS, push notification, and banking gateways within a 5-second window using composite hashing.
                  </Text>
                </View>
              </View>

              <View style={[styles.featureRow, { marginTop: 12 }]}>
                <Ionicons name="filter-circle" size={18} color={colors.primary} style={{ marginTop: 2 }} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.featureTitle}>Intent & Anti-Spam Filtering</Text>
                  <Text style={styles.featureDesc}>
                    Automatically IGNORES OTPs, scheduled debits, and collect requests. PROCESSES ONLY definitive financial transactions.
                  </Text>
                </View>
              </View>

              <View style={[styles.featureRow, { marginTop: 12 }]}>
                <Ionicons name="archive-outline" size={18} color={colors.financing} style={{ marginTop: 2 }} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.featureTitle}>Safe Uncategorized Bucket</Text>
                  <Text style={styles.featureDesc}>
                    Ambiguous or unfamiliar alerts are placed into the "Uncategorized" ledger bucket rather than failing or dropping data.
                  </Text>
                </View>
              </View>
            </View>

            {/* Settings & Deduplication */}
            <Text style={[styles.sectionHeading, { marginTop: 18 }]}>SYNC & LEDGER CONFIGURATION</Text>

            {/* Theme Toggle Option */}
            <View style={styles.settingRow}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={styles.settingTitle}>Dark Mode Interface</Text>
                <Text style={styles.settingSubtext}>
                  {isDark ? 'Active: Deep midnight theme' : 'Active: Crisp daylight theme'}
                </Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: colors.cardBorder, true: colors.primary }}
                thumbColor={colors.surface}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={styles.settingTitle}>Auto-Post Directly to Ledger</Text>
                <Text style={styles.settingSubtext}>
                  Immediately posts detected bank alerts directly into your Cash Flow ledger with complete unedited raw SMS strings.
                </Text>
              </View>
              <Switch
                value={messageSourceConfig.autoPostToLedger}
                onValueChange={handleToggleAutoPost}
                trackColor={{ false: colors.cardBorder, true: `${colors.operating}60` }}
                thumbColor={messageSourceConfig.autoPostToLedger ? colors.operating : colors.textMuted}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={styles.settingTitle}>Universal Deduplication</Text>
                <Text style={styles.settingSubtext}>
                  Prevents duplicate transactions if both SMS and push notification arrive for the same payment.
                </Text>
              </View>
              <Switch
                value={messageSourceConfig.autoDeduplicate}
                onValueChange={handleToggleDeduplication}
                trackColor={{ false: colors.cardBorder, true: colors.primaryMuted }}
                thumbColor={messageSourceConfig.autoDeduplicate ? colors.primary : colors.textMuted}
              />
            </View>

            {/* Sync Range Selector */}
            <View style={styles.rangeBox}>
              <Text style={styles.settingTitle}>Scan Window Range</Text>
              <Text style={styles.settingSubtext}>Number of historical days to check during manual sync</Text>
              <View style={styles.rangeRow}>
                {[7, 14, 30, 60].map((days) => {
                  const isCurrent = (messageSourceConfig.syncWindowDays || 14) === days;
                  return (
                    <TouchableOpacity
                      key={days}
                      style={[styles.rangePill, isCurrent && styles.rangePillActive]}
                      onPress={() => handleSetSyncRange(days)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.rangePillText, isCurrent && styles.rangePillTextActive]}>
                        {days} Days
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* System Diagnostics & Background Logs */}
            <Text style={[styles.sectionHeading, { marginTop: 18 }]}>BACKGROUND LISTENER AUDIT LOGS</Text>

            <TouchableOpacity
              style={styles.diagToggleBtn}
              onPress={() => setShowLogs(!showLogs)}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="terminal-outline" size={16} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={styles.diagToggleText}>
                  {showLogs ? 'Hide Listener Logs' : 'View Background Listener & Error Logs'}
                </Text>
              </View>
              <Ionicons
                name={showLogs ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={colors.textSecondary}
              />
            </TouchableOpacity>

            {showLogs && (
              <View style={styles.logsContainer}>
                <View style={styles.logsHeader}>
                  <Text style={styles.logsTitle}>Silent Crash & Exception Log</Text>
                  <TouchableOpacity onPress={handleClearLogs} style={styles.clearLogsBtn}>
                    <Text style={styles.clearLogsText}>Clear Logs</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.logsScroll} nestedScrollEnabled={true}>
                  <Text style={styles.logsContent}>
                    {crashLogs || 'No errors logged. All threads operating normally.'}
                  </Text>
                </ScrollView>
              </View>
            )}

            {/* Android Device Permissions */}
            {Platform.OS === 'android' && (
              <View style={styles.permCard}>
                <Text style={styles.permCardTitle}>Android System Permissions</Text>
                <Text style={styles.permCardDesc}>
                  Grant Telephony and Notification Listener permissions to enable live background sync.
                </Text>
                <View style={styles.permBtnRow}>
                  <TouchableOpacity
                    style={styles.permBtn}
                    onPress={requestSmsPermission}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="chatbubble-ellipses-outline" size={14} color={colors.primaryText} style={{ marginRight: 6 }} />
                    <Text style={styles.permBtnText}>Grant SMS Permission</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.permBtn, { backgroundColor: colors.primary }]}
                    onPress={openNotificationSettings}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="notifications-outline" size={14} color={colors.primaryText} style={{ marginRight: 6 }} />
                    <Text style={styles.permBtnText}>Notification Access</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
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
      maxHeight: '92%',
      paddingBottom: Platform.OS === 'ios' ? 34 : 20,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    headerIconCircle: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.primaryMuted,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    title: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    subtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    closeBtn: {
      padding: 6,
      borderRadius: 16,
      backgroundColor: colors.cardMuted,
    },
    scrollContent: {
      padding: 18,
      paddingBottom: 40,
    },
    heroEngineCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: `${colors.operating}40`,
      marginBottom: 16,
    },
    engineTopRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    engineIconBox: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor: `${colors.operating}20`,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    engineTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    activePill: {
      backgroundColor: `${colors.operating}20`,
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: `${colors.operating}40`,
    },
    activePillText: {
      fontSize: 9,
      fontWeight: '800',
      color: colors.operating,
    },
    engineSubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 4,
      lineHeight: 17,
    },
    channelsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 14,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
    },
    channelChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardMuted,
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 8,
      gap: 5,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    channelText: {
      fontSize: 11,
      color: colors.textPrimary,
      fontWeight: '500',
    },
    sectionHeading: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textMuted,
      letterSpacing: 0.8,
      marginBottom: 10,
      marginTop: 8,
    },
    featureBox: {
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    featureRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    featureTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    featureDesc: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 2,
      lineHeight: 16,
    },
    settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.card,
      padding: 14,
      borderRadius: 12,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    settingTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    settingSubtext: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 3,
      lineHeight: 16,
    },
    rangeBox: {
      backgroundColor: colors.card,
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      marginBottom: 10,
    },
    rangeRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 10,
    },
    rangePill: {
      flex: 1,
      paddingVertical: 8,
      backgroundColor: colors.surface,
      borderRadius: 8,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    rangePillActive: {
      backgroundColor: colors.primaryMuted,
      borderColor: colors.primary,
    },
    rangePillText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    rangePillTextActive: {
      color: colors.primary,
    },
    diagToggleBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.card,
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    diagToggleText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    logsContainer: {
      marginTop: 8,
      backgroundColor: colors.cardMuted,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    logsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    logsTitle: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textMuted,
      letterSpacing: 0.5,
    },
    clearLogsBtn: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      backgroundColor: `${colors.outflow}20`,
      borderRadius: 6,
    },
    clearLogsText: {
      fontSize: 10,
      color: colors.outflow,
      fontWeight: '600',
    },
    logsScroll: {
      maxHeight: 160,
    },
    logsContent: {
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      fontSize: 10,
      color: colors.primary,
      lineHeight: 15,
    },
    permCard: {
      marginTop: 16,
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    permCardTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    permCardDesc: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 3,
      marginBottom: 10,
    },
    permBtnRow: {
      flexDirection: 'row',
      gap: 8,
    },
    permBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      paddingVertical: 9,
      borderRadius: 8,
    },
    permBtnText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.primaryText,
    },
  });
