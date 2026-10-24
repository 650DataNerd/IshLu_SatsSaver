import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { api } from '../services/api';

export const RepayScreen = ({ navigation, route }: any) => {
  const { loanId } = route.params || {};
  const [loan, setLoan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [repaying, setRepaying] = useState(false);

  useEffect(() => {
    loadLoan();
  }, []);

  const loadLoan = async () => {
    try {
      const res = await api.get('/loans/my-loans');
      const active = res.data.find((l: any) =>
        loanId ? l.id === loanId : l.status === 'active'
      );
      setLoan(active || null);
    } catch (e: any) {
      if (e.response?.status === 401) navigation.replace('Onboarding');
    } finally {
      setLoading(false);
    }
  };

  const totalOwed = loan
    ? loan.total_repayment_kes || (loan.disbursed_kes + Math.round(loan.disbursed_kes * (0.1149 * (loan.term_days || 30) / 365)))
    : 0;

  const repaidKes = loan ? Math.round((loan.repaid_sats || 0) / 7.5) : 0;
  const remainingKes = Math.max(0, totalOwed - repaidKes);
  const progressPct = totalOwed > 0 ? Math.min((repaidKes / totalOwed) * 100, 100) : 0;
  const isOverdue = loan ? new Date(loan.due_date) < new Date() : false;

  const handleRepay = async () => {
    if (!loan) return;

    Alert.alert(
      'Confirm Repayment',
      `You are repaying KES ${remainingKes.toLocaleString()} (full remaining balance including interest).\n\nYour ${loan.collateral_sats?.toLocaleString()} sats will be unlocked immediately after payment.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setRepaying(true);
            try {
              const res = await api.post('/loans/repay', {
                loan_id: loan.id,
                amount_kes: remainingKes,
              });

              if (res.data.fully_repaid) {
                Alert.alert(
                  '✅ Loan Repaid!',
                  `Your ${loan.collateral_sats?.toLocaleString()} sats have been unlocked and returned to your collateral vault.`,
                  [{ text: 'Back to Dashboard', onPress: () => navigation.navigate('Dashboard') }]
                );
              } else {
                Alert.alert(
                  'Partial Payment Recorded',
                  `KES ${remainingKes.toLocaleString()} remaining.`,
                  [{ text: 'OK', onPress: () => loadLoan() }]
                );
              }
            } catch (e: any) {
              Alert.alert('Error', e.response?.data?.detail || 'Could not process repayment');
            } finally {
              setRepaying(false);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.orange} />
      </View>
    );
  }

  if (!loan) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>✅</Text>
          <Text style={styles.emptyTitle}>No active loans</Text>
          <Text style={styles.emptySub}>You have no outstanding loans to repay.</Text>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.navigate('Dashboard')}
          >
            <Text style={styles.backBtnText}>Back to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.body}>

          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Repay Loan</Text>
          <Text style={styles.sub}>Repay to unlock your Bitcoin collateral</Text>

          {/* Loan summary */}
          <View style={[styles.loanCard, isOverdue && styles.loanCardOverdue]}>
            {isOverdue && (
              <View style={styles.overdueTag}>
                <Text style={styles.overdueTagText}>⚠️ OVERDUE</Text>
              </View>
            )}
            <Text style={styles.loanLabel}>ORIGINAL LOAN</Text>
            <Text style={styles.loanAmount}>
              KES {loan.disbursed_kes?.toLocaleString()}
            </Text>
            <View style={styles.loanDetails}>
              <View style={styles.loanDetail}>
                <Text style={styles.detailLabel}>Collateral locked</Text>
                <Text style={styles.detailVal}>
                  {loan.collateral_sats?.toLocaleString()} sats
                </Text>
              </View>
              <View style={styles.loanDetail}>
                <Text style={styles.detailLabel}>Due date</Text>
                <Text style={[styles.detailVal, isOverdue && { color: COLORS.red }]}>
                  {loan.due_date}
                </Text>
              </View>
              <View style={styles.loanDetail}>
                <Text style={styles.detailLabel}>Interest rate</Text>
                <Text style={styles.detailVal}>11.49% APR</Text>
              </View>
            </View>
          </View>

          {/* Repayment breakdown */}
          <View style={styles.breakdownCard}>
            <Text style={styles.breakdownTitle}>Repayment Breakdown</Text>
            {[
              { label: 'Principal', val: `KES ${loan.disbursed_kes?.toLocaleString()}` },
              { label: 'Interest', val: `KES ${(totalOwed - loan.disbursed_kes).toLocaleString()}` },
              { label: 'Already paid', val: `-KES ${repaidKes.toLocaleString()}`, color: COLORS.greenLight },
            ].map((item, i) => (
              <View key={i} style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>{item.label}</Text>
                <Text style={[styles.breakdownVal, item.color ? { color: item.color } : {}]}>
                  {item.val}
                </Text>
              </View>
            ))}
            <View style={styles.breakdownDivider} />
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownTotalLabel}>Total Remaining</Text>
              <Text style={styles.breakdownTotalVal}>
                KES {remainingKes.toLocaleString()}
              </Text>
            </View>
          </View>

          {/* Progress */}
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Repayment Progress</Text>
              <Text style={styles.progressPct}>{Math.round(progressPct)}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
            </View>
            <Text style={styles.progressSub}>
              KES {repaidKes.toLocaleString()} paid of KES {totalOwed.toLocaleString()} total
            </Text>
          </View>

          {/* What you get back */}
          <View style={styles.rewardCard}>
            <Text style={styles.rewardTitle}>After full repayment you get back</Text>
            <Text style={styles.rewardAmount}>
              {loan.collateral_sats?.toLocaleString()} sats
            </Text>
            <Text style={styles.rewardSub}>
              ≈ KES {Math.round(loan.collateral_sats / 7.5).toLocaleString()} at current rate
            </Text>
          </View>

          {/* Repay button */}
          <TouchableOpacity
            style={[styles.repayBtn, repaying && styles.repayBtnDisabled]}
            onPress={handleRepay}
            disabled={repaying || remainingKes <= 0}
          >
            {repaying
              ? <ActivityIndicator color="#000" />
              : <Text style={styles.repayBtnText}>
                  Repay KES {remainingKes.toLocaleString()} →
                </Text>
            }
          </TouchableOpacity>

          <Text style={styles.repayNote}>
            Repayment is processed immediately. Your sats are unlocked upon full repayment.
          </Text>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  loadingContainer: { flex: 1, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  emptyIcon: { fontSize: 52, marginBottom: SPACING.lg },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
  emptySub: { fontSize: 13, color: COLORS.text2, textAlign: 'center', marginBottom: SPACING.xl },
  backBtn: { backgroundColor: COLORS.orange, borderRadius: RADIUS.lg, paddingHorizontal: 24, paddingVertical: 14 },
  backBtnText: { color: '#000', fontWeight: '700', fontSize: 14 },
  body: { padding: SPACING.lg, paddingBottom: 60 },
  back: { marginBottom: SPACING.lg },
  backText: { color: COLORS.text3, fontSize: 14 },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  sub: { fontSize: 13, color: COLORS.text2, marginBottom: SPACING.lg },
  loanCard: { backgroundColor: '#1A0A0A', borderWidth: 1, borderColor: 'rgba(192,57,43,0.3)', borderRadius: RADIUS.xl, padding: SPACING.md, marginBottom: SPACING.md },
  loanCardOverdue: { borderColor: COLORS.red, borderWidth: 2 },
  overdueTag: { backgroundColor: 'rgba(192,57,43,0.15)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 10 },
  overdueTagText: { fontSize: 10, color: COLORS.red, fontWeight: '700', letterSpacing: 1 },
  loanLabel: { fontSize: 9, color: COLORS.text3, letterSpacing: 2, marginBottom: 6 },
  loanAmount: { fontSize: 32, fontWeight: '800', color: COLORS.text, marginBottom: 14 },
  loanDetails: { flexDirection: 'row', gap: 8 },
  loanDetail: { flex: 1 },
  detailLabel: { fontSize: 9, color: COLORS.text3, marginBottom: 3 },
  detailVal: { fontSize: 12, color: COLORS.text, fontWeight: '600' },
  breakdownCard: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.xl, padding: SPACING.md, marginBottom: SPACING.md },
  breakdownTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.md },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  breakdownLabel: { fontSize: 13, color: COLORS.text2 },
  breakdownVal: { fontSize: 13, color: COLORS.text, fontWeight: '600' },
  breakdownDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 10 },
  breakdownTotalLabel: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  breakdownTotalVal: { fontSize: 18, fontWeight: '800', color: COLORS.orangeLight },
  progressCard: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.xl, padding: SPACING.md, marginBottom: SPACING.md },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  progressLabel: { fontSize: 13, color: COLORS.text2 },
  progressPct: { fontSize: 14, fontWeight: '800', color: COLORS.orange },
  progressTrack: { height: 8, backgroundColor: COLORS.bg3, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: 8, backgroundColor: COLORS.greenLight, borderRadius: 4 },
  progressSub: { fontSize: 11, color: COLORS.text3 },
  rewardCard: { backgroundColor: 'rgba(42,92,53,0.12)', borderWidth: 1, borderColor: 'rgba(42,92,53,0.3)', borderRadius: RADIUS.xl, padding: SPACING.md, marginBottom: SPACING.lg, alignItems: 'center' },
  rewardTitle: { fontSize: 12, color: COLORS.text2, marginBottom: 8 },
  rewardAmount: { fontSize: 28, fontWeight: '800', color: COLORS.greenLight, marginBottom: 4 },
  rewardSub: { fontSize: 11, color: COLORS.text3 },
  repayBtn: { backgroundColor: COLORS.orange, borderRadius: RADIUS.lg, padding: 18, alignItems: 'center', marginBottom: 12 },
  repayBtnDisabled: { opacity: 0.5 },
  repayBtnText: { color: '#000', fontWeight: '800', fontSize: 16 },
  repayNote: { fontSize: 11, color: COLORS.text3, textAlign: 'center', lineHeight: 17 },
});
