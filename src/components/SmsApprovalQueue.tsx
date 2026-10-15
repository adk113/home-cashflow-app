import React, { useState } from 'react';
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
import { Colors } from '../theme/colors';
import { Currency, MessageSourceApp, PendingSmsTransaction } from '../types/transaction';
import { formatCurrency, formatDatePretty } from '../utils/formatters';
import { useTransactions } from '../context/TransactionContext';
import { AVAILABLE_SOURCES } from '../services/smsSyncService';
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
  const {
    messageSourceConfig,
    syncSmsNow,
    isSyncing,
    lastSyncResult,
  } = useTransactions();

  const [sourceModalVisible, setSourceModalVisible] = useState<boolean>(false);
  const [batchModalVisible, setBatchModalVisible] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string>('');

  const currentSourceDef =
    AVAILABLE_SOURCES.find((s) => s.id === messageSourceConfig.selectedSource) ||
    AVAILABLE_SOURCES[0];

  const handleSyncNow = async () => {
    try {
      setSyncFeedback('');
      const result = await syncSmsNow();
      if (result.addedCount > 0) {
        setSyncFeedback(`Added ${result.addedCount} new transaction(s) to queue!`);
      } else if (result.duplicatesPrevented > 0) {
        setSyncFeedback(`Up to date. ${result.duplicatesPrevented} duplicate alert(s) prevented.`);
      } else {
        setSyncFeedback('Inbox up to date. No new unreviewed bank alerts found.');
      }
    } catch {
      setSyncFeedback('Sync check completed.');
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

  const getSourceBadgeInfo = (sourceApp?: MessageSourceApp) => {
    switch (sourceApp) {
      case 'google_messages':
        return { label: 'Google Messages (RCS)', color: '#3B82F6', icon: 'chatbubbles-outline' };
      case 'truecaller':
        return { label: 'Truecaller', color: '#06B6D4', icon: 'shield-checkmark-outline' };
      case 'carrier_sms':
        return { label: 'Carrier SMS', color: '#8B5CF6', icon: 'phone-portrait-outline' };
      case 'bank_apps':
        return { label: 'Direct Bank App', color: '#F59E0B', icon: 'card-outline' };
      default:
        return { label: 'Auto Verified', color: Colors.primary, icon: 'checkmark-circle-outline' };
    }
  };

  // EMPTY QUEUE STATE - Comprehensive Message Sync Center
  if (queue.length === 0) {
    return (
      <View style={styles.syncCenterContainer}>
        {/* Sync Center Header */}
        <View style={styles.syncCenterTopRow}>
          <View style={styles.syncCenterHeaderLeft}>
            <View style={[styles.sourceIconBox, { backgroundColor: `${currentSourceDef.accentColor}20` }]}>
              <Ionicons
                name={currentSourceDef.icon as any}
                size={18}
                color={currentSourceDef.accentColor}
              />
            </View>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.syncCenterTitle}>SMS & Alert Sync Center</Text>
                <View style={[styles.sourcePill, { backgroundColor: `${currentSourceDef.accentColor}20` }]}>
                  <Text style={[styles.sourcePillText, { color: currentSourceDef.accentColor }]}>
                    {currentSourceDef.badge}
                  </Text>
                </View>
              </View>
              <Text style={styles.syncCenterSubtext}>
                True Source: <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>{currentSourceDef.title}</Text>
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.changeSourceBtn}
            onPress={() => setSourceModalVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="options-outline" size={13} color={Colors.primary} style={{ marginRight: 3 }} />
            <Text style={styles.changeSourceBtnText}>Source</Text>
          </TouchableOpacity>
        </View>

        {/* Feedback message banner if sync ran */}
        {syncFeedback ? (
          <View style={styles.feedbackBanner}>
            <Ionicons name="information-circle" size={15} color={Colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.feedbackText}>{syncFeedback}</Text>
          </View>
        ) : null}

        {/* Sync Actions Bar */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.syncNowBtn, isSyncing && { opacity: 0.7 }]}
            onPress={handleSyncNow}
            disabled={isSyncing}
            activeOpacity={0.75}
          >
            {isSyncing ? (
              <ActivityIndicator size="small" color="#0B0F19" style={{ marginRight: 6 }} />
            ) : (
              <Ionicons name="sync" size={15} color="#0B0F19" style={{ marginRight: 6 }} />
            )}
            <Text style={styles.syncNowBtnText}>{isSyncing ? 'Scanning Inbox...' : 'Sync Messages Now'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.testImportBtn}
            onPress={() => setBatchModalVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="scan-outline" size={14} color={Colors.textSecondary} style={{ marginRight: 4 }} />
            <Text style={styles.testImportBtnText}>Paste / Test</Text>
          </TouchableOpacity>
        </View>

        {/* Explanatory Footnote */}
        <View style={styles.footerNoteRow}>
          <Ionicons name="shield-checkmark" size={12} color={Colors.textMuted} style={{ marginRight: 4 }} />
          <Text style={styles.footerNoteText}>
            Deduplication: {messageSourceConfig.autoDeduplicate ? 'ON (Zero Double Entries)' : 'OFF'} • Offline local SQLite
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
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Ionicons name="sync" size={13} color={Colors.primary} style={{ marginRight: 3 }} />
            )}
            <Text style={styles.smallSyncText}>{isSyncing ? 'Syncing...' : 'Sync'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.sourcePillBtn}
            onPress={() => setSourceModalVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={currentSourceDef.icon as any}
              size={12}
              color={currentSourceDef.accentColor}
              style={{ marginRight: 3 }}
            />
            <Text style={[styles.sourcePillBtnText, { color: currentSourceDef.accentColor }]}>
              {currentSourceDef.title.split(' ')[0]}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.testBtn}
            onPress={() => setBatchModalVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle-outline" size={13} color={Colors.primary} style={{ marginRight: 3 }} />
            <Text style={styles.testBtnText}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      {syncFeedback ? (
        <View style={[styles.feedbackBanner, { marginBottom: 10 }]}>
          <Ionicons name="information-circle" size={14} color={Colors.primary} style={{ marginRight: 5 }} />
          <Text style={styles.feedbackText}>{syncFeedback}</Text>
        </View>
      ) : null}

      <Text style={styles.queueSubtext}>
        Verified bank alerts from <Text style={{ color: currentSourceDef.accentColor, fontWeight: '600' }}>{currentSourceDef.title}</Text> waiting for your 1-tap ledger approval:
      </Text>

      {/* Queue Items */}
      {queue.map((item) => {
        const isIncome = item.type === 'income';
        const srcBadge = getSourceBadgeInfo(item.sourceApp);

        return (
          <View key={item.id} style={styles.pendingCard}>
            <View style={styles.cardTopRow}>
              <View style={styles.accountAndSourceCol}>
                <View style={styles.bankTag}>
                  <Ionicons name="card-outline" size={13} color={Colors.primary} style={{ marginRight: 4 }} />
                  <Text style={styles.bankTagText} numberOfLines={1}>
                    {item.sourceAccount}
                  </Text>
                </View>

                {/* Source attribution pill */}
                <View style={[styles.itemSourcePill, { backgroundColor: `${srcBadge.color}15` }]}>
                  <Ionicons name={srcBadge.icon as any} size={11} color={srcBadge.color} style={{ marginRight: 3 }} />
                  <Text style={[styles.itemSourcePillText, { color: srcBadge.color }]}>{srcBadge.label}</Text>
                </View>
              </View>

              <Text style={[styles.amountText, { color: isIncome ? Colors.inflow : Colors.outflow }]}>
                {isIncome ? '+' : '-'}{formatCurrency(item.amount, currency, true)}
              </Text>
            </View>

            {/* Snippet */}
            <Text style={styles.smsBodyText} numberOfLines={2}>
              "{item.body}"
            </Text>

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
                <Ionicons name="close" size={15} color={Colors.textMuted} />
                <Text style={styles.dismissBtnText}>Dismiss</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => onEdit(item)}
                activeOpacity={0.7}
              >
                <Ionicons name="pencil-outline" size={14} color={Colors.textPrimary} style={{ marginRight: 4 }} />
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.approveBtn}
                onPress={() => onApprove(item.id)}
                activeOpacity={0.75}
              >
                <Ionicons name="checkmark-circle" size={15} color="#0B0F19" style={{ marginRight: 4 }} />
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

const styles = StyleSheet.create({
  syncCenterContainer: {
    backgroundColor: '#0F1626',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
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
    color: '#FFFFFF',
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
    color: Colors.textSecondary,
    marginTop: 2,
  },
  changeSourceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  changeSourceBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
  },
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  feedbackText: {
    fontSize: 11,
    color: '#D1FAE5',
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  syncNowBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
  },
  syncNowBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0B0F19',
  },
  testImportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  testImportBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  footerNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  footerNoteText: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  container: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(56, 189, 248, 0.35)',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  queueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F59E0B',
  },
  queueTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  queueBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  queueBadgeText: {
    color: '#0B0F19',
    fontSize: 11,
    fontWeight: '800',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  smallSyncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
  },
  smallSyncText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
  },
  sourcePillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sourcePillBtnText: {
    fontSize: 10,
    fontWeight: '700',
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  testBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  queueSubtext: {
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 10,
  },
  pendingCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  accountAndSourceCol: {
    flex: 1,
    marginRight: 8,
  },
  bankTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  bankTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
  },
  itemSourcePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  itemSourcePillText: {
    fontSize: 9,
    fontWeight: '700',
  },
  amountText: {
    fontSize: 16,
    fontWeight: '800',
  },
  smsBodyText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 16,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingTop: 6,
  },
  dateLabel: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  modeLabel: {
    fontSize: 10,
    color: Colors.primary,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  dismissBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  dismissBtnText: {
    fontSize: 12,
    color: Colors.textMuted,
    marginLeft: 3,
    fontWeight: '600',
  },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#334155',
    paddingVertical: 6,
    borderRadius: 8,
  },
  editBtnText: {
    fontSize: 12,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  approveBtn: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 6,
    borderRadius: 8,
  },
  approveBtnText: {
    fontSize: 12,
    color: '#0B0F19',
    fontWeight: '700',
  },
});
