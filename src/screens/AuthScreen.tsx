import React, { useState, useEffect, useMemo } from 'react';
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
import { ThemePalette } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { User } from '../types/transaction';

const AVATAR_OPTIONS = ['👨‍💼', '👩‍💼', '🏡', '🧑‍💻', '👨‍👩‍👧', '💼', '🚀', '🎯'];

export const AuthScreen: React.FC = () => {
  const { colors, isDark, toggleTheme } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

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
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Header with Theme Toggle */}
        <View style={styles.topHeader}>
          <View style={{ width: 36 }} />
          <View style={styles.header}>
            <View style={styles.logoBadge}>
              <Ionicons name="pie-chart" size={32} color={colors.primary} />
            </View>
            <Text style={styles.appTitle}>Home CashFlow</Text>
            <Text style={styles.appTagline}>Corporate Statement of Cash Flows for Households</Text>
          </View>
          <TouchableOpacity
            style={styles.themeToggleBtn}
            onPress={toggleTheme}
            activeOpacity={0.7}
            accessibilityLabel="Toggle Theme"
          >
            <Ionicons
              name={isDark ? 'sunny' : 'moon'}
              size={18}
              color={isDark ? '#F59E0B' : colors.primary}
            />
          </TouchableOpacity>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabContainer}>
          {hasUsers && (
            <TouchableOpacity
              style={[styles.tab, activeTab === 'profiles' && styles.tabActive]}
              onPress={() => {
                setActiveTab('profiles');
                setErrorMessage('');
              }}
            >
              <Text style={[styles.tabText, activeTab === 'profiles' && styles.tabTextActive]}>
                Profiles
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.tab, activeTab === 'email' && styles.tabActive]}
            onPress={() => {
              setActiveTab('email');
              setErrorMessage('');
            }}
          >
            <Text style={[styles.tabText, activeTab === 'email' && styles.tabTextActive]}>
              Email Login
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'register' && styles.tabActive]}
            onPress={() => {
              setActiveTab('register');
              setErrorMessage('');
            }}
          >
            <Text style={[styles.tabText, activeTab === 'register' && styles.tabTextActive]}>
              + New Profile
            </Text>
          </TouchableOpacity>
        </View>

        {/* Error message alert */}
        {errorMessage ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={16} color={colors.outflow} style={{ marginRight: 6 }} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        {/* Profiles Tab */}
        {activeTab === 'profiles' && hasUsers && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Select Household Member</Text>
            <Text style={styles.cardSubtitle}>
              Choose your profile and enter your PIN to unlock the ledger
            </Text>

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
                    activeOpacity={0.8}
                  >
                    <Text style={styles.avatarEmoji}>{u.avatar || '👤'}</Text>
                    <Text
                      style={[styles.profileName, isSelected && styles.profileNameSelected]}
                      numberOfLines={1}
                    >
                      {u.name}
                    </Text>
                    {u.email ? (
                      <Text style={styles.profileEmail} numberOfLines={1}>
                        {u.email}
                      </Text>
                    ) : null}

                    {isSelected && (
                      <View style={styles.selectedCheck}>
                        <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {selectedUser && (
              <View style={styles.pinSection}>
                <Text style={styles.pinLabel}>Enter 4-Digit Security PIN</Text>
                <TextInput
                  style={styles.pinInput}
                  value={pin}
                  onChangeText={setPin}
                  keyboardType="numeric"
                  secureTextEntry
                  maxLength={4}
                  placeholder="••••"
                  placeholderTextColor={colors.placeholder}
                  onSubmitEditing={handleProfileLogin}
                />

                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={handleProfileLogin}
                  activeOpacity={0.8}
                >
                  <Text style={styles.submitBtnText}>Unlock Household Ledger</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteProfileBtn}
                  onPress={() => confirmDeleteProfile(selectedUser)}
                >
                  <Text style={styles.deleteProfileText}>Delete Profile</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Email Login Tab */}
        {activeTab === 'email' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sign in with Email</Text>
            <Text style={styles.cardSubtitle}>
              Use your registered email and 4-digit PIN
            </Text>

            <Text style={styles.inputLabel}>Email Address</Text>
            <TextInput
              style={styles.textInput}
              value={emailInput}
              onChangeText={setEmailInput}
              placeholder="e.g. aditya@home.local"
              placeholderTextColor={colors.placeholder}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text style={styles.inputLabel}>4-Digit PIN</Text>
            <TextInput
              style={styles.textInput}
              value={emailPin}
              onChangeText={setEmailPin}
              placeholder="4-digit PIN"
              placeholderTextColor={colors.placeholder}
              keyboardType="numeric"
              secureTextEntry
              maxLength={4}
              onSubmitEditing={handleEmailLogin}
            />

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleEmailLogin}
              activeOpacity={0.8}
            >
              <Text style={styles.submitBtnText}>Log In</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Register Tab */}
        {activeTab === 'register' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Create Household Profile</Text>
            <Text style={styles.cardSubtitle}>
              Set up a local profile for expense tracking and bank statement analysis
            </Text>

            <Text style={styles.inputLabel}>Choose Avatar</Text>
            <View style={styles.avatarRow}>
              {AVATAR_OPTIONS.map((av) => (
                <TouchableOpacity
                  key={av}
                  style={[
                    styles.avatarChoice,
                    regAvatar === av && styles.avatarChoiceSelected,
                  ]}
                  onPress={() => setRegAvatar(av)}
                >
                  <Text style={{ fontSize: 24 }}>{av}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Profile Name *</Text>
            <TextInput
              style={styles.textInput}
              value={regName}
              onChangeText={setRegName}
              placeholder="e.g. Aditya or Family"
              placeholderTextColor={colors.placeholder}
            />

            <Text style={styles.inputLabel}>Email (Optional)</Text>
            <TextInput
              style={styles.textInput}
              value={regEmail}
              onChangeText={setRegEmail}
              placeholder="e.g. aditya@home.local"
              placeholderTextColor={colors.placeholder}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text style={styles.inputLabel}>Security PIN (Optional 4 digits)</Text>
            <TextInput
              style={styles.textInput}
              value={regPin}
              onChangeText={setRegPin}
              placeholder="Leave empty for no PIN"
              placeholderTextColor={colors.placeholder}
              keyboardType="numeric"
              secureTextEntry
              maxLength={4}
              onSubmitEditing={handleRegister}
            />

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleRegister}
              activeOpacity={0.8}
            >
              <Text style={styles.submitBtnText}>Create Profile & Open Ledger</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Privacy Note */}
        <View style={styles.footerNote}>
          <Ionicons name="lock-closed-outline" size={12} color={colors.textMuted} style={{ marginRight: 5 }} />
          <Text style={styles.footerText}>
            100% Private • Offline SQLite Engine • Zero Cloud Sync
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const getStyles = (colors: ThemePalette) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      flexGrow: 1,
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: Platform.OS === 'android' ? 36 : 20,
      paddingBottom: 40,
    },
    topHeader: {
      flexDirection: 'row',
      width: '100%',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    themeToggleBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    header: {
      alignItems: 'center',
      flex: 1,
    },
    logoBadge: {
      width: 64,
      height: 64,
      borderRadius: 16,
      backgroundColor: colors.primaryMuted,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    appTitle: {
      fontSize: 24,
      fontWeight: '800',
      color: colors.textPrimary,
      letterSpacing: -0.5,
    },
    appTagline: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 4,
      textAlign: 'center',
      maxWidth: 280,
    },
    tabContainer: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 4,
      marginTop: 20,
      marginBottom: 16,
      width: '100%',
      maxWidth: 400,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    tab: {
      flex: 1,
      paddingVertical: 8,
      alignItems: 'center',
      borderRadius: 8,
    },
    tabActive: {
      backgroundColor: colors.primary,
    },
    tabText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    tabTextActive: {
      color: colors.primaryText,
      fontWeight: '700',
    },
    errorBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: `${colors.outflow}15`,
      borderWidth: 1,
      borderColor: `${colors.outflow}35`,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 10,
      marginBottom: 14,
      width: '100%',
      maxWidth: 400,
    },
    errorText: {
      color: colors.outflow,
      fontSize: 12,
      fontWeight: '600',
      flex: 1,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 20,
      width: '100%',
      maxWidth: 400,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    cardSubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
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
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 12,
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      position: 'relative',
    },
    profileTileSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryMuted,
    },
    avatarEmoji: {
      fontSize: 32,
      marginBottom: 6,
    },
    profileName: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textPrimary,
      textAlign: 'center',
    },
    profileNameSelected: {
      color: colors.primary,
    },
    profileEmail: {
      fontSize: 10,
      color: colors.textMuted,
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
      borderTopColor: colors.cardBorder,
      paddingTop: 16,
    },
    pinLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 8,
      textAlign: 'center',
    },
    pinInput: {
      backgroundColor: colors.inputBg,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      paddingVertical: 12,
      fontSize: 22,
      fontWeight: '800',
      letterSpacing: 10,
      color: colors.primary,
      textAlign: 'center',
      marginBottom: 14,
    },
    inputLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 6,
      marginTop: 10,
    },
    textInput: {
      backgroundColor: colors.inputBg,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 14,
      color: colors.textPrimary,
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
      borderColor: colors.primary,
      backgroundColor: colors.primaryMuted,
    },
    submitBtn: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 16,
    },
    submitBtnText: {
      color: colors.primaryText,
      fontSize: 14,
      fontWeight: '700',
    },
    deleteProfileBtn: {
      alignItems: 'center',
      marginTop: 12,
      paddingVertical: 6,
    },
    deleteProfileText: {
      color: colors.outflow,
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
      color: colors.textMuted,
    },
  });
