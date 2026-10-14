import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { User } from '../types/transaction';

const AVATAR_OPTIONS = ['👨‍💼', '👩‍💼', '🏡', '🧑‍💻', '👨‍👩‍👧', '💼', '🚀', '🎯'];

export const AuthScreen: React.FC = () => {
  const { users, loginWithPin, loginWithEmail, registerUser } = useAuth();
  
  const [selectedUser, setSelectedUser] = useState<User | null>(users[0] || null);
  const [pin, setPin] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'profiles' | 'email' | 'register'>('profiles');

  // Email form
  const [emailInput, setEmailInput] = useState<string>('');
  const [emailPin, setEmailPin] = useState<string>('');

  // Register form
  const [regName, setRegName] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regPin, setRegPin] = useState<string>('');
  const [regAvatar, setRegAvatar] = useState<string>('👨‍💼');

  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleProfileLogin = async () => {
    if (!selectedUser) {
      setErrorMessage('Please select a profile to log in.');
      return;
    }
    if (!pin) {
      setErrorMessage('Please enter your 4-digit PIN.');
      return;
    }

    setErrorMessage('');
    const res = await loginWithPin(selectedUser.id, pin);
    if (!res.success) {
      setErrorMessage(res.error || 'Login failed.');
    }
  };

  const handleEmailLogin = async () => {
    if (!emailInput.trim()) {
      setErrorMessage('Please enter your email.');
      return;
    }
    if (!emailPin) {
      setErrorMessage('Please enter your PIN.');
      return;
    }

    setErrorMessage('');
    const res = await loginWithEmail(emailInput, emailPin);
    if (!res.success) {
      setErrorMessage(res.error || 'Login failed.');
    }
  };

  const handleRegister = async () => {
    setErrorMessage('');
    const res = await registerUser(regName, regEmail, regPin, regAvatar);
    if (!res.success) {
      setErrorMessage(res.error || 'Registration failed.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* App Branding */}
        <View style={styles.brandHeader}>
          <View style={styles.logoBadge}>
            <Ionicons name="pie-chart" size={32} color="#0B0F19" />
          </View>
          <Text style={styles.appName}>Home CashFlow</Text>
          <Text style={styles.appTagline}>Multi-User Household Financial Ledger</Text>
        </View>

        {/* Tab Toggle: Profiles vs Email vs Register */}
        <View style={styles.tabToggle}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'profiles' && styles.tabBtnActive]}
            onPress={() => {
              setActiveTab('profiles');
              setErrorMessage('');
            }}
          >
            <Text style={[styles.tabBtnText, activeTab === 'profiles' && styles.tabBtnTextActive]}>
              Profiles
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'email' && styles.tabBtnActive]}
            onPress={() => {
              setActiveTab('email');
              setErrorMessage('');
            }}
          >
            <Text style={[styles.tabBtnText, activeTab === 'email' && styles.tabBtnTextActive]}>
              Email Login
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'register' && styles.tabBtnActive]}
            onPress={() => {
              setActiveTab('register');
              setErrorMessage('');
            }}
          >
            <Text style={[styles.tabBtnText, activeTab === 'register' && styles.tabBtnTextActive]}>
              New User
            </Text>
          </TouchableOpacity>
        </View>

        {/* Error Alert Banner */}
        {errorMessage ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={16} color="#F43F5E" style={{ marginRight: 6 }} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        {/* TAB 1: Household Profiles Quick Login */}
        {activeTab === 'profiles' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Select Your Profile</Text>
            <Text style={styles.cardSubtitle}>Choose an account and enter the 4-digit PIN</Text>

            <View style={styles.profileGrid}>
              {users.map((u) => {
                const isSelected = selectedUser?.id === u.id;
                return (
                  <TouchableOpacity
                    key={u.id}
                    style={[styles.profileTile, isSelected && styles.profileTileSelected]}
                    onPress={() => {
                      setSelectedUser(u);
                      setPin('');
                      setErrorMessage('');
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.avatarEmoji}>{u.avatar}</Text>
                    <Text style={[styles.profileName, isSelected && styles.profileNameSelected]} numberOfLines={1}>
                      {u.name}
                    </Text>
                    <Text style={styles.profileEmail} numberOfLines={1}>
                      {u.email}
                    </Text>
                    {isSelected && (
                      <View style={styles.selectedCheck}>
                        <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* PIN Entry for Selected Profile */}
            {selectedUser && (
              <View style={styles.pinSection}>
                <Text style={styles.pinLabel}>Enter PIN for {selectedUser.name}</Text>
                <TextInput
                  style={styles.pinInput}
                  placeholder="••••"
                  placeholderTextColor={Colors.textMuted}
                  value={pin}
                  onChangeText={setPin}
                  keyboardType="numeric"
                  secureTextEntry={true}
                  maxLength={6}
                />
                <Text style={styles.pinHint}>Default demo PIN: 1234</Text>

                <TouchableOpacity style={styles.submitBtn} onPress={handleProfileLogin}>
                  <Text style={styles.submitBtnText}>Sign In to Household</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* TAB 2: Email & Password/PIN Login */}
        {activeTab === 'email' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Account Sign In</Text>
            <Text style={styles.cardSubtitle}>Sign in using your registered household email</Text>

            <Text style={styles.inputLabel}>Email Address</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. adk113@gmail.com"
              placeholderTextColor={Colors.textMuted}
              value={emailInput}
              onChangeText={setEmailInput}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.inputLabel}>Security PIN / Password</Text>
            <TextInput
              style={styles.textInput}
              placeholder="••••"
              placeholderTextColor={Colors.textMuted}
              value={emailPin}
              onChangeText={setEmailPin}
              keyboardType="numeric"
              secureTextEntry={true}
              maxLength={6}
            />

            <TouchableOpacity style={styles.submitBtn} onPress={handleEmailLogin}>
              <Text style={styles.submitBtnText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* TAB 3: Register New User */}
        {activeTab === 'register' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Create Household Profile</Text>
            <Text style={styles.cardSubtitle}>Add a new family member or personal account</Text>

            {/* Avatar Picker */}
            <Text style={styles.inputLabel}>Choose Avatar</Text>
            <View style={styles.avatarRow}>
              {AVATAR_OPTIONS.map((av) => (
                <TouchableOpacity
                  key={av}
                  style={[styles.avatarChoice, regAvatar === av && styles.avatarChoiceSelected]}
                  onPress={() => setRegAvatar(av)}
                >
                  <Text style={{ fontSize: 22 }}>{av}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Sarah Jenkins"
              placeholderTextColor={Colors.textMuted}
              value={regName}
              onChangeText={setRegName}
            />

            <Text style={styles.inputLabel}>Email Address</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. sarah@example.com"
              placeholderTextColor={Colors.textMuted}
              value={regEmail}
              onChangeText={setRegEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.inputLabel}>Create 4-Digit PIN</Text>
            <TextInput
              style={styles.textInput}
              placeholder="1234"
              placeholderTextColor={Colors.textMuted}
              value={regPin}
              onChangeText={setRegPin}
              keyboardType="numeric"
              secureTextEntry={true}
              maxLength={6}
            />

            <TouchableOpacity style={styles.submitBtn} onPress={handleRegister}>
              <Text style={styles.submitBtnText}>Create Account & Sign In</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Footer Note */}
        <View style={styles.footerNote}>
          <Ionicons name="shield-checkmark" size={14} color={Colors.inflow} style={{ marginRight: 6 }} />
          <Text style={styles.footerText}>
            Local-first encryption • Multi-account data isolated on device
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 50,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  appName: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  appTagline: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  tabToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: Colors.cardBorder,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  tabBtnTextActive: {
    color: Colors.textPrimary,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244, 63, 94, 0.12)',
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.3)',
  },
  errorText: {
    color: '#F43F5E',
    fontSize: 12,
    fontWeight: '600',
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  cardSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 3,
    marginBottom: 16,
  },
  profileGrid: {
    gap: 10,
    marginBottom: 16,
  },
  profileTile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
  },
  profileTileSelected: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
  },
  avatarEmoji: {
    fontSize: 26,
    marginRight: 12,
  },
  profileName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    flex: 1,
  },
  profileNameSelected: {
    color: Colors.primary,
    fontWeight: '700',
  },
  profileEmail: {
    fontSize: 11,
    color: Colors.textMuted,
    marginRight: 8,
  },
  selectedCheck: {
    marginLeft: 6,
  },
  pinSection: {
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
    paddingTop: 16,
    alignItems: 'center',
  },
  pinLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  pinInput: {
    width: 140,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 12,
    paddingVertical: 10,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 8,
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  pinHint: {
    fontSize: 11,
    color: Colors.textMuted,
    fontStyle: 'italic',
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 6,
    marginTop: 10,
    textTransform: 'uppercase',
  },
  textInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  avatarRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  avatarChoice: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  avatarChoiceSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryMuted,
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 18,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnText: {
    color: '#0B0F19',
    fontSize: 15,
    fontWeight: '700',
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
});
