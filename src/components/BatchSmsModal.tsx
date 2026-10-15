import React, { useState } from 'react';
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
import { Colors } from '../theme/colors';
import { MessageSourceApp } from '../types/transaction';
import { SAMPLE_SOURCE_FEEDS, AVAILABLE_SOURCES } from '../services/smsSyncService';
import { useTransactions } from '../context/TransactionContext';

interface BatchSmsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const BatchSmsModal: React.FC<BatchSmsModalProps> = ({ visible, onClose }) => {
  const { batchImportSms, messageSourceConfig, simulateIncomingSms } = useTransactions();
  const [selectedSource, setSelectedSource] = useState<MessageSourceApp>(messageSourceConfig.selectedSource);
  const [pastedText, setPastedText] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('');

  const currentFeed = SAMPLE_SOURCE_FEEDS[selectedSource] || SAMPLE_SOURCE_FEEDS.auto;

  const handleSimulateSingle = async (sender: string, body: string) => {
    setStatusMessage('');
    const res = await simulateIncomingSms(sender, body);
    if (res) {
      setStatusMessage(`✅ Ingested: ₹${res.amount} from ${res.sourceAccount} (Source: ${res.sourceApp})`);
    } else {
      setStatusMessage('⚠️ Could not parse financial amount or account. Please check format.');
    }
  };

  const handleImportPasted = async () => {
    if (!pastedText.trim()) return;
    setStatusMessage('');
    const count = await batchImportSms(pastedText, selectedSource);
    if (count > 0) {
      setStatusMessage(`🎉 Successfully scanned and enqueued ${count} transaction(s)!`);
      setPastedText('');
    } else {
      setStatusMessage('ℹ️ No new transactions found or all detected items were duplicates.');
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
                <Ionicons name="scan-outline" size={20} color={Colors.primary} />
              </View>
              <View>
                <Text style={styles.title}>SMS & Alert Scanner</Text>
                <Text style={styles.subtitle}>Test or paste messages from any message app</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Source Tabs */}
            <Text style={styles.sectionHeading}>SELECT SOURCE TO TEST:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sourceScroll}>
              {AVAILABLE_SOURCES.map((src) => {
                const isActive = selectedSource === src.id;
                return (
                  <TouchableOpacity
                    key={src.id}
                    style={[
                      styles.sourceTab,
                      isActive && { borderColor: src.accentColor, backgroundColor: '#1E293B' },
                    ]}
                    onPress={() => setSelectedSource(src.id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={src.icon as any}
                      size={14}
                      color={isActive ? src.accentColor : Colors.textMuted}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={[
                        styles.sourceTabText,
                        isActive && { color: '#FFFFFF', fontWeight: '700' },
                      ]}
                    >
                      {src.title}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Presets for Selected Source */}
            <Text style={[styles.sectionHeading, { marginTop: 14 }]}>
              REAL-WORLD SAMPLE FEED ({selectedSource.toUpperCase()}):
            </Text>

            {currentFeed.map((sample, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.sampleItem}
                onPress={() => handleSimulateSingle(sample.sender, sample.body)}
                activeOpacity={0.75}
              >
                <View style={styles.sampleTopRow}>
                  <Text style={styles.sampleSender}>{sample.sender}</Text>
                  <View style={styles.tapPill}>
                    <Ionicons name="add" size={12} color={Colors.primary} />
                    <Text style={styles.tapPillText}>Test Ingest</Text>
                  </View>
                </View>
                <Text style={styles.sampleBody}>{sample.body}</Text>
                <Text style={styles.sampleNote}>💡 {sample.note}</Text>
              </TouchableOpacity>
            ))}

            {/* Paste Multiple Messages */}
            <Text style={[styles.sectionHeading, { marginTop: 16 }]}>OR PASTE RAW SMS TEXT:</Text>
            <TextInput
              style={styles.textInput}
              placeholder={`Paste SMS copied from ${selectedSource.replace('_', ' ')} or multiple bank alerts separated by newlines...`}
              placeholderTextColor={Colors.textMuted}
              multiline={true}
              numberOfLines={4}
              value={pastedText}
              onChangeText={setPastedText}
            />

            {statusMessage ? (
              <View style={styles.statusBox}>
                <Text style={styles.statusText}>{statusMessage}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.importBtn, !pastedText.trim() && { opacity: 0.5 }]}
              disabled={!pastedText.trim()}
              onPress={handleImportPasted}
              activeOpacity={0.8}
            >
              <Ionicons name="flash" size={16} color="#0B0F19" style={{ marginRight: 6 }} />
              <Text style={styles.importBtnText}>Scan & Add to Queue</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.doneBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.doneBtnText}>View Queue</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 8, 16, 0.85)',
    justifyContent: 'flex-end',
  },
  sheetCard: {
    backgroundColor: '#0F1626',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    maxHeight: '90%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 14,
    backgroundColor: '#1E293B',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 24,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    color: Colors.textMuted,
    marginBottom: 8,
  },
  sourceScroll: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  sourceTab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  sourceTabText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  sampleItem: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  sampleTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sampleSender: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  tapPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tapPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
    marginLeft: 2,
  },
  sampleBody: {
    fontSize: 12,
    color: '#E2E8F0',
    lineHeight: 16,
  },
  sampleNote: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 6,
    fontStyle: 'italic',
  },
  textInput: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 13,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  statusBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.25)',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  statusText: {
    fontSize: 12,
    color: '#D1FAE5',
    lineHeight: 16,
  },
  importBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 12,
  },
  importBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0B0F19',
  },
  doneBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 8,
  },
  doneBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
});
