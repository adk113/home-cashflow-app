import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Currency, PendingSmsTransaction } from '../types/transaction';
import { formatCurrency, formatDatePretty } from '../utils/formatters';
import { useTransactions } from '../context/TransactionContext';

interface SmsApprovalQueueProps {
  queue: PendingSmsTransaction[];
  currency: Currency;
  onApprove: (id: string) => Promise<void>;
  onDismiss: (id: string) => Promise<void>;
  onEdit: (sms: PendingSmsTransaction) => void;
}

const SAMPLE_BANK_SMS = [
  {
    sender: 'VM-HDFCBK',
    title: 'HDFC Bank - Swiggy ₹485.00',
    body: 'Dear Customer, your A/c XX4521 is debited for Rs 485.00 on 14-Oct-26 by VPA swiggy@icici. Avl Bal: Rs 42,350.00 - HDFC Bank',
  },
  {
    sender: 'AD-SBIINB',
    title: 'SBI - Salary Credited ₹65,000',
    body: 'Your A/C ending with 9812 has been CREDITED with INR 65,000.00 on 14-OCT-26 by Payroll Salary Deposit. Avl Bal INR 1,12,450.00 - State Bank of India',
  },
  {
    sender: 'VK-ICICIB',
    title: 'ICICI - Uber Ride ₹340.50',
    body: 'ICICI Bank Card XX1089 was spent for INR 340.50 at UBER RIDES MUMBAI on 14-Oct-26. Available limit: Rs 1,45,000.',
  },
];

export const SmsApprovalQueue: React.FC<SmsApprovalQueueProps> = ({
  queue,
  currency,
  onApprove,
  onDismiss,
  onEdit,
}) => {
  const { simulateIncomingSms } = useTransactions();
  const [testModalVisible, setTestModalVisible] = useState<boolean>(false);
  const [customSender, setCustomSender] = useState<string>('VM-HDFCBK');
  const [customBody, setCustomBody] = useState<string>('');
  const [parseError, setParseError] = useState<string>('');

  const handleSimulate = async (sender: string, body: string) => {
    setParseError('');
    const res = await simulateIncomingSms(sender, body);
    if (!res) {
      setParseError('Could not detect bank, amount, or action. Please check SMS format.');
      return;
    }
    setCustomBody('');
    setTestModalVisible(false);
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

  if (queue.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyHeaderRow}>
          <View style={styles.emptyHeaderLeft}>
            <View style={styles.iconCircle}>
              <Ionicons name="chatbox-ellipses-outline" size={16} color={Colors.primary} />
            </View>
            <View>
              <Text style={styles.emptyTitle}>SMS Auto-Sync Ready</Text>
              <Text style={styles.emptySubtext}>Banking messages are scanned offline for your review.</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.testBtn}
            onPress={() => setTestModalVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="flash-outline" size={13} color={Colors.primary} style={{ marginRight: 4 }} />
            <Text style={styles.testBtnText}>Test SMS</Text>
          </TouchableOpacity>
        </View>

        {/* Modal for Testing / Pasting SMS */}
        {renderTestModal()}
      </View>
    );
  }

  function renderTestModal() {
    return (
      <Modal visible={testModalVisible} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="phone-portrait-outline" size={18} color={Colors.primary} style={{ marginRight: 6 }} />
                <Text style={styles.modalTitle}>Simulate Incoming Bank SMS</Text>
              </View>
              <TouchableOpacity onPress={() => setTestModalVisible(false)}>
                <Ionicons name="close" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalSubtitle}>
                Select a sample bank SMS or paste a real message to test the background parser:
              </Text>

              {/* Presets */}
              <Text style={styles.presetHeading}>Quick Samples:</Text>
              {SAMPLE_BANK_SMS.map((sample, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.sampleCard}
                  onPress={() => handleSimulate(sample.sender, sample.body)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.sampleTitle}>{sample.title}</Text>
                  <Text style={styles.sampleBody} numberOfLines={2}>
                    {sample.body}
                  </Text>
                </TouchableOpacity>
              ))}

              <Text style={[styles.presetHeading, { marginTop: 14 }]}>Or Paste Raw SMS Text:</Text>
              <TextInput
                style={styles.senderInput}
                placeholder="Sender ID (e.g. HDFCBK)"
                placeholderTextColor={Colors.textMuted}
                value={customSender}
                onChangeText={setCustomSender}
              />
              <TextInput
                style={styles.bodyInput}
                placeholder="Paste SMS body: 'Rs 750 debited from A/c XX1234 on...'"
                placeholderTextColor={Colors.textMuted}
                value={customBody}
                onChangeText={setCustomBody}
                multiline={true}
                numberOfLines={3}
              />

              {parseError ? <Text style={styles.errorText}>{parseError}</Text> : null}

              <TouchableOpacity
                style={[styles.parseSubmitBtn, !customBody.trim() && { opacity: 0.5 }]}
                disabled={!customBody.trim()}
                onPress={() => handleSimulate(customSender, customBody)}
              >
                <Text style={styles.parseSubmitText}>Scan & Add to Queue</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  }

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

        <TouchableOpacity
          style={styles.testBtn}
          onPress={() => setTestModalVisible(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="add-circle-outline" size={13} color={Colors.primary} style={{ marginRight: 3 }} />
          <Text style={styles.testBtnText}>Simulate</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.queueSubtext}>
        Verified banking alerts waiting for your 1-tap review before recording:
      </Text>

      {/* Queue Items */}
      {queue.map((item) => {
        const isIncome = item.type === 'income';

        return (
          <View key={item.id} style={styles.pendingCard}>
            <View style={styles.cardTopRow}>
              <View style={styles.bankTag}>
                <Ionicons name="card-outline" size={13} color={Colors.primary} style={{ marginRight: 4 }} />
                <Text style={styles.bankTagText} numberOfLines={1}>
                  {item.sourceAccount}
                </Text>
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
              <Text style={styles.modeLabel}>Automated via SMS</Text>
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

      {renderTestModal()}
    </View>
  );
};

const styles = StyleSheet.create({
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
    alignItems: 'center',
    marginBottom: 6,
  },
  bankTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    maxWidth: '65%',
  },
  bankTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
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
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  dateLabel: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  modeLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
    paddingTop: 8,
  },
  dismissBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  dismissBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
    marginLeft: 2,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.cardBorder,
  },
  editBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  approveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.primary,
  },
  approveBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0B0F19',
  },

  // Empty banner
  emptyContainer: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  emptyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emptyHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  emptySubtext: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 12,
    lineHeight: 18,
  },
  presetHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  sampleCard: {
    backgroundColor: Colors.surface,
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  sampleTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 2,
  },
  sampleBody: {
    fontSize: 11,
    color: Colors.textSecondary,
    lineHeight: 15,
  },
  senderInput: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  bodyInput: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: Colors.textPrimary,
    minHeight: 60,
    textAlignVertical: 'top',
    marginBottom: 10,
  },
  errorText: {
    fontSize: 11,
    color: '#F43F5E',
    marginBottom: 10,
  },
  parseSubmitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  parseSubmitText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0B0F19',
  },
});
