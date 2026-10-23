import React, { useState, useMemo } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemePalette } from './src/theme/colors';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { TransactionProvider, useTransactions } from './src/context/TransactionContext';
import { AuthScreen } from './src/screens/AuthScreen';
import { PeriodSelector } from './src/components/PeriodSelector';
import { NetBalanceHero } from './src/components/NetBalanceHero';
import { CashFlowStatementView } from './src/components/CashFlowStatementView';
import { VisualReportsView } from './src/components/VisualReportsView';
import { TransactionList } from './src/components/TransactionList';
import { TransactionModal } from './src/components/TransactionModal';
import { CurrencyModal } from './src/components/CurrencyModal';
import { SettingsModal } from './src/components/SettingsModal';
import { MessageSourceModal } from './src/components/MessageSourceModal';
import { SmsApprovalQueue } from './src/components/SmsApprovalQueue';
import { PendingSmsTransaction } from './src/types/transaction';
import { calculateCategoryBreakdown } from './src/utils/accounting';
import { formatCurrency, getActivityConfig } from './src/utils/formatters';

type TabKey = 'dashboard' | 'cashflow' | 'reports' | 'transactions';

function MainScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const { currentUser, logout } = useAuth();
  const {
    period,
    setPeriod,
    metrics,
    filteredTransactions,
    categories,
    categoriesMap,
    currency,
    setCurrency,
    isLoading,
    addTransaction,
    deleteTransaction,
    deleteTransactions,
    clearAllTransactions,
    pendingSms,
    approvePendingSms,
    dismissPendingSms,
  } = useTransactions();

  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [modalInitialType, setModalInitialType] = useState<'income' | 'expense'>('expense');
  const [editingPendingSms, setEditingPendingSms] = useState<PendingSmsTransaction | null>(null);
  const [currencyModalVisible, setCurrencyModalVisible] = useState<boolean>(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState<boolean>(false);
  const [smartMergeModalVisible, setSmartMergeModalVisible] = useState<boolean>(false);

  // Compute category breakdowns for visual reports
  const expenseCategories = useMemo(
    () => calculateCategoryBreakdown(filteredTransactions, categoriesMap, 'expense'),
    [filteredTransactions, categoriesMap]
  );

  const incomeCategories = useMemo(
    () => calculateCategoryBreakdown(filteredTransactions, categoriesMap, 'income'),
    [filteredTransactions, categoriesMap]
  );

  const openAddModal = (type: 'income' | 'expense' = 'expense') => {
    setEditingPendingSms(null);
    setModalInitialType(type);
    setModalVisible(true);
  };

  const handleEditPendingSms = (sms: PendingSmsTransaction) => {
    setEditingPendingSms(sms);
    setModalInitialType(sms.type);
    setModalVisible(true);
  };

  const handleSaveTransaction = async (data: any) => {
    await addTransaction(data);
    if (editingPendingSms) {
      await dismissPendingSms(editingPendingSms.id);
      setEditingPendingSms(null);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Initializing SQLite Cash Flow Engine...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      {/* Top Application Bar with proper status bar clearance */}
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <View style={styles.logoIcon}>
            <Ionicons name="pie-chart" size={18} color={colors.primaryText} />
          </View>
          <Text style={styles.brandTitle}>Home CashFlow</Text>
        </View>

        {/* Quick Top Actions: Instant Theme Toggle & Settings */}
        <View style={styles.topBarActions}>
          <TouchableOpacity
            style={styles.topActionBtn}
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

          <TouchableOpacity
            style={styles.topActionBtn}
            onPress={() => setSettingsModalVisible(true)}
            activeOpacity={0.7}
            accessibilityLabel="Settings"
          >
            <Ionicons name="settings-outline" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Utility Bar Below: Currency Selection & Profile Logout */}
      <View style={styles.utilityBar}>
        <View style={styles.userBadge}>
          <Text style={styles.userAvatar}>{currentUser?.avatar || '👤'}</Text>
          <Text style={styles.userName} numberOfLines={1}>
            {currentUser ? currentUser.name : 'Household Ledger'}
          </Text>
        </View>

        <View style={styles.utilityActions}>
          {/* Currency Switcher Pill */}
          <TouchableOpacity
            style={styles.currencyBtn}
            onPress={() => setCurrencyModalVisible(true)}
            activeOpacity={0.7}
          >
            <View style={styles.currSymbolCircle}>
              <Text style={styles.currSymbolText}>{currency.symbol}</Text>
            </View>
            <Text style={styles.currCodeText}>{currency.code}</Text>
            <Ionicons name="chevron-down" size={12} color={colors.textSecondary} style={{ marginLeft: 3 }} />
          </TouchableOpacity>

          {/* User Profile / Logout / Switch Account Button */}
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={logout}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={13} color={colors.outflow} style={{ marginRight: 3 }} />
            <Text style={styles.logoutBtnText}>Switch</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Period Selector (Daily, Weekly, Monthly, Annually) */}
      <PeriodSelector currentPeriod={period} onSelectPeriod={setPeriod} />

      {/* Main Tab Content */}
      <View style={styles.contentArea}>
        {activeTab === 'dashboard' && (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
            {/* Net Balance & Income/Expense Hero */}
            <NetBalanceHero metrics={metrics} currency={currency} onOpenAddModal={openAddModal} />

            {/* Background SMS Pending Approval Queue */}
            <SmsApprovalQueue
              queue={pendingSms}
              currency={currency}
              onApprove={approvePendingSms}
              onDismiss={dismissPendingSms}
              onEdit={handleEditPendingSms}
            />

            {/* Accounting 3-Pillar Quick Summary */}
            <View style={styles.summarySection}>
              <Text style={styles.sectionHeaderTitle}>Cash Flow By Activity</Text>
              <View style={styles.activityGrid}>
                {/* Operating */}
                <View style={[styles.activityTile, { borderLeftColor: colors.operating }]}>
                  <Text style={styles.tileLabel}>Operating (CFO)</Text>
                  <Text
                    style={[
                      styles.tileAmount,
                      { color: metrics.cashFlow.netOperating >= 0 ? colors.inflow : colors.outflow },
                    ]}
                  >
                    {formatCurrency(metrics.cashFlow.netOperating, currency, true)}
                  </Text>
                  <Text style={styles.tileDesc}>Living Expenses & Core Income</Text>
                </View>

                {/* Investing */}
                <View style={[styles.activityTile, { borderLeftColor: colors.investing }]}>
                  <Text style={styles.tileLabel}>Investing (CFI)</Text>
                  <Text
                    style={[
                      styles.tileAmount,
                      { color: metrics.cashFlow.netInvesting >= 0 ? colors.inflow : colors.outflow },
                    ]}
                  >
                    {formatCurrency(metrics.cashFlow.netInvesting, currency, true)}
                  </Text>
                  <Text style={styles.tileDesc}>Wealth Assets & Investments</Text>
                </View>

                {/* Financing */}
                <View style={[styles.activityTile, { borderLeftColor: colors.financing }]}>
                  <Text style={styles.tileLabel}>Financing (CFF)</Text>
                  <Text
                    style={[
                      styles.tileAmount,
                      { color: metrics.cashFlow.netFinancing >= 0 ? colors.inflow : colors.outflow },
                    ]}
                  >
                    {formatCurrency(metrics.cashFlow.netFinancing, currency, true)}
                  </Text>
                  <Text style={styles.tileDesc}>Liabilities & Debt Paydowns</Text>
                </View>
              </View>
            </View>

            {/* Recent Activity Preview */}
            <View style={styles.recentSection}>
              <View style={styles.recentHeader}>
                <Text style={styles.sectionHeaderTitle}>Recent Transactions</Text>
                <TouchableOpacity onPress={() => setActiveTab('transactions')}>
                  <Text style={styles.viewAllText}>View All ({filteredTransactions.length})</Text>
                </TouchableOpacity>
              </View>

              {filteredTransactions.slice(0, 4).map((tx) => {
                const cat = categoriesMap.get(tx.categoryId);
                const actConfig = getActivityConfig(tx.activity);
                const isIncome = tx.type === 'income';
                return (
                  <View key={tx.id} style={styles.miniTxRow}>
                    <View style={styles.miniTxLeft}>
                      <View style={[styles.miniIconBox, { backgroundColor: cat ? `${cat.color}25` : colors.surface }]}>
                        <Ionicons
                          name={(cat?.icon as any) || 'pricetag-outline'}
                          size={15}
                          color={cat?.color || colors.textSecondary}
                        />
                      </View>
                      <View>
                        <Text style={styles.miniCatName}>{cat?.name || 'Uncategorized'}</Text>
                        <Text style={styles.miniDate}>{tx.notes || tx.date}</Text>
                      </View>
                    </View>
                    <View style={styles.miniTxRight}>
                      <Text
                        style={[
                          styles.miniAmount,
                          { color: isIncome ? colors.inflow : colors.textPrimary },
                        ]}
                      >
                        {formatCurrency(tx.amount, currency, true)}
                      </Text>
                      <View style={[styles.miniActBadge, { backgroundColor: actConfig.badgeBg }]}>
                        <Text style={[styles.miniActText, { color: actConfig.color }]}>
                          {actConfig.code}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        )}

        {activeTab === 'cashflow' && (
          <CashFlowStatementView
            statement={metrics.cashFlow}
            periodLabel={metrics.periodLabel}
          />
        )}

        {activeTab === 'reports' && (
          <VisualReportsView
            statement={metrics.cashFlow}
            periodLabel={metrics.periodLabel}
            expenseCategories={expenseCategories}
            incomeCategories={incomeCategories}
          />
        )}

        {activeTab === 'transactions' && (
          <TransactionList
            transactions={filteredTransactions}
            categoriesMap={categoriesMap}
            onDeleteTransaction={deleteTransaction}
            onDeleteTransactions={deleteTransactions}
            onClearAll={clearAllTransactions}
            onAddNew={() => openAddModal('expense')}
            periodLabel={metrics.periodLabel}
          />
        )}
      </View>

      {/* Bottom Navigation Tab Bar */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navTab}
          onPress={() => setActiveTab('dashboard')}
        >
          <Ionicons
            name={activeTab === 'dashboard' ? 'home' : 'home-outline'}
            size={22}
            color={activeTab === 'dashboard' ? colors.primary : colors.textSecondary}
          />
          <Text style={[styles.navLabel, activeTab === 'dashboard' && styles.navLabelActive]}>
            Dashboard
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navTab}
          onPress={() => setActiveTab('cashflow')}
        >
          <Ionicons
            name={activeTab === 'cashflow' ? 'document-text' : 'document-text-outline'}
            size={22}
            color={activeTab === 'cashflow' ? colors.primary : colors.textSecondary}
          />
          <Text style={[styles.navLabel, activeTab === 'cashflow' && styles.navLabelActive]}>
            Statement
          </Text>
        </TouchableOpacity>

        {/* Center Floating Plus Action */}
        <TouchableOpacity
          style={styles.centerFab}
          onPress={() => openAddModal('expense')}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={26} color={colors.primaryText} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navTab}
          onPress={() => setActiveTab('reports')}
        >
          <Ionicons
            name={activeTab === 'reports' ? 'bar-chart' : 'bar-chart-outline'}
            size={22}
            color={activeTab === 'reports' ? colors.primary : colors.textSecondary}
          />
          <Text style={[styles.navLabel, activeTab === 'reports' && styles.navLabelActive]}>
            Reports
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navTab}
          onPress={() => setActiveTab('transactions')}
        >
          <Ionicons
            name={activeTab === 'transactions' ? 'list' : 'list-outline'}
            size={22}
            color={activeTab === 'transactions' ? colors.primary : colors.textSecondary}
          />
          <Text style={[styles.navLabel, activeTab === 'transactions' && styles.navLabelActive]}>
            Ledger
          </Text>
        </TouchableOpacity>
      </View>

      {/* Add Transaction Modal */}
      <TransactionModal
        visible={modalVisible}
        initialType={editingPendingSms ? editingPendingSms.type : modalInitialType}
        initialAmount={editingPendingSms?.amount}
        initialCategoryId={editingPendingSms?.suggestedCategoryId}
        initialActivity={editingPendingSms?.activity}
        initialSourceAccount={editingPendingSms?.sourceAccount}
        initialDate={editingPendingSms?.date}
        initialNotes={editingPendingSms ? editingPendingSms.body : ''}
        initialEntryMode={editingPendingSms ? 'AUTOMATED' : undefined}
        categories={categories}
        currency={currency}
        onClose={() => {
          setModalVisible(false);
          setEditingPendingSms(null);
        }}
        onSave={handleSaveTransaction}
      />

      {/* Select Currency Modal */}
      <CurrencyModal
        visible={currencyModalVisible}
        selectedCurrency={currency}
        onSelect={setCurrency}
        onClose={() => setCurrencyModalVisible(false)}
      />

      {/* Settings & Theme Modal */}
      <SettingsModal
        visible={settingsModalVisible}
        onClose={() => setSettingsModalVisible(false)}
        onOpenCurrencyModal={() => setCurrencyModalVisible(true)}
        onOpenSmartMergeModal={() => setSmartMergeModalVisible(true)}
      />

      {/* Smart Merge Engine Modal */}
      <MessageSourceModal
        visible={smartMergeModalVisible}
        onClose={() => setSmartMergeModalVisible(false)}
      />
    </SafeAreaView>
  );
}

function RootNavigator() {
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const { colors, isDark } = useTheme();

  if (isLoadingAuth) {
    return (
      <View style={[stylesStatic.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[stylesStatic.loadingText, { color: colors.textSecondary }]}>Loading Household Session...</Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  return <MainScreen />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <TransactionProvider>
          <RootNavigator />
        </TransactionProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

const stylesStatic = StyleSheet.create({
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    marginTop: 12,
  },
});

const getStyles = (colors: ThemePalette) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    centerContainer: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: {
      color: colors.textSecondary,
      fontSize: 14,
      marginTop: 12,
    },
    topBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 28) + 8 : 12,
      paddingBottom: 6,
    },
    brandRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    logoIcon: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    brandTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.textPrimary,
      letterSpacing: -0.3,
    },
    topBarActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    topActionBtn: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    utilityBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
    },
    userBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      maxWidth: '55%',
    },
    userAvatar: {
      fontSize: 13,
      marginRight: 6,
    },
    userName: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    utilityActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    currencyBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    currSymbolCircle: {
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: colors.primaryMuted,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 5,
    },
    currSymbolText: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.primary,
    },
    currCodeText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    logoutBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: `${colors.outflow}15`,
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: `${colors.outflow}35`,
    },
    logoutBtnText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.outflow,
    },
    contentArea: {
      flex: 1,
    },
    summarySection: {
      marginHorizontal: 16,
      marginTop: 18,
    },
    sectionHeaderTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 10,
    },
    activityGrid: {
      flexDirection: 'row',
      gap: 8,
    },
    activityTile: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderLeftWidth: 3.5,
    },
    tileLabel: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.textMuted,
      textTransform: 'uppercase',
    },
    tileAmount: {
      fontSize: 13,
      fontWeight: '700',
      marginTop: 4,
    },
    tileDesc: {
      fontSize: 9,
      color: colors.textSecondary,
      marginTop: 2,
    },
    recentSection: {
      marginHorizontal: 16,
      marginTop: 20,
    },
    recentHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    viewAllText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.primary,
    },
    miniTxRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    miniTxLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    miniIconBox: {
      width: 32,
      height: 32,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    miniCatName: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    miniDate: {
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 1,
    },
    miniTxRight: {
      alignItems: 'flex-end',
    },
    miniAmount: {
      fontSize: 13,
      fontWeight: '700',
    },
    miniActBadge: {
      paddingHorizontal: 4,
      paddingVertical: 1,
      borderRadius: 4,
      marginTop: 2,
    },
    miniActText: {
      fontSize: 9,
      fontWeight: '800',
    },
    bottomNav: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderColor: colors.cardBorder,
      paddingVertical: 8,
      paddingHorizontal: 8,
      alignItems: 'center',
      justifyContent: 'space-around',
    },
    navTab: {
      alignItems: 'center',
      justifyContent: 'center',
      flex: 1,
    },
    navLabel: {
      fontSize: 10,
      color: colors.textSecondary,
      marginTop: 3,
      fontWeight: '500',
    },
    navLabelActive: {
      color: colors.primary,
      fontWeight: '700',
    },
    centerFab: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 5,
    },
  });
