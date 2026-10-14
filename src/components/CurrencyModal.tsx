import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
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
              <Ionicons name="close" size={20} color={Colors.textSecondary} />
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
                        isSelected && { backgroundColor: Colors.primary },
                      ]}
                    >
                      <Text
                        style={[
                          styles.symbolText,
                          isSelected && { color: '#0B0F19', fontWeight: '800' },
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
                    <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
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

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
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
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surface,
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
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  currencyRowActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  symbolCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  symbolText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  codeText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  codeTextActive: {
    color: Colors.primary,
  },
  nameText: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
});
