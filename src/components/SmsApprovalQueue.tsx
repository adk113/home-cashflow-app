import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemePalette } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import { Currency, MessageSourceApp, PendingSmsTransaction } from '../types/transaction';
import { formatCurrency, formatDatePretty } from '../utils/formatters';
import { useTransactions } from '../context/TransactionContext';
import { MessageSourceModal } from './MessageSourceModal';
import { BatchSmsModal } from './BatchSmsModal';

interface SmsApprovalQueueProps {
  queue: PendingSmsTransaction[];
  currency: Currency;
  onApprove: (id: string) => Promise<void>;
  onDismiss: (id: string) => Promise<void>;
  onEdit: (sms: PendingSmsTransaction) => void;
}

export const SmsApprovalQueue: React.FC<SmsApprovalQueueProps> = ({
  queue,
  currency,
  onApprove,
  onDismiss,
  onEdit,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const {
    messageSourceConfig,
    setAutoPostToLedger,
    syncSmsNow,
    isSyncing,
  } = useTransactions();

  const [sourceModalVisible, setSourceModalVisible] = useState<boolean>(false);
  const [batchModalVisible, setBatchModalVisible] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string>('');
  const [expandedSmsIds, setExpandedSmsIds] = useState<Set<string>>(new Set());

  const toggleExpandSms = (id: string) => {
    setExpandedSmsIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSyncNow = async () => {
    try {
      setSyncFeedback('');
      const result = await syncSmsNow();
      if (result.addedCount > 0) {
        if (messageSourceConfig.autoPostToLedger) {
          setSyncFeedback(`✅ Added & posted ${result.addedCount} transaction(s) directly to your ledger!`);
        } else {
          setSyncFeedback(`Added ${result.addedCount} new transaction(s) to approval queue!`);
        }
      } else if (result.duplicatesPrevented > 0) {
        setSyncFeedback(`Up to date. ${result.duplicatesPrevented} duplicate alert(s) prevented.`);
      } else {
        setSyncFeedback(`Inbox scanned (${messageSourceConfig.syncWindowDays || 14} days). No new unrecorded bank alerts found.`);
      }
    } catch (e: any) {
      setSyncFeedback(`Sync note: ${e?.message || 'Completed'}`);
    }
  };

  const confirmDismiss = (sms: PendingSmsTransaction) => {
    const msg = `Dismiss detected transaction of ${formatCurrency(sms.amount, currency)} from ${sms.sourceAccount}?`;
    if (Platform.OS === 'web') {
      if (confirm(msg)) {
        onDismiss(sms.id);
      }
    } else {
      Alert.alert('Dismiss Transaction', msg, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Dismiss', style: 'destructive', onPress: () => onDismiss(sms.id) },
      ]);
    }
  };

  const getSourceBadgeInfo = (sourceApp?: MessageSourceApp, detectedUpiApp?: string) => {
    if (detectedUpiApp) {
      const lower = detectedUpiApp.toLowerCase();
      if (lower.includes('cred')) {
        return { label: 'CRED Pay', color: '#EC4899', icon: 'card-outline' };
      }
      if (lower.includes('phonepe')) {
        return { label: 'PhonePe', color: '#8B5CF6', icon: 'flash-outline' };
      }
      if (lower.includes('gpay') || lower.includes('google')) {
        return { label: 'GPay', color: '#3B82F6', icon: 'logo-google' };
      }
      if (lower.includes('paytm')) {
        return { label: 'Paytm', color: '#00BAF2', icon: 'wallet-outline' };
      }
      if (lower.includes('amazon')) {
        return { label: 'Amazon Pay', color: '#F59E0B', icon: 'cart-outline' };
      }
      return { label: detectedUpiApp, color: '#10B981', icon: 'flash' };
    }

    switch (sourceApp) {
      case 'google_messages':
        return { label: 'Google Messages', color: '#3B82F6', icon: 'chatbubbles' };
      case 'truecaller':
        return { label: 'Truecaller', color: '#0284C7', icon: 'call' };
      case 'carrier_sms':
        return { label: 'Carrier SMS', color: '#6366F1', icon: 'chatbox-ellipses' };
      case 'cred_pay':
        return { label: 'CRED Pay', color: '#EC4899', icon: 'card-outline' };
      case 'upi_apps':
        return { label: 'UPI Sync', color: '#8B5CF6', icon: 'flash' };
      case 'bank_apps':
        return { label: 'Bank App', color: '#10B981', icon: 'business-outline' };
      case 'auto':
      default:
        return { label: 'Smart Merge', color: colors.operating, icon: 'shield-checkmark' };
    }
  };

  // If no pending items in queue, show the Status & Fast Ingest Center
  if (queue.length === 0) {
    return (
      <View style={styles.syncCenterContainer}>
        {/* Top Header Row */}
        <View style={styles.syncCenterTopRow}>
          <View style={styles.syncCenterHeaderLeft}>
            <View style={[styles.sourceIconBox, { backgroundColor: `${colors.operating}20` }]}>
              <Ionicons name="shield-checkmark" size={18} color={colors.operating} />
            </View>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.syncCenterTitle}>Smart Merge Engine</Text>
                <View style={[styles.sourcePill, { backgroundColor: `${colors.operating}25` }]}>
                  <Text style={[styles.sourcePillText, { color: colors.operating }]}>AUTO DETECT</Text>
                </View>
              </View>
              <Text style={styles.syncCenterSubtext}>
                Multi-channel background listener active & monitoring
              </Text>
            </View>
          </View>

          {/* Quick Engine Status & Settings Button */}
          <TouchableOpacity
            style={styles.changeSourceBtn}
            onPress={() => setSourceModalVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="options-outline" size={13} color={colors.textSecondary} style={{ marginRight: 4 }} />
            <Text style={styles.changeSourceBtnText}>Settings</Text>
          </TouchableOpacity>
        </View>

        {/* Sync Feedback Message */}
        {syncFeedback ? (
          <View style={styles.feedbackBanner}>
            <Ionicons name="information-circle" size={15} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.feedbackText}>{syncFeedback}</Text>
          </View>
        ) : null}

        {/* Action Row */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.syncNowBtn, isSyncing && { opacity: 0.6 }]}
            onPress={handleSyncNow}
            disabled={isSyncing}
            activeOpacity={0.8}
          >
            {isSyncing ? (
              <ActivityIndicator size="small" color={colors.primaryText} style={{ marginRight: 6 }} />
            ) : (
              <Ionicons name="refresh-outline" size={15} color={colors.primaryText} style={{ marginRight: 6 }} />
            )}
            <Text style={styles.syncNowBtnText}>
              {isSyncing ? 'Scanning Channels...' : 'Sync Messages Now'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.testImportBtn}
            onPress={() => setBatchModalVisible(true)}
            activeOpacity={0.75}
          >
            <Ionicons name="add" size={15} color={colors.primary} style={{ marginRight: 4 }} />
            <Text style={styles.testImportBtnText}>Test Feed</Text>
          </TouchableOpacity>
        </View>

        {/* Auto-post to ledger toggle shortcut */}
        <TouchableOpacity
          style={[
            styles.autoPostBar,
            messageSourceConfig.autoPostToLedger ? styles.autoPostBarActive : styles.autoPostBarInactive,
          ]}
          onPress={() => setAutoPostToLedger(!messageSourceConfig.autoPostToLedger)}
          activeOpacity={0.75}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons
              name={messageSourceConfig.autoPostToLedger ? 'flash' : 'time-outline'}
              size={13}
              color={messageSourceConfig.autoPostToLedger ? colors.operating : colors.financing}
              style={{ marginRight: 6 }}
            />
            <Text style={styles.autoPostBarText}>
              {messageSourceConfig.autoPostToLedger
                ? 'Auto-Post to Ledger: ON (Direct Instant Updates)'
                : 'Auto-Post to Ledger: OFF (Queue for Review)'}
            </Text>
          </View>
          <Text style={[styles.autoPostToggleBtn, { color: messageSourceConfig.autoPostToLedger ? colors.operating : colors.textMuted }]}>
            {messageSourceConfig.autoPostToLedger ? 'Active' : 'Enable'}
          </Text>
        </TouchableOpacity>

        {/* Explanatory Footnote */}
        <View style={styles.footerNoteRow}>
          <Ionicons name="shield-checkmark" size={12} color={colors.textMuted} style={{ marginRight: 4 }} />
          <Text style={styles.footerNoteText}>
            Universal UPI (CRED, PhonePe, Paytm, GPay, Amazon) • 5s Composite Deduplication
          </Text>
        </View>

        {/* Modals */}
        <MessageSourceModal visible={sourceModalVisible} onClose={() => setSourceModalVisible(false)} />
        <BatchSmsModal visible={batchModalVisible} onClose={() => setBatchModalVisible(false)} />
      </View>
    );
  }

  // ACTIVE QUEUE WITH PENDING SMS APPROVALS
  return (
    <View style={styles.container}>
      {/* Queue Header */}
      <View style={styles.queueHeader}>
        <View style={styles.headerTitleRow}>
          <View style={styles.pulseDot} />
          <Text style={styles.queueTitle}>Pending SMS Approvals</Text>
          <View style={styles.queueBadge}>
            <Text style={styles.queueBadgeText}>{queue.length}</Text>
          </View>
        </View>

        <View style={styles.headerRightActions}>
          <TouchableOpacity
            style={[styles.smallSyncBtn, isSyncing && { opacity: 0.6 }]}
            onPress={handleSyncNow}
            disabled={isSyncing}
            activeOpacity={0.7}
          >
            {isSyncing ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="sync" size={14} color={colors.primary} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.sourcePillBtn}
            onPress={() => setSourceModalVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="git-merge" size={12} color={colors.operating} style={{ marginRight: 3 }} />
            <Text style={[styles.sourcePillBtnText, { color: colors.operating }]}>
              Smart Merge
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.testBtn}
            onPress={() => setBatchModalVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle-outline" size={13} color={colors.primary} style={{ marginRight: 3 }} />
            <Text style={styles.testBtnText}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      {syncFeedback ? (
        <View style={[styles.feedbackBanner, { marginBottom: 10 }]}>
          <Ionicons name="information-circle" size={14} color={colors.primary} style={{ marginRight: 5 }} />
          <Text style={styles.feedbackText}>{syncFeedback}</Text>
        </View>
      ) : null}

      <Text style={styles.queueSubtext}>
        Verified bank alerts intercepted by <Text style={{ color: colors.operating, fontWeight: '600' }}>Smart Merge</Text> awaiting review:
      </Text>

      {/* Queue Items */}
      {queue.map((item) => {
        const isIncome = item.type === 'income';
        const srcBadge = getSourceBadgeInfo(item.sourceApp, item.detectedUpiApp);
        const isExpanded = expandedSmsIds.has(item.id);

        return (
          <View key={item.id} style={styles.pendingCard}>
            <View style={styles.cardTopRow}>
              <View style={styles.accountAndSourceCol}>
                <View style={styles.bankTag}>
                  <Ionicons name="card-outline" size={13} color={colors.primary} style={{ marginRight: 4 }} />
                  <Text style={styles.bankTagText} numberOfLines={1}>
                    {item.sourceAccount}
                  </Text>
                </View>

                {/* Source attribution pill */}
                <View style={[styles.itemSourcePill, { backgroundColor: `${srcBadge.color}15` }]}>
                  <Ionicons name={srcBadge.icon as any} size={11} color={srcBadge.color} style={{ marginRight: 3 }} />
                  <Text style={[styles.itemSourcePillText, { color: srcBadge.color }]}>{srcBadge.label}</Text>
                </View>

                {item.detectedUpiApp ? (
                  <View style={styles.upiCardPill}>
                    <Ionicons name="flash" size={10} color={colors.financing} style={{ marginRight: 3 }} />
                    <Text style={styles.upiCardPillText}>{item.detectedUpiApp}</Text>
                  </View>
                ) : null}
              </View>

              <Text style={[styles.amountText, { color: isIncome ? colors.inflow : colors.outflow }]}>
                {isIncome ? '+' : '-'}{formatCurrency(item.amount, currency, true)}
              </Text>
            </View>

            {/* Snippet */}
            <Text style={styles.smsBodyText} numberOfLines={isExpanded ? undefined : 2}>
              "{item.body}"
            </Text>

            {/* Collapsible View Original SMS Toggle */}
            <TouchableOpacity
              style={styles.expandSmsBtn}
              onPress={() => toggleExpandSms(item.id)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isExpanded ? 'chevron-up-circle-outline' : 'document-text-outline'}
                size={13}
                color={colors.primary}
                style={{ marginRight: 4 }}
              />
              <Text style={styles.expandSmsBtnText}>
                {isExpanded ? 'Hide Raw SMS' : 'View Original SMS'}
              </Text>
            </TouchableOpacity>

            {/* Expanded Raw Audit Monospace Box */}
            {isExpanded && (
              <View style={styles.rawAuditBox}>
                <View style={styles.rawAuditHeader}>
                  <Text style={styles.rawAuditTitle}>ORIGINAL RECEIVED MESSAGE</Text>
                  <Text style={styles.rawAuditSender}>From: {item.sender}</Text>
                </View>
                <Text style={styles.rawAuditContent} selectable={true}>
                  {item.body}
                </Text>
              </View>
            )}

            <View style={styles.metaRow}>
              <Text style={styles.dateLabel}>{formatDatePretty(item.date)}</Text>
              <Text style={styles.modeLabel}>Automated Offline Scan</Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.cardActions}>
              <TouchableOpacity
                style={styles.dismissBtn}
                onPress={() => confirmDismiss(item)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={15} color={colors.textMuted} />
                <Text style={styles.dismissBtnText}>Dismiss</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => onEdit(item)}
                activeOpacity={0.7}
              >
                <Ionicons name="pencil-outline" size={14} color={colors.textPrimary} style={{ marginRight: 4 }} />
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.approveBtn}
                onPress={() => onApprove(item.id)}
                activeOpacity={0.75}
              >
                <Ionicons name="checkmark-circle" size={15} color={colors.primaryText} style={{ marginRight: 4 }} />
                <Text style={styles.approveBtnText}>Approve</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}

      {/* Modals */}
      <MessageSourceModal visible={sourceModalVisible} onClose={() => setSourceModalVisible(false)} />
      <BatchSmsModal visible={batchModalVisible} onClose={() => setBatchModalVisible(false)} />
    </View>
  );
};

const getStyles = (colors: ThemePalette) =>
  StyleSheet.create({
    syncCenterContainer: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 14,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 2,
    },
    syncCenterTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    syncCenterHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    sourceIconBox: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    syncCenterTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    sourcePill: {
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 6,
    },
    sourcePillText: {
      fontSize: 9,
      fontWeight: '800',
    },
    syncCenterSubtext: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 2,
    },
    changeSourceBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    changeSourceBtnText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    feedbackBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primaryMuted,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 8,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: `${colors.primary}35`,
    },
    feedbackText: {
      fontSize: 11,
      color: colors.primary,
      fontWeight: '500',
      flex: 1,
    },
    actionRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 10,
    },
    syncNowBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      paddingVertical: 10,
      borderRadius: 10,
    },
    syncNowBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.primaryText,
    },
    testImportBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    testImportBtnText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    autoPostBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 8,
      borderWidth: 1,
      marginBottom: 8,
    },
    autoPostBarActive: {
      backgroundColor: colors.operatingBg,
      borderColor: `${colors.operating}40`,
    },
    autoPostBarInactive: {
      backgroundColor: colors.financingBg,
      borderColor: `${colors.financing}40`,
    },
    autoPostBarText: {
      fontSize: 11,
      color: colors.textPrimary,
      fontWeight: '500',
    },
    autoPostToggleBtn: {
      fontSize: 11,
      fontWeight: '700',
    },
    footerNoteRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
    footerNoteText: {
      fontSize: 10,
      color: colors.textMuted,
    },
    container: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 14,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    queueHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    headerTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    pulseDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.primary,
      marginRight: 8,
    },
    queueTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
      marginRight: 6,
    },
    queueBadge: {
      backgroundColor: colors.primaryMuted,
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    queueBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.primary,
    },
    headerRightActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    smallSyncBtn: {
      width: 28,
      height: 28,
      borderRadius: 6,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    sourcePillBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    sourcePillBtnText: {
      fontSize: 10,
      fontWeight: '700',
    },
    testBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    testBtnText: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    queueSubtext: {
      fontSize: 11,
      color: colors.textSecondary,
      marginBottom: 10,
    },
    pendingCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    cardTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    accountAndSourceCol: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 6,
      flex: 1,
      marginRight: 8,
    },
    bankTag: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    bankTagText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    itemSourcePill: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
    },
    itemSourcePillText: {
      fontSize: 9,
      fontWeight: '700',
    },
    upiCardPill: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.financingBg,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
    },
    upiCardPillText: {
      fontSize: 9,
      fontWeight: '700',
      color: colors.financing,
    },
    amountText: {
      fontSize: 15,
      fontWeight: '700',
    },
    smsBodyText: {
      fontSize: 11,
      color: colors.textSecondary,
      lineHeight: 16,
      marginBottom: 6,
    },
    expandSmsBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      paddingVertical: 3,
      paddingHorizontal: 6,
      borderRadius: 6,
      backgroundColor: colors.surface,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    expandSmsBtnText: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.primary,
    },
    rawAuditBox: {
      backgroundColor: colors.cardMuted,
      borderRadius: 8,
      padding: 10,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    rawAuditHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    rawAuditTitle: {
      fontSize: 9,
      fontWeight: '800',
      color: colors.textMuted,
      letterSpacing: 0.5,
    },
    rawAuditSender: {
      fontSize: 9,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    rawAuditContent: {
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      fontSize: 11,
      color: colors.primary,
      lineHeight: 16,
    },
    metaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    dateLabel: {
      fontSize: 10,
      color: colors.textMuted,
    },
    modeLabel: {
      fontSize: 10,
      color: colors.textMuted,
    },
    cardActions: {
      flexDirection: 'row',
      gap: 8,
    },
    dismissBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 8,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    dismissBtnText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textMuted,
      marginLeft: 3,
    },
    editBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 8,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    editBtnText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    approveBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 8,
      backgroundColor: colors.primary,
    },
    approveBtnText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.primaryText,
    },
  });
