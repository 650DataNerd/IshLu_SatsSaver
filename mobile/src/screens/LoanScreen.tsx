import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator,
  RefreshControl, TextInput, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomNav } from '../components/BottomNav';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { api } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const LoanScreen = ({ navigation }: any) => {
  const [trust, setTrust] = useState<any>(null);
  const [loans, setLoans] = useState<any[]>([]);
  const [calculator, setCalculator] = useState<any>(null);
  const [collateralSats, setCollateralSats] = useState('100000');
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [showApply, setShowApply] = useState(false);
  const [termDays, setTermDays] = useState(30);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const phone = await AsyncStorage.getItem('user_phone');
      if (phone) setMpesaPhone(phone);
      const [trustRes, loansRes] = await Promise.all([
        api.get('/trust/score'),
        api.get('/loans/my-loans'),
      ]);
      setTrust(trustRes.data);
      setLoans(loansRes.data || []);
      await runCalculator('100000');
    } catch (e: any) {
      if (e.response?.status === 401) navigation.replace('Onboarding');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const runCalculator = async (sats: string, term?: number) => {
    if (!sats || parseInt(sats) < 100000) return;
    const t = term || termDays;
    try {
      const res = await api.get(`/loans/calculator?collateral_sats=${sats}&term_days=${t}`);
      setCalculator(res.data);
    } catch {}
  };

  const handleApply = async () => {
    if (!mpesaPhone) { Alert.alert('Enter M-Pesa number to receive KES'); return; }
    setApplying(true);
    try {
      const res = await api.post('/loans/request', {
        collateral_sats: parseInt(collateralSats),
        mpesa_phone: mpesaPhone,
        term_days: termDays,
      });
      Alert.alert(
        '⚡ Loan Approved!',
        res.data.message,
        [{ text: 'View Dashboard', onPress: () => navigation.navigate('Dashboard') }]
      );
      setShowApply(false);
      load();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Could not process loan');
    } finally {
      setApplying(false);
    }
  };

  const activeLoans = loans.filter(l => l.status === 'active');
  const isEligible = trust && trust.score >= 450;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.orange} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor={COLORS.orange}
          />
        }
      >
        <View style={styles.body}>

          {/* Header */}
          <Text style={styles.title}>Bitcoin Loans</Text>
          <Text style={styles.sub}>Don't sell your Bitcoin. Get liquidity.</Text>

          {/* Active loan */}
          {activeLoans.length > 0 && (
            <View style={styles.activeLoanCard}>
              <View style={styles.activeLoanHeader}>
                <Text style={styles.activeLoanLabel}>ACTIVE LOAN</Text>
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>Active</Text>
                </View>
              </View>
              <Text style={styles.activeLoanAmount}>
                KES {activeLoans[0].disbursed_kes?.toLocaleString()}
              </Text>
              <View style={styles.activeLoanDetails}>
                <View style={styles.activeLoanDetail}>
                  <Text style={styles.detailLabel}>Collateral locked</Text>
                  <Text style={styles.detailVal}>
                    {activeLoans[0].collateral_sats?.toLocaleString()} sats
                  </Text>
                </View>
                <View style={styles.activeLoanDetail}>
                  <Text style={styles.detailLabel}>Due date</Text>
                  <Text style={styles.detailVal}>{activeLoans[0].due_date}</Text>
                </View>
                <View style={styles.activeLoanDetail}>
                  <Text style={styles.detailLabel}>Rate</Text>
                  <Text style={styles.detailVal}>11.49% APR</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.repayBtn}
                onPress={() => navigation.navigate('Repay', { loanId: activeLoans[0].id })}
              >
                <Text style={styles.repayBtnText}>Repay Loan →</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Calculator */}
          <View style={styles.calculatorCard}>
            <Text style={styles.cardTitle}>Loan Calculator</Text>
            <Text style={styles.calcLabel}>HOW MUCH BITCOIN TO LOCK</Text>
            <View style={styles.calcInputRow}>
              <Text style={styles.calcPrefix}>₿</Text>
              <TextInput
                style={styles.calcInput}
                value={collateralSats}
                onChangeText={(v) => {
                  setCollateralSats(v);
                  if (parseInt(v) >= 1000) runCalculator(v);
                }}
                keyboardType="numeric"
                placeholder="100000"
                placeholderTextColor={COLORS.text3}
                onEndEditing={() => runCalculator(collateralSats, termDays)}
              />
              <Text style={styles.calcSuffix}>sats</Text>
            </View>


            {/* Term Selector */}
            <Text style={styles.calcLabel}>LOAN TERM</Text>
            <View style={styles.termRow}>
              {[
                { days: 30, label: '1 Month' },
                { days: 90, label: '3 Months' },
                { days: 180, label: '6 Months' },
                { days: 365, label: '1 Year' },
              ].map((t) => (
                <TouchableOpacity
                  key={t.days}
                  style={[styles.termBtn, termDays === t.days && styles.termBtnActive]}
                  onPress={() => { setTermDays(t.days); runCalculator(collateralSats, t.days); }}
                >
                  <Text style={[styles.termBtnText, termDays === t.days && styles.termBtnTextActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {calculator && (
              <View style={styles.calcResults}>
                <View style={styles.calcHighlight}>
                  <Text style={styles.calcHighlightLabel}>You receive</Text>
                  <Text style={styles.calcHighlightVal}>
                    KES {calculator.loan_amount_kes?.toLocaleString()}
                  </Text>
                </View>
                {[
                  { label: 'Collateral value', val: `KES ${calculator.collateral_kes_value?.toLocaleString()}` },
                  { label: 'BTC price', val: `KES ${calculator.btc_kes_rate?.toLocaleString()}` },
                  { label: 'Total interest', val: `KES ${calculator.total_interest_kes?.toLocaleString()}` },
                  { label: 'Total repayment', val: `KES ${calculator.total_repayment_kes?.toLocaleString()}` },
                  { label: 'Due date', val: calculator.due_date },
                ].map((item, i) => (
                  <View key={i} style={styles.calcRow}>
                    <Text style={styles.calcRowLabel}>{item.label}</Text>
                    <Text style={styles.calcRowVal}>{item.val}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* How collateral works */}
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>How it works</Text>
            {[
              { icon: '🔒', text: 'Your Bitcoin is locked in secure escrow as collateral' },
              { icon: '💸', text: 'We send KES directly to your M-Pesa' },
              { icon: '✅', text: 'Repay the loan to unlock your Bitcoin' },
              { icon: '⚠️', text: 'If you default, locked Bitcoin covers the debt' },
            ].map((item, i) => (
              <View key={i} style={styles.infoRow}>
                <Text style={styles.infoIcon}>{item.icon}</Text>
                <Text style={styles.infoText}>{item.text}</Text>
              </View>
            ))}
          </View>

          {/* Credit Score */}
          {trust && (
            <View style={styles.scoreCard}>
              <View style={styles.scoreLeft}>
                <Text style={styles.scoreVal}>{trust.score}</Text>
                <Text style={styles.scoreTier}>{trust.tier}</Text>
              </View>
              <View style={styles.scoreRight}>
                <Text style={styles.scoreStatus}>
                  ✅ Loan Eligible
                </Text>
                <Text style={styles.scoreDesc}>
                  Max loan: {trust.max_loan_sats?.toLocaleString()} sats
                </Text>
              </View>
            </View>
          )}

          {/* Apply / Locked */}
          {activeLoans.length === 0 && (
            <>
              {!showApply ? (
                <TouchableOpacity
                  style={styles.applyBtn}
                  onPress={() => setShowApply(true)}
                >
                  <Text style={styles.applyBtnText}>⚡ Get This Loan</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.applyCard}>
                  <Text style={styles.cardTitle}>Confirm Loan</Text>
                  <View style={styles.confirmSummary}>
                    <View style={styles.confirmRow}>
                      <Text style={styles.confirmLabel}>Lock collateral</Text>
                      <Text style={styles.confirmVal}>
                        {parseInt(collateralSats).toLocaleString()} sats
                      </Text>
                    </View>
                    <View style={styles.confirmRow}>
                      <Text style={styles.confirmLabel}>Receive</Text>
                      <Text style={[styles.confirmVal, { color: COLORS.orangeLight }]}>
                        KES {calculator?.loan_amount_kes?.toLocaleString()}
                      </Text>
                    </View>
                    <View style={[styles.confirmRow, { borderBottomWidth: 0 }]}>
                      <Text style={styles.confirmLabel}>Due date</Text>
                      <Text style={styles.confirmVal}>{calculator?.due_date}</Text>
                    </View>
                  </View>

                  <Text style={styles.calcLabel}>M-PESA NUMBER TO RECEIVE KES</Text>
                  <TextInput
                    style={styles.phoneInput}
                    value={mpesaPhone}
                    onChangeText={setMpesaPhone}
                    keyboardType="phone-pad"
                    placeholder="+254712345678"
                    placeholderTextColor={COLORS.text3}
                  />

                  <TouchableOpacity
                    style={styles.confirmBtn}
                    onPress={handleApply}
                    disabled={applying}
                  >
                    {applying
                      ? <ActivityIndicator color="#000" />
                      : <Text style={styles.confirmBtnText}>
                          Confirm & Lock Collateral →
                        </Text>
                    }
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => setShowApply(false)}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}



        </View>
      </ScrollView>
      <BottomNav active="Loan" onNavigate={(s) => navigation.navigate(s)} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  loadingContainer: { flex: 1, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center' },
  body: { padding: SPACING.lg, paddingBottom: 100 },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  sub: { fontSize: 13, color: COLORS.text2, marginBottom: SPACING.lg },
  activeLoanCard: { backgroundColor: '#1A0A0A', borderWidth: 1, borderColor: 'rgba(192,57,43,0.4)', borderRadius: RADIUS.xl, padding: SPACING.md, marginBottom: SPACING.md },
  activeLoanHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  activeLoanLabel: { fontSize: 9, color: COLORS.red, letterSpacing: 2 },
  activeBadge: { backgroundColor: 'rgba(74,158,255,0.15)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 },
  activeBadgeText: { fontSize: 10, color: COLORS.blue, fontWeight: '600' },
  activeLoanAmount: { fontSize: 32, fontWeight: '800', color: COLORS.text, marginBottom: 14 },
  activeLoanDetails: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  activeLoanDetail: { flex: 1 },
  detailLabel: { fontSize: 9, color: COLORS.text3, marginBottom: 3 },
  detailVal: { fontSize: 12, color: COLORS.text, fontWeight: '600' },
  repayBtn: { backgroundColor: COLORS.orange, borderRadius: RADIUS.lg, padding: 12, alignItems: 'center' },
  repayBtnText: { color: '#000', fontWeight: '700', fontSize: 13 },
  calculatorCard: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.xl, padding: SPACING.md, marginBottom: SPACING.md },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.md },
  calcLabel: { fontSize: 9, color: COLORS.text3, letterSpacing: 2, marginBottom: SPACING.sm },
  calcInputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bg3, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg, marginBottom: SPACING.md, overflow: 'hidden' },
  calcPrefix: { fontSize: 18, color: COLORS.orange, paddingHorizontal: 14, paddingVertical: 12, borderRightWidth: 1, borderRightColor: COLORS.border },
  calcInput: { flex: 1, fontSize: 22, fontWeight: '700', color: COLORS.text, padding: 12 },
  calcSuffix: { fontSize: 11, color: COLORS.text3, paddingHorizontal: 12 },
  calcResults: { backgroundColor: COLORS.bg3, borderRadius: RADIUS.lg, overflow: 'hidden' },
  calcHighlight: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: 'rgba(200,146,42,0.08)' },
  calcHighlightLabel: { fontSize: 13, color: COLORS.text2 },
  calcHighlightVal: { fontSize: 22, fontWeight: '800', color: COLORS.orangeLight },
  calcRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  calcRowLabel: { fontSize: 12, color: COLORS.text2 },
  calcRowVal: { fontSize: 12, color: COLORS.text, fontWeight: '600' },
  infoCard: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.xl, padding: SPACING.md, marginBottom: SPACING.md },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  infoIcon: { fontSize: 16, marginTop: 1 },
  infoText: { flex: 1, fontSize: 13, color: COLORS.text2, lineHeight: 19 },
  scoreCard: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.xl, padding: SPACING.md, marginBottom: SPACING.md },
  scoreLeft: { alignItems: 'center', paddingRight: 16, borderRightWidth: 1, borderRightColor: COLORS.border },
  scoreVal: { fontSize: 40, fontWeight: '800', color: COLORS.gold },
  scoreTier: { fontSize: 11, color: COLORS.text2 },
  scoreRight: { flex: 1 },
  scoreStatus: { fontSize: 13, color: COLORS.text, fontWeight: '600', marginBottom: 4 },
  scoreDesc: { fontSize: 11, color: COLORS.text2 },
  applyBtn: { backgroundColor: COLORS.orange, borderRadius: RADIUS.lg, padding: 18, alignItems: 'center', marginBottom: SPACING.md },
  applyBtnText: { color: '#000', fontWeight: '800', fontSize: 16 },
  applyCard: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.xl, padding: SPACING.md, marginBottom: SPACING.md },
  confirmSummary: { backgroundColor: COLORS.bg3, borderRadius: RADIUS.lg, overflow: 'hidden', marginBottom: SPACING.md },
  confirmRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  confirmLabel: { fontSize: 12, color: COLORS.text2 },
  confirmVal: { fontSize: 13, color: COLORS.text, fontWeight: '700' },
  phoneInput: { backgroundColor: COLORS.bg3, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg, padding: 14, color: COLORS.text, fontSize: 15, marginBottom: SPACING.md },
  confirmBtn: { backgroundColor: COLORS.orange, borderRadius: RADIUS.lg, padding: 16, alignItems: 'center', marginBottom: 10 },
  confirmBtnText: { color: '#000', fontWeight: '700', fontSize: 14 },
  cancelBtn: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg, padding: 14, alignItems: 'center' },
  cancelBtnText: { color: COLORS.text2, fontSize: 13 },
  lockedCard: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.xl, padding: SPACING.lg, alignItems: 'center' },
  lockedTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  lockedDesc: { fontSize: 13, color: COLORS.text2, textAlign: 'center', lineHeight: 20, marginBottom: 12 },
  lockedScore: { fontSize: 12, color: COLORS.orange, fontWeight: '600' },
  termRow: { flexDirection: 'row', gap: 8, marginBottom: SPACING.md },
  termBtn: { flex: 1, backgroundColor: COLORS.bg3, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg, padding: 10, alignItems: 'center' },
  termBtnActive: { backgroundColor: 'rgba(200,146,42,0.15)', borderColor: COLORS.orange },
  termBtnText: { fontSize: 11, color: COLORS.text2, fontWeight: '600' },
  termBtnTextActive: { color: COLORS.orange },
});
