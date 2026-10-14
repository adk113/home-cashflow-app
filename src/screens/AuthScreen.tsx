import React, { useState, useEffect } from 'react';
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
  const { users, loginWithPin, loginWithEmail, registerUser, deleteUser } = useAuth();
  
  const hasUsers = users.length > 0;
  const [selectedUser, setSelectedUser] = useState<User | null>(users[0] || null);
  const [pin, setPin] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'profiles' | 'email' | 'register'>(
    hasUsers ? 'profiles' : 'register'
  );

  // Email form
  const [emailInput, setEmailInput] = useState<string>('');
  const [emailPin, setEmailPin] = useState<string>('');

  // Register form
  const [regName, setRegName] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regPin, setRegPin] = useState<string>('');
  const [regAvatar, setRegAvatar] = useState<string>('👨‍💼');

  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (users.length > 0) {
      if (!selectedUser || !users.some((u) => u.id === selectedUser.id)) {
        setSelectedUser(users[0]);
      }
    } else {
      setSelectedUser(null);
      setActiveTab('register');
    }
  }, [users]);

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
    if (!regName.trim()) {
      setErrorMessage('Please enter a name for your profile.');
      return;
    }
    setErrorMessage('');
    const res = await registerUser(regName, regEmail, regPin, regAvatar);
    if (!res.success) {
      setErrorMessage(res.error || 'Registration failed.');
    }
  };

  const confirmDeleteProfile = (userToDelete: User) => {
    const msg = `Delete profile "${userToDelete.name}" from this device?`;
    if (Platform.OS === 'web') {
      if (confirm(msg)) {
        deleteUser(userToDelete.id);
      }
    } else {
      Alert.alert('Delete Profile', msg, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteUser(userToDelete.id),
        },
      ]);
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
          <Text style={styles.appTagline}>Private Household Financial Ledger</Text>
        </View>

        {/* Tab Toggle: Only shown if at least 1 account exists */}
        {hasUsers && (
          <View style={styles.tabToggle}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'profiles' && styles.tabBtnActive]}
              onPress={() => {
                setActiveTab('profiles');
                setErrorMessage('');
              }}
            >
              <Text style={[styles.tabBtnText, activeTab === 'profiles' && styles.tabBtnTextActive]}>
                Profiles ({users.length})
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
                + Add Profile
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Error Alert Banner */}
        {errorMessage ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={16} color="#F43F5E" style={{ marginRight: 6 }} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        {/* TAB 1: Household Profiles Quick Login (Only when accounts exist) */}
        {hasUsers && activeTab === 'profiles' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Select Your Profile</Text>
            <Text style={styles.cardSubtitle}>Choose your account and enter your 4-digit PIN</Text>

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
                      {u.role === 'primary' ? 'Primary' : 'Member'}
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

                <TouchableOpacity style={styles.submitBtn} onPress={handleProfileLogin}>
                  <Text style={styles.submitBtnText}>Sign In</Text>
                </TouchableOpacity>

                {users.length > 1 && (
                  <TouchableOpacity
                    style={styles.deleteProfileBtn}
                    onPress={() => confirmDeleteProfile(selectedUser)}
                  >
                    <Text style={styles.deleteProfileText}>Remove Profile from Phone</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}

        {/* TAB 2: Email & Password/PIN Login */}
        {hasUsers && activeTab === 'email' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Account Sign In</Text>
            <Text style={styles.cardSubtitle}>Sign in using your registered email and PIN</Text>

            <Text style={styles.inputLabel}>Email Address</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. name@example.com"
              placeholderTextColor={Colors.textMuted}
              value={emailInput}
              onChangeText={setEmailInput}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.inputLabel}>Security PIN</Text>
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

        {/* TAB 3 / ONBOARDING: Create Profile (Shown on fresh install or when adding member) */}
        {(!hasUsers || activeTab === 'register') && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {hasUsers ? 'Add Household Member' : 'Welcome! Setup Your Profile'}
            </Text>
            <Text style={styles.cardSubtitle}>
              {hasUsers
                ? 'Create a separate profile for another family member on this phone.'
                : 'Create your private account. All financial records stay 100% offline on your device.'}
            </Text>

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

            <Text style={styles.inputLabel}>Your Name / Household Name</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. My Household, Alex, or Home"
              placeholderTextColor={Colors.textMuted}
              value={regName}
              onChangeText={setRegName}
            />

            <Text style={styles.inputLabel}>Email (Optional)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="(Optional) e.g. you@example.com"
              placeholderTextColor={Colors.textMuted}
              value={regEmail}
              onChangeText={setRegEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.inputLabel}>4-Digit Security PIN (Default: 1234)</Text>
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
              <Text style={styles.submitBtnText}>
                {hasUsers ? 'Create Profile' : 'Create Account & Enter'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Footer Note */}
        <View style={styles.footerNote}>
          <Ionicons name="shield-checkmark" size={14} color={Colors.inflow} style={{ marginRight: 6 }} />
          <Text style={styles.footerText}>
            100% Private & Offline • Encrypted on device
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
    paddingTop: Platform.OS === 'android' ? 30 : 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
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
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    width: '100%',
    maxWidth: 400,
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
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  tabBtnTextActive: {
    color: Colors.primary,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244, 63, 94, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 16,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.3)',
  },
  errorText: {
    color: '#F43F5E',
    fontSize: 12,
    flex: 1,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 18,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  cardSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 18,
  },
  profileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  profileTile: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    position: 'relative',
  },
  profileTileSelected: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
  },
  avatarEmoji: {
    fontSize: 32,
    marginBottom: 6,
  },
  profileName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  profileNameSelected: {
    color: Colors.primary,
  },
  profileEmail: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  selectedCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  pinSection: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
    paddingTop: 16,
  },
  pinLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  pinInput: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingVertical: 12,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 10,
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 6,
    marginTop: 10,
  },
  textInput: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  avatarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  avatarChoice: {
    padding: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  avatarChoiceSelected: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  submitBtnText: {
    color: '#0B0F19',
    fontSize: 14,
    fontWeight: '700',
  },
  deleteProfileBtn: {
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 6,
  },
  deleteProfileText: {
    color: '#F43F5E',
    fontSize: 11,
    fontWeight: '600',
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
});
