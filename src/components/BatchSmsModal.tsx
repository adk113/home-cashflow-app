import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemePalette } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import { SMART_MERGE_SAMPLE_FEEDS } from '../services/smsSyncService';
import { useTransactions } from '../context/TransactionContext';

interface BatchSmsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const BatchSmsModal: React.FC<BatchSmsModalProps> = ({ visible, onClose }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const { batchImportSms, simulateIncomingSms } = useTransactions();
  const [pastedText, setPastedText] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('');

  const handleSimulateSingle = async (sender: string, body: string) => {
    setStatusMessage('');
    const res = await simulateIncomingSms(sender, body);
    if (res) {
      setStatusMessage(`✅ Ingested: ₹${res.amount} from ${res.sourceAccount} (Auto-Merged)`);
    } else {
      setStatusMessage('⚠️ Message filtered (predictive/auth alert or non-financial).');
    }
  };

  const handleImportPasted = async () => {
    if (!pastedText.trim()) return;
    setStatusMessage('');
    const count = await batchImportSms(pastedText);
    if (count > 0) {
      setStatusMessage(`🎉 Smart Merge successfully processed ${count} transaction(s)!`);
      setPastedText('');
    } else {
      setStatusMessage('ℹ️ No new transactions found or duplicate alert(s) prevented.');
    }
  };

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheetCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconCircle}>
                <Ionicons name="scan-outline" size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.title}>Smart Merge Test & Ingestion</Text>
                <Text style={styles.subtitle}>Test real-world SMS alerts across all UPIs & Banks</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Status Message */}
            {statusMessage ? (
              <View style={styles.statusBox}>
                <Text style={styles.statusText}>{statusMessage}</Text>
              </View>
            ) : null}

            {/* Presets for Testing */}
            <Text style={styles.sectionHeading}>1-TAP TEST PRESETS (CROSS-PLATFORM):</Text>

            {SMART_MERGE_SAMPLE_FEEDS.map((sample, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.sampleItem}
                onPress={() => handleSimulateSingle(sample.sender, sample.body)}
                activeOpacity={0.75}
              >
                <View style={styles.sampleTopRow}>
                  <Text style={styles.sampleSender}>{sample.sender}</Text>
                  <View style={styles.tapPill}>
                    <Ionicons name="add" size={12} color={colors.primary} />
                    <Text style={styles.tapPillText}>Test Ingest</Text>
                  </View>
                </View>
                <Text style={styles.sampleBody}>{sample.body}</Text>
                <Text style={styles.sampleNote}>💡 {sample.note}</Text>
              </TouchableOpacity>
            ))}

            {/* Paste Multiple Messages */}
            <Text style={[styles.sectionHeading, { marginTop: 16 }]}>PASTE RAW SMS ALERT STRING:</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Paste raw SMS copied from Google Messages, Truecaller, PhonePe, CRED, or Bank alert..."
              placeholderTextColor={colors.placeholder}
              multiline={true}
              numberOfLines={4}
              value={pastedText}
              onChangeText={setPastedText}
            />

            <TouchableOpacity
              style={[styles.importBtn, !pastedText.trim() && { opacity: 0.5 }]}
              onPress={handleImportPasted}
              disabled={!pastedText.trim()}
              activeOpacity={0.75}
            >
              <Ionicons name="flash" size={16} color={colors.primaryText} style={{ marginRight: 6 }} />
              <Text style={styles.importBtnText}>Parse with Smart Merge</Text>
            </TouchableOpacity>
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
      paddingBottom: 24,
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
    },
    statusBox: {
      backgroundColor: colors.card,
      padding: 12,
      borderRadius: 10,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    statusText: {
      fontSize: 12,
      color: colors.textPrimary,
      fontWeight: '500',
    },
    sectionHeading: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textMuted,
      letterSpacing: 0.8,
      marginBottom: 10,
    },
    sampleItem: {
      backgroundColor: colors.card,
      padding: 12,
      borderRadius: 12,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    sampleTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    sampleSender: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.primary,
    },
    tapPill: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primaryMuted,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    tapPillText: {
      fontSize: 10,
      color: colors.primary,
      fontWeight: '700',
      marginLeft: 3,
    },
    sampleBody: {
      fontSize: 11,
      color: colors.textSecondary,
      lineHeight: 16,
      marginBottom: 4,
    },
    sampleNote: {
      fontSize: 10,
      color: colors.textMuted,
      fontStyle: 'italic',
    },
    textInput: {
      backgroundColor: colors.inputBg,
      borderRadius: 12,
      padding: 12,
      color: colors.textPrimary,
      fontSize: 12,
      minHeight: 80,
      textAlignVertical: 'top',
      borderWidth: 1,
      borderColor: colors.inputBorder,
      marginBottom: 12,
    },
    importBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      paddingVertical: 12,
      borderRadius: 12,
    },
    importBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.primaryText,
    },
  });
