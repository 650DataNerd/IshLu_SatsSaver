import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomNav } from '../components/BottomNav';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { api } from '../services/api';

const formatDate = (iso: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const ActivityScreen = ({ navigation }: any) => {
  const [loans, setLoans] = useState<any[]>([]);
  const [trust, setTrust] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const [loansRes, trustRes] = await Promise.all([
        api.get('/loans/my-loans'),
        api.get('/trust/score'),
      ]);
      setLoans(loansRes.data || []);
      setTrust(trustRes.data);
    } catch (e: any) {
      if (e.response?.status === 401) navigation.replace('Onboarding');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const activeLoans = loans.filter(l => l.status === 'active');
  const repaidLoans = loans.filter(l => l.status === 'repaid');
  const totalBorrowed = loans.reduce((s, l) => s + (l.disbursed_kes || 0), 0);

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
          <Text style={styles.title}>Loan History</Text>
          <Text style={styles.sub}>Your complete borrowing record</Text>

          {/* Summary stats */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statVal}>{loans.length}</Text>
              <Text style={styles.statLbl}>Total Loans</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statVal, { color: COLORS.orangeLight }]}>
                {totalBorrowed > 0 ? `KES ${totalBorrowed.toLocaleString()}` : '—'}
              </Text>
              <Text style={styles.statLbl}>Total Borrowed</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statVal, { color: COLORS.greenLight }]}>
                {repaidLoans.length}
              </Text>
              <Text style={styles.statLbl}>Repaid</Text>
            </View>
          </View>

          {/* Credit Score */}
          {trust && (
            <View style={styles.scoreCard}>
              <View style={styles.scoreLeft}>
                <Text style={styles.scoreNumber}>{trust.score}</Text>
                <Text style={styles.scoreTier}>{trust.tier}</Text>
              </View>
              <View style={styles.scoreRight}>
                <Text style={styles.scoreTitle}>Credit Score</Text>
                <Text style={styles.scoreDesc}>{trust.ai_explanation}</Text>
              </View>
            </View>
          )}

          {/* Active Loans */}
          {activeLoans.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>ACTIVE</Text>
              {activeLoans.map((loan, i) => (
                <View key={i} style={styles.activeLoanCard}>
                  <View style={styles.loanHeader}>
                    <Text style={styles.loanAmount}>
                      KES {loan.disbursed_kes?.toLocaleString()}
                    </Text>
                    <View style={styles.activeBadge}>
                      <Text style={styles.activeBadgeText}>Active</Text>
                    </View>
                  </View>
                  <View style={styles.loanDetails}>
                    <View style={styles.loanDetail}>
                      <Text style={styles.detailLabel}>Collateral locked</Text>
                      <Text style={styles.detailVal}>
                        {loan.collateral_sats?.toLocaleString()} sats
                      </Text>
                    </View>
                    <View style={styles.loanDetail}>
                      <Text style={styles.detailLabel}>Due date</Text>
                      <Text style={[styles.detailVal, { color: COLORS.red }]}>
                        {loan.due_date}
                      </Text>
                    </View>
                    <View style={styles.loanDetail}>
                      <Text style={styles.detailLabel}>Rate</Text>
                      <Text style={styles.detailVal}>11.49% APR</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.repayBtn}
                    onPress={() => navigation.navigate('Repay', { loanId: loan.id })}
                  >
                    <Text style={styles.repayBtnText}>Repay Loan →</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )}

          {/* Repaid Loans */}
          {repaidLoans.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>COMPLETED</Text>
              {repaidLoans.map((loan, i) => (
                <View key={i} style={styles.repaidLoanCard}>
                  <View style={styles.loanHeader}>
                    <Text style={styles.loanAmount}>
                      KES {loan.disbursed_kes?.toLocaleString()}
                    </Text>
                    <View style={styles.repaidBadge}>
                      <Text style={styles.repaidBadgeText}>✓ Repaid</Text>
                    </View>
                  </View>
                  <View style={styles.loanDetails}>
                    <View style={styles.loanDetail}>
                      <Text style={styles.detailLabel}>Collateral returned</Text>
                      <Text style={[styles.detailVal, { color: COLORS.greenLight }]}>
                        {loan.collateral_sats?.toLocaleString()} sats
                      </Text>
                    </View>
                    <View style={styles.loanDetail}>
                      <Text style={styles.detailLabel}>Closed</Text>
                      <Text style={styles.detailVal}>
                        {formatDate(loan.updated_at || loan.created_at)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </>
          )}

          {/* Empty state */}
          {loans.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>⚡</Text>
              <Text style={styles.emptyTitle}>No loans yet</Text>
              <Text style={styles.emptySub}>
                Get your first Bitcoin-backed loan. Lock sats, receive KES instantly.
              </Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => navigation.navigate('Loan')}
              >
                <Text style={styles.emptyBtnText}>Get a Loan →</Text>
              </TouchableOpacity>
            </View>
          )}

        </View>
      </ScrollView>
      <BottomNav active="Activity" onNavigate={(s) => navigation.navigate(s)} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  loadingContainer: { flex: 1, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center' },
  body: { padding: SPACING.lg, paddingBottom: 100 },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  sub: { fontSize: 13, color: COLORS.text2, marginBottom: SPACING.lg },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: SPACING.lg },
  statCard: { flex: 1, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg, padding: SPACING.md, alignItems: 'center' },
  statVal: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  statLbl: { fontSize: 9, color: COLORS.text3, textAlign: 'center' },
  scoreCard: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.xl, padding: SPACING.md, marginBottom: SPACING.lg },
  scoreLeft: { alignItems: 'center', paddingRight: 16, borderRightWidth: 1, borderRightColor: COLORS.border },
  scoreNumber: { fontSize: 40, fontWeight: '800', color: COLORS.gold },
  scoreTier: { fontSize: 11, color: COLORS.text2 },
  scoreRight: { flex: 1 },
  scoreTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  scoreDesc: { fontSize: 12, color: COLORS.text2, lineHeight: 17 },
  sectionTitle: { fontSize: 10, color: COLORS.text3, letterSpacing: 2, marginBottom: 10 },
  activeLoanCard: { backgroundColor: '#1A0A0A', borderWidth: 1, borderColor: 'rgba(192,57,43,0.3)', borderRadius: RADIUS.xl, padding: SPACING.md, marginBottom: 12 },
  repaidLoanCard: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.xl, padding: SPACING.md, marginBottom: 12, opacity: 0.8 },
  loanHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  loanAmount: { fontSize: 24, fontWeight: '800', color: COLORS.text },
  activeBadge: { backgroundColor: 'rgba(74,158,255,0.15)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  activeBadgeText: { fontSize: 10, color: COLORS.blue, fontWeight: '600' },
  repaidBadge: { backgroundColor: 'rgba(61,138,74,0.15)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  repaidBadgeText: { fontSize: 10, color: COLORS.greenLight, fontWeight: '600' },
  loanDetails: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  loanDetail: { flex: 1 },
  detailLabel: { fontSize: 9, color: COLORS.text3, marginBottom: 3 },
  detailVal: { fontSize: 12, color: COLORS.text, fontWeight: '600' },
  repayBtn: { backgroundColor: COLORS.orange, borderRadius: RADIUS.lg, padding: 12, alignItems: 'center' },
  repayBtnText: { color: '#000', fontWeight: '700', fontSize: 13 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 52, marginBottom: SPACING.lg },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
  emptySub: { fontSize: 13, color: COLORS.text2, textAlign: 'center', lineHeight: 20, marginBottom: SPACING.xl, maxWidth: 280 },
  emptyBtn: { backgroundColor: COLORS.orange, borderRadius: RADIUS.lg, paddingHorizontal: 28, paddingVertical: 14 },
  emptyBtnText: { color: '#000', fontWeight: '700', fontSize: 15 },
});
