import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemePalette } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import { Currency } from '../types/transaction';
import { SUPPORTED_CURRENCIES } from '../utils/currencies';

interface CurrencyModalProps {
  visible: boolean;
  selectedCurrency: Currency;
  onSelect: (currency: Currency) => void;
  onClose: () => void;
}

export const CurrencyModal: React.FC<CurrencyModalProps> = ({
  visible,
  selectedCurrency,
  onSelect,
  onClose,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>Select Currency</Text>
              <Text style={styles.subtitle}>Choose your primary household currency</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {SUPPORTED_CURRENCIES.map((curr) => {
              const isSelected = curr.code === selectedCurrency.code;
              return (
                <TouchableOpacity
                  key={curr.code}
                  style={[styles.currencyRow, isSelected && styles.currencyRowActive]}
                  onPress={() => {
                    onSelect(curr);
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.rowLeft}>
                    <View
                      style={[
                        styles.symbolCircle,
                        isSelected && { backgroundColor: colors.primary },
                      ]}
                    >
                      <Text
                        style={[
                          styles.symbolText,
                          isSelected && { color: colors.primaryText, fontWeight: '800' },
                        ]}
                      >
                        {curr.symbol}
                      </Text>
                    </View>
                    <View>
                      <Text style={[styles.codeText, isSelected && styles.codeTextActive]}>
                        {curr.code}
                      </Text>
                      <Text style={styles.nameText}>{curr.name}</Text>
                    </View>
                  </View>

                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const getStyles = (colors: ThemePalette) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalCard: {
      width: '100%',
      maxWidth: 420,
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      maxHeight: '80%',
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    subtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    list: {
      marginTop: 4,
    },
    currencyRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 12,
      marginBottom: 8,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    currencyRowActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryMuted,
    },
    rowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    symbolCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    symbolText: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    codeText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    codeTextActive: {
      color: colors.primary,
    },
    nameText: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 1,
    },
  });
