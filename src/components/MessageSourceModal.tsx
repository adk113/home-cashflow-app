import React from 'react';
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
import { Colors } from '../theme/colors';
import { MessageSourceApp } from '../types/transaction';
import { AVAILABLE_SOURCES, SourceDefinition } from '../services/smsSyncService';
import { useTransactions } from '../context/TransactionContext';

interface MessageSourceModalProps {
  visible: boolean;
  onClose: () => void;
}

export const MessageSourceModal: React.FC<MessageSourceModalProps> = ({ visible, onClose }) => {
  const {
    messageSourceConfig,
    setMessageSource,
    setAutoPostToLedger,
    updateMessageSourceConfig,
    openNotificationSettings,
    requestSmsPermission,
  } = useTransactions();

  const handleSelectSource = async (sourceId: MessageSourceApp) => {
    await setMessageSource(sourceId);
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
                <Ionicons name="options-outline" size={20} color={Colors.primary} />
              </View>
              <View>
                <Text style={styles.title}>Message & SMS Sources</Text>
                <Text style={styles.subtitle}>Choose your primary source for bank alerts</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Info Banner */}
            <View style={styles.infoBanner}>
              <Ionicons name="information-circle-outline" size={18} color={Colors.primary} style={{ marginRight: 8 }} />
              <Text style={styles.infoBannerText}>
                Modern banking alerts arrive via Google RCS Chat, Truecaller notifications, or standard cellular SMS.
                Select your true source below to avoid missed alerts or confusion.
              </Text>
            </View>

            {/* Source Selection List */}
            <Text style={styles.sectionHeading}>SELECT TRUE SOURCE:</Text>

            {AVAILABLE_SOURCES.map((src: SourceDefinition) => {
              const isSelected = messageSourceConfig.selectedSource === src.id;

              return (
                <TouchableOpacity
                  key={src.id}
                  style={[
                    styles.sourceCard,
                    isSelected && { borderColor: src.accentColor, backgroundColor: '#131B2E' },
                  ]}
                  onPress={() => handleSelectSource(src.id)}
                  activeOpacity={0.75}
                >
                  <View style={styles.sourceTopRow}>
                    <View style={styles.sourceHeaderLeft}>
                      <View style={[styles.sourceIconBox, { backgroundColor: `${src.accentColor}20` }]}>
                        <Ionicons name={src.icon as any} size={20} color={src.accentColor} />
                      </View>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                          <Text style={[styles.sourceTitle, isSelected && { color: '#FFFFFF' }]}>
                            {src.title}
                          </Text>
                          <View style={[styles.badgePill, { backgroundColor: `${src.accentColor}25` }]}>
                            <Text style={[styles.badgePillText, { color: src.accentColor }]}>{src.badge}</Text>
                          </View>
                        </View>
                        <Text style={styles.sourceSubtitle}>{src.subtitle}</Text>
                      </View>
                    </View>

                    {/* Radio Check Circle */}
                    <View
                      style={[
                        styles.radioCircle,
                        isSelected && { borderColor: src.accentColor, backgroundColor: src.accentColor },
                      ]}
                    >
                      {isSelected && <Ionicons name="checkmark" size={14} color="#0B0F19" />}
                    </View>
                  </View>

                  {/* Why Choose Callout */}
                  <View style={styles.whyBox}>
                    <Text style={styles.whyLabel}>💡 Why: </Text>
                    <Text style={styles.whyText}>{src.whyChoose}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}

            {/* Settings & Deduplication */}
            <Text style={[styles.sectionHeading, { marginTop: 18 }]}>SYNC & DEDUPLICATION SETTINGS:</Text>

            <View style={styles.settingRow}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={styles.settingTitle}>Auto-Post Directly to Ledger</Text>
                <Text style={styles.settingSubtext}>
                  Immediately updates your CashFlow and expense ledger when bank SMS / UPI is detected, without waiting for manual confirmation.
                </Text>
              </View>
              <Switch
                value={messageSourceConfig.autoPostToLedger}
                onValueChange={handleToggleAutoPost}
                trackColor={{ false: '#334155', true: '#10B981' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.settingRow}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={styles.settingTitle}>Cross-App Deduplication</Text>
                <Text style={styles.settingSubtext}>
                  Prevents double counting if Google Messages, Truecaller, or Phone SMS all receive the same transaction.
                </Text>
              </View>
              <Switch
                value={messageSourceConfig.autoDeduplicate}
                onValueChange={handleToggleDeduplication}
                trackColor={{ false: '#334155', true: Colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* Sync Range Selector */}
            <View style={styles.rangeRow}>
              <Text style={styles.settingTitle}>Scan Window:</Text>
              <View style={styles.rangePills}>
                {[1, 7, 30].map((days) => {
                  const isActive = messageSourceConfig.syncWindowDays === days;
                  return (
                    <TouchableOpacity
                      key={days}
                      style={[styles.rangePill, isActive && styles.rangePillActive]}
                      onPress={() => handleSetSyncRange(days)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.rangePillText, isActive && styles.rangePillTextActive]}>
                        {days === 1 ? 'Last 24h' : `${days} Days`}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Android Permissions Guide */}
            {Platform.OS === 'android' && (
              <View style={styles.permissionCard}>
                <View style={styles.permHeader}>
                  <Ionicons name="shield-outline" size={18} color="#F59E0B" style={{ marginRight: 6 }} />
                  <Text style={styles.permTitle}>Android System Permissions</Text>
                </View>
                <Text style={styles.permDescription}>
                  For Google Messages (RCS) and Truecaller, enable Notification Access so Home CashFlow can detect transactions offline without needing invasive cellular SMS permissions.
                </Text>

                <View style={styles.permButtons}>
                  <TouchableOpacity
                    style={styles.permBtn}
                    onPress={openNotificationSettings}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="notifications-outline" size={14} color="#0B0F19" style={{ marginRight: 4 }} />
                    <Text style={styles.permBtnText}>Enable Notification Access</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.permSecondaryBtn}
                    onPress={requestSmsPermission}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="chatbox-outline" size={14} color={Colors.textSecondary} style={{ marginRight: 4 }} />
                    <Text style={styles.permSecondaryBtnText}>Grant SMS Permission</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Close Button */}
            <TouchableOpacity style={styles.applyBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.applyBtnText}>Done</Text>
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
    paddingTop: 16,
    paddingBottom: 30,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.25)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#D1FAE5',
    lineHeight: 17,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    color: Colors.textMuted,
    marginBottom: 10,
  },
  sourceCard: {
    backgroundColor: '#111827',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#1E293B',
    padding: 14,
    marginBottom: 10,
  },
  sourceTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sourceHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sourceIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sourceTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#E2E8F0',
    marginRight: 6,
  },
  badgePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgePillText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sourceSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 3,
    lineHeight: 16,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#475569',
    alignItems: 'center',
    justifyContent: 'center',
  },
  whyBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 8,
    padding: 8,
    marginTop: 10,
  },
  whyLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  whyText: {
    flex: 1,
    fontSize: 11,
    color: '#94A3B8',
    lineHeight: 15,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 10,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  settingSubtext: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 15,
  },
  rangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 14,
  },
  rangePills: {
    flexDirection: 'row',
    gap: 6,
  },
  rangePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#1E293B',
  },
  rangePillActive: {
    backgroundColor: Colors.primary,
  },
  rangePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  rangePillTextActive: {
    color: '#0B0F19',
    fontWeight: '700',
  },
  permissionCard: {
    backgroundColor: '#181E2E',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A3449',
    padding: 14,
    marginBottom: 16,
  },
  permHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  permTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F59E0B',
  },
  permDescription: {
    fontSize: 11,
    color: '#94A3B8',
    lineHeight: 16,
    marginBottom: 12,
  },
  permButtons: {
    gap: 8,
  },
  permBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 9,
  },
  permBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0B0F19',
  },
  permSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 8,
    paddingVertical: 9,
  },
  permSecondaryBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  applyBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  applyBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0B0F19',
  },
});
