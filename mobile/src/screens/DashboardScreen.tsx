import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, RefreshControl, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BottomNav } from '../components/BottomNav';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { api } from '../services/api';

export const DashboardScreen = ({ navigation }: any) => {
  const [userName, setUserName] = useState('');
  const [balance, setBalance] = useState({ total_in_goals_sats: 0 });
  const [trust, setTrust] = useState<any>(null);
  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const name = await AsyncStorage.getItem('user_name');
      if (name) setUserName(name);
      const [balRes, trustRes, loansRes] = await Promise.all([
        api.get('/savings/balance'),
        api.get('/trust/score'),
        api.get('/loans/my-loans'),
      ]);
      setBalance(balRes.data);
      setTrust(trustRes.data);
      setLoans(loansRes.data?.filter((l: any) => l.status === 'active') || []);
    } catch (e: any) {
      if (e.response?.status === 401) navigation.replace('Onboarding');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const firstName = userName ? userName.split(' ')[0] : 'there';
  const totalSats = balance.total_in_goals_sats;
  const loanCapacityKes = Math.round((totalSats / 7.5) * 0.67);
  const activeLoans = loans.filter(l => l.status === 'active');

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.orange} />
        <Text style={styles.loadingText}>Loading your portfolio...</Text>
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
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>{getGreeting()}, {firstName} 👋</Text>
            </View>
            <TouchableOpacity
              style={styles.profileBtn}
              onPress={() => navigation.navigate('Profile')}
            >
              <Text style={styles.profileInitial}>
                {firstName[0]?.toUpperCase() || '₿'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Loan Capacity Card */}
          <View style={styles.capacityCard}>
            <Text style={styles.capacityEyebrow}>AVAILABLE TO BORROW</Text>
            <Text style={styles.capacityAmount}>
              {loanCapacityKes > 0
                ? `KES ${loanCapacityKes.toLocaleString()}`
                : '—'
              }
            </Text>
            <Text style={styles.capacitySub}>
              {totalSats > 0
                ? `Backed by ${totalSats.toLocaleString()} sats`
                : 'Deposit Bitcoin to unlock borrowing capacity'
              }
            </Text>
            <TouchableOpacity
              style={styles.capacityBtn}
              onPress={() => navigation.navigate(totalSats > 0 ? 'Loan' : 'Deposit')}
            >
              <Text style={styles.capacityBtnText}>
                {totalSats > 0 ? '⚡ Get a Loan' : '+ Deposit Bitcoin'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Active Loan Alert */}
        {activeLoans.length > 0 && (
          <TouchableOpacity
            style={styles.activeLoanBanner}
            onPress={() => navigation.navigate('Loan')}
          >
            <View>
              <Text style={styles.activeLoanLabel}>ACTIVE LOAN</Text>
              <Text style={styles.activeLoanAmount}>
                KES {activeLoans[0].disbursed_kes?.toLocaleString()}
              </Text>
              <Text style={styles.activeLoanMeta}>
                Due {activeLoans[0].due_date}
              </Text>
            </View>
            <Text style={styles.activeLoanArrow}>Repay →</Text>
          </TouchableOpacity>
        )}

        {/* Quick Actions */}
        <View style={styles.actionsRow}>
          {[
            { icon: '⚡', label: 'Get Loan', screen: 'Loan' },
            { icon: '₿', label: 'Deposit BTC', screen: 'Deposit' },
            { icon: '📊', label: 'History', screen: 'Activity' },
            { icon: '👤', label: 'Profile', screen: 'Profile' },
          ].map((a) => (
            <TouchableOpacity
              key={a.label}
              style={styles.actionBtn}
              onPress={() => navigation.navigate(a.screen)}
            >
              <Text style={styles.actionIcon}>{a.icon}</Text>
              <Text style={styles.actionLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Trust Score */}
        {trust && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Credit Score</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
                <Text style={styles.sectionLink}>Details →</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.scoreCard}>
              <View style={styles.scoreLeft}>
                <Text style={styles.scoreNumber}>{trust.score}</Text>
                <Text style={styles.scoreTier}>{trust.tier}</Text>
              </View>
              <View style={styles.scoreRight}>
                <Text style={styles.scoreDesc}>{trust.ai_explanation?.slice(0, 100)}...</Text>
                <View style={styles.scoreBadge}>
                  <Text style={styles.scoreBadgeText}>✓ Loan Eligible</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Loan History Preview */}
        <View style={[styles.section, { paddingBottom: 100 }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Activity')}>
              <Text style={styles.sectionLink}>See all →</Text>
            </TouchableOpacity>
          </View>
          {loans.length === 0 ? (
            <View style={styles.emptyActivity}>
              <Text style={styles.emptyActivityText}>
                No loan activity yet. Get your first Bitcoin-backed loan.
              </Text>
              <TouchableOpacity
                style={styles.emptyActivityBtn}
                onPress={() => navigation.navigate(totalSats > 0 ? 'Loan' : 'Deposit')}
              >
                <Text style={styles.emptyActivityBtnText}>Get a Loan →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            loans.slice(0, 3).map((loan, i) => (
              <View key={i} style={styles.loanItem}>
                <View style={styles.loanItemIcon}>
                  <Text style={{ fontSize: 18 }}>⚡</Text>
                </View>
                <View style={styles.loanItemInfo}>
                  <Text style={styles.loanItemTitle}>Bitcoin-Backed Loan</Text>
                  <Text style={styles.loanItemDate}>Due {loan.due_date}</Text>
                </View>
                <Text style={styles.loanItemAmount}>
                  KES {loan.disbursed_kes?.toLocaleString()}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <BottomNav active="Dashboard" onNavigate={(s) => navigation.navigate(s)} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  loadingContainer: { flex: 1, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: COLORS.text2, fontSize: 13 },
  header: { backgroundColor: '#050805', padding: SPACING.lg, paddingBottom: SPACING.xl },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg },
  greeting: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  userName: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  profileBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.greenDim, borderWidth: 1, borderColor: COLORS.green, alignItems: 'center', justifyContent: 'center' },
  profileInitial: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  capacityCard: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.orange, borderRadius: RADIUS.xxl, padding: SPACING.lg },
  capacityEyebrow: { fontSize: 10, color: COLORS.text3, letterSpacing: 2, marginBottom: 8 },
  capacityAmount: { fontSize: 42, fontWeight: '800', color: COLORS.text, lineHeight: 46, marginBottom: 6 },
  capacitySub: { fontSize: 11, color: COLORS.text2, fontFamily: 'Courier', marginBottom: 16, lineHeight: 16 },
  capacityBtn: { backgroundColor: COLORS.orange, borderRadius: RADIUS.lg, padding: 14, alignItems: 'center' },
  capacityBtnText: { color: '#000', fontWeight: '700', fontSize: 14 },
  activeLoanBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(192,57,43,0.08)', borderWidth: 1, borderColor: 'rgba(192,57,43,0.25)', borderRadius: RADIUS.lg, margin: SPACING.md, padding: SPACING.md },
  activeLoanLabel: { fontSize: 9, color: COLORS.red, letterSpacing: 2, marginBottom: 4 },
  activeLoanAmount: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  activeLoanMeta: { fontSize: 11, color: COLORS.text2, marginTop: 2 },
  activeLoanArrow: { fontSize: 13, color: COLORS.orange, fontWeight: '600' },
  actionsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: SPACING.md, marginBottom: SPACING.md },
  actionBtn: { flex: 1, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg, padding: 14, alignItems: 'center', gap: 5 },
  actionIcon: { fontSize: 20 },
  actionLabel: { fontSize: 9, color: COLORS.text2 },
  section: { paddingHorizontal: SPACING.md, marginBottom: SPACING.md },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  sectionLink: { fontSize: 12, color: COLORS.orange },
  scoreCard: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.xl, padding: SPACING.md, flexDirection: 'row', gap: 16 },
  scoreLeft: { alignItems: 'center', justifyContent: 'center', paddingRight: 16, borderRightWidth: 1, borderRightColor: COLORS.border },
  scoreNumber: { fontSize: 46, fontWeight: '800', color: COLORS.gold, lineHeight: 50 },
  scoreTier: { fontSize: 11, color: COLORS.text2, marginTop: 2 },
  scoreRight: { flex: 1 },
  scoreDesc: { fontSize: 12, color: COLORS.text2, lineHeight: 18, marginBottom: 10 },
  scoreBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', backgroundColor: 'rgba(61,138,74,0.15)' },
  scoreBadgeText: { fontSize: 11, fontWeight: '600', color: COLORS.greenLight },
  emptyActivity: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.xl, padding: SPACING.xl, alignItems: 'center' },
  emptyActivityText: { fontSize: 13, color: COLORS.text2, textAlign: 'center', lineHeight: 20, marginBottom: SPACING.lg },
  emptyActivityBtn: { backgroundColor: COLORS.orange, borderRadius: RADIUS.lg, paddingHorizontal: 24, paddingVertical: 12 },
  emptyActivityBtnText: { color: '#000', fontWeight: '700', fontSize: 13 },
  loanItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  loanItemIcon: { width: 38, height: 38, borderRadius: 11, backgroundColor: 'rgba(200,146,42,0.15)', alignItems: 'center', justifyContent: 'center' },
  loanItemInfo: { flex: 1 },
  loanItemTitle: { fontSize: 13, fontWeight: '500', color: COLORS.text },
  loanItemDate: { fontSize: 10, color: COLORS.text3, marginTop: 2 },
  loanItemAmount: { fontSize: 13, color: COLORS.orangeLight, fontWeight: '600' },
});
