import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator, TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { SatsTree } from '../components/SatsTree';
import { BottomNav } from '../components/BottomNav';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { api } from '../services/api';

const QUICK_AMOUNTS = [50, 100, 500, 1000];
const KES_TO_SATS = 7.5;

export const SaveScreen = ({ navigation }: any) => {
  const [amount, setAmount] = useState('500');
  const [method, setMethod] = useState<'mpesa' | 'lightning'>('mpesa');
  const [goals, setGoals] = useState<any[]>([]);
  const [selectedGoal, setSelectedGoal] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [invoice, setInvoice] = useState('');
  const [checkoutRequestId, setCheckoutRequestId] = useState('');
  const [mpesaSent, setMpesaSent] = useState(false);

  useEffect(() => { loadGoals(); }, []);

  const loadGoals = async () => {
    try {
      const res = await api.get('/savings/goals');
      const active = res.data.filter((g: any) => g.status === 'active');
      setGoals(active);
      if (active.length > 0) setSelectedGoal(active[0]);
    } catch {}
  };

  const numAmount = parseInt(amount || '0');
  const satsEquiv = Math.round(numAmount * KES_TO_SATS);
  const treeProgress = selectedGoal
    ? Math.min(selectedGoal.current_sats / selectedGoal.target_sats, 1.0)
    : 0.05;

  const isValidAmount = numAmount >= 10;

  const handleMpesaDeposit = async () => {
    if (!selectedGoal) { Alert.alert('Select a goal first'); return; }
    if (!isValidAmount) { Alert.alert('Minimum amount is KES 10'); return; }
    setLoading(true);
    try {
      const res = await api.post('/savings/deposit/mpesa', {
        goal_id: selectedGoal.id,
        amount_kes: numAmount,
      });
      setCheckoutRequestId(res.data.checkout_request_id);
      setMpesaSent(true);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Could not initiate M-Pesa');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyMpesa = async () => {
    if (!checkoutRequestId || !selectedGoal) return;
    setVerifying(true);
    try {
      const res = await api.post('/savings/deposit/mpesa/verify', {
        checkout_request_id: checkoutRequestId,
        goal_id: selectedGoal.id,
        amount_kes: numAmount,
      });
      if (res.data.paid) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          '🌱 Saved!',
          `KES ${numAmount} → ${satsEquiv.toLocaleString()} sats added to ${selectedGoal.name}`,
          [{ text: 'View Dashboard', onPress: () => navigation.navigate('Dashboard') }]
        );
        setMpesaSent(false);
        setCheckoutRequestId('');
        loadGoals();
      } else {
        Alert.alert('Not confirmed yet', res.data.message || 'Try again in a moment.');
      }
    } catch {
      Alert.alert('Error', 'Could not verify payment');
    } finally {
      setVerifying(false);
    }
  };

  const handleLightningDeposit = async () => {
    if (!selectedGoal) { Alert.alert('Select a goal first'); return; }
    if (satsEquiv < 1) { Alert.alert('Enter a valid amount'); return; }
    setLoading(true);
    try {
      const res = await api.post('/savings/deposit/lightning', {
        goal_id: selectedGoal.id,
        amount_sats: satsEquiv,
      });
      setInvoice(res.data.bolt11);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Could not create invoice');
    } finally {
      setLoading(false);
    }
  };

  // M-Pesa confirmation screen
  if (mpesaSent) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.confirmScreen}>
          <Text style={styles.confirmEmoji}>📱</Text>
          <Text style={styles.confirmTitle}>Check Your Phone</Text>
          <Text style={styles.confirmSub}>
            Enter your M-Pesa PIN to complete the payment.
          </Text>
          <View style={styles.confirmDetails}>
            <View style={styles.confirmRow}>
              <Text style={styles.confirmLabel}>You pay</Text>
              <Text style={styles.confirmVal}>KES {numAmount.toLocaleString()}</Text>
            </View>
            <View style={styles.confirmRow}>
              <Text style={styles.confirmLabel}>You receive</Text>
              <Text style={[styles.confirmVal, { color: COLORS.orange }]}>
                {satsEquiv.toLocaleString()} sats
              </Text>
            </View>
            <View style={styles.confirmRow}>
              <Text style={styles.confirmLabel}>Rate</Text>
              <Text style={styles.confirmVal}>KES 1 = {KES_TO_SATS} sats</Text>
            </View>
            <View style={[styles.confirmRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.confirmLabel}>Goal</Text>
              <Text style={styles.confirmVal}>{selectedGoal?.name}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.verifyBtn}
            onPress={handleVerifyMpesa}
            disabled={verifying}
          >
            {verifying
              ? <ActivityIndicator color="#000" />
              : <Text style={styles.verifyBtnText}>✓ I've Paid — Confirm</Text>
            }
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => { setMpesaSent(false); setCheckoutRequestId(''); }}
          >
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.body}>
          <Text style={styles.title}>Save Money 🌱</Text>
          <Text style={styles.sub}>Every shilling saved grows your tree</Text>

          {/* Tree Preview */}
          <View style={styles.treePreview}>
            <SatsTree progress={treeProgress} width={72} height={88} />
            <View style={styles.treeInfo}>
              <Text style={styles.treeName}>{selectedGoal?.name || 'Select a goal'}</Text>
              {selectedGoal && (
                <>
                  <Text style={styles.treeSub}>
                    {selectedGoal.current_sats.toLocaleString()} / {selectedGoal.target_sats.toLocaleString()} sats
                  </Text>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${treeProgress * 100}%` }]} />
                  </View>
                </>
              )}
            </View>
          </View>

          {/* Flexible Amount Input */}
          <View style={styles.amountCard}>
            <Text style={styles.amountLabel}>AMOUNT TO SAVE (KES)</Text>
            <View style={styles.amountInputRow}>
              <Text style={styles.amountPrefix}>KES</Text>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholder="Enter amount"
                placeholderTextColor={COLORS.text3}
                maxLength={7}
              />
            </View>
            <Text style={styles.satsEquiv}>
              ≈ {satsEquiv.toLocaleString()} sats · Rate: KES 1 = {KES_TO_SATS} sats
            </Text>
            {/* Quick amounts */}
            <View style={styles.quickAmounts}>
              {QUICK_AMOUNTS.map((a) => (
                <TouchableOpacity
                  key={a}
                  style={[styles.quickChip, numAmount === a && styles.quickChipActive]}
                  onPress={() => { setAmount(String(a)); Haptics.selectionAsync(); }}
                >
                  <Text style={[styles.quickChipText, numAmount === a && styles.quickChipTextActive]}>
                    {a >= 1000 ? `${a / 1000}K` : a}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.minNote}>Minimum: KES 10</Text>
          </View>

          {/* How conversion works */}
          <View style={styles.conversionCard}>
            <Text style={styles.conversionTitle}>💱 How it works</Text>
            <Text style={styles.conversionText}>
              You pay in KES via M-Pesa. We convert to sats (Bitcoin units) at the daily market rate. Your savings grow in value as Bitcoin appreciates — protecting you from KES inflation.
            </Text>
          </View>

          {/* Goal Selector */}
          <Text style={styles.sectionLabel}>SAVE TO GOAL</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.goalScroll}>
            {goals.map((g) => (
              <TouchableOpacity
                key={g.id}
                style={[styles.goalChip, selectedGoal?.id === g.id && styles.goalChipActive]}
                onPress={() => setSelectedGoal(g)}
              >
                <Text style={[styles.goalChipText, selectedGoal?.id === g.id && styles.goalChipTextActive]}>
                  🌱 {g.name}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.goalChip} onPress={() => navigation.navigate('CreateGoal')}>
              <Text style={styles.goalChipText}>+ New Goal</Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Payment Method */}
          <Text style={styles.sectionLabel}>PAY WITH</Text>
          <TouchableOpacity
            style={[styles.payMethod, method === 'mpesa' && styles.payMethodSelected]}
            onPress={() => setMethod('mpesa')}
          >
            <View style={[styles.payIcon, { backgroundColor: 'rgba(0,153,64,0.15)' }]}>
              <Text style={{ fontSize: 22 }}>📱</Text>
            </View>
            <View style={styles.payInfo}>
              <Text style={styles.payName}>M-Pesa</Text>
              <Text style={styles.payDesc}>Pay in KES — we convert to sats for you</Text>
              <View style={styles.recBadge}><Text style={styles.recBadgeText}>✓ Recommended</Text></View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.payMethod, method === 'lightning' && styles.payMethodSelected]}
            onPress={() => setMethod('lightning')}
          >
            <View style={[styles.payIcon, { backgroundColor: 'rgba(247,147,26,0.15)' }]}>
              <Text style={{ fontSize: 22 }}>⚡</Text>
            </View>
            <View style={styles.payInfo}>
              <Text style={styles.payName}>Lightning Network</Text>
              <Text style={styles.payDesc}>Pay directly in Bitcoin sats</Text>
              <View style={styles.advBadge}><Text style={styles.advBadgeText}>Advanced</Text></View>
            </View>
          </TouchableOpacity>

          {invoice !== '' && (
            <View style={styles.invoiceBox}>
              <Text style={styles.invoiceLabel}>Lightning Invoice — paste in your Bitcoin wallet</Text>
              <Text style={styles.invoiceText} numberOfLines={3}>{invoice}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.btnPrimary, (!selectedGoal || !isValidAmount) && styles.btnDisabled]}
            onPress={method === 'mpesa' ? handleMpesaDeposit : handleLightningDeposit}
            disabled={loading || !selectedGoal || !isValidAmount}
          >
            {loading
              ? <ActivityIndicator color="#000" />
              : <Text style={styles.btnPrimaryText}>
                  {method === 'mpesa'
                    ? `Pay KES ${numAmount.toLocaleString()} via M-Pesa →`
                    : `Generate Lightning Invoice →`
                  }
                </Text>
            }
          </TouchableOpacity>
        </View>
      </ScrollView>
      <BottomNav active="Save" onNavigate={(s) => navigation.navigate(s)} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  body: { padding: SPACING.lg, paddingBottom: 100 },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  sub: { fontSize: 13, color: COLORS.text2, marginBottom: SPACING.lg },
  treePreview: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.xl, padding: SPACING.md, marginBottom: SPACING.lg },
  treeInfo: { flex: 1 },
  treeName: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  treeSub: { fontSize: 12, color: COLORS.text2, marginBottom: 8 },
  progressTrack: { height: 5, backgroundColor: COLORS.bg3, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 5, backgroundColor: COLORS.greenLight, borderRadius: 3 },
  amountCard: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.xl, padding: SPACING.lg, marginBottom: SPACING.md },
  amountLabel: { fontSize: 11, color: COLORS.text3, letterSpacing: 1, marginBottom: 10 },
  amountInputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bg3, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, marginBottom: 8, overflow: 'hidden' },
  amountPrefix: { fontSize: 14, color: COLORS.text3, paddingHorizontal: 14, paddingVertical: 14, borderRightWidth: 1, borderRightColor: COLORS.border, fontWeight: '600' },
  amountInput: { flex: 1, fontSize: 28, fontWeight: '800', color: COLORS.text, padding: 12 },
  satsEquiv: { fontSize: 12, color: COLORS.orange, fontFamily: 'Courier', marginBottom: 14 },
  quickAmounts: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  quickChip: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: COLORS.bg3, borderWidth: 1, borderColor: COLORS.border, borderRadius: 20 },
  quickChipActive: { backgroundColor: 'rgba(200,146,42,0.15)', borderColor: COLORS.orange },
  quickChipText: { fontSize: 12, color: COLORS.text2 },
  quickChipTextActive: { color: COLORS.orange },
  minNote: { fontSize: 10, color: COLORS.text3 },
  conversionCard: { backgroundColor: 'rgba(45,107,58,0.08)', borderWidth: 1, borderColor: 'rgba(45,107,58,0.2)', borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.lg },
  conversionTitle: { fontSize: 12, color: COLORS.greenLight, fontWeight: '600', marginBottom: 6 },
  conversionText: { fontSize: 12, color: COLORS.text2, lineHeight: 18 },
  sectionLabel: { fontSize: 11, color: COLORS.text3, letterSpacing: 1, marginBottom: SPACING.sm },
  goalScroll: { marginBottom: SPACING.lg },
  goalChip: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 20, marginRight: 8 },
  goalChipActive: { backgroundColor: 'rgba(45,107,58,0.15)', borderColor: COLORS.green },
  goalChipText: { fontSize: 12, color: COLORS.text2 },
  goalChipTextActive: { color: COLORS.greenLight },
  payMethod: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.card, borderWidth: 2, borderColor: COLORS.border, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: 10 },
  payMethodSelected: { borderColor: COLORS.orange, backgroundColor: 'rgba(200,146,42,0.05)' },
  payIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  payInfo: { flex: 1 },
  payName: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  payDesc: { fontSize: 11, color: COLORS.text2, marginTop: 2 },
  recBadge: { backgroundColor: 'rgba(45,107,58,0.2)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start', marginTop: 6 },
  recBadgeText: { fontSize: 10, color: COLORS.greenLight, fontWeight: '600' },
  advBadge: { backgroundColor: 'rgba(200,146,42,0.15)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start', marginTop: 6 },
  advBadgeText: { fontSize: 10, color: COLORS.orange, fontWeight: '600' },
  invoiceBox: { backgroundColor: COLORS.bg3, borderWidth: 1, borderColor: COLORS.green, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md },
  invoiceLabel: { fontSize: 11, color: COLORS.text3, marginBottom: 6 },
  invoiceText: { fontSize: 10, color: COLORS.text2, fontFamily: 'Courier' },
  btnPrimary: { backgroundColor: COLORS.orange, borderRadius: RADIUS.lg, padding: 18, alignItems: 'center', marginTop: SPACING.md },
  btnDisabled: { opacity: 0.5 },
  btnPrimaryText: { color: '#000', fontSize: 15, fontWeight: '700' },
  confirmScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  confirmEmoji: { fontSize: 64, marginBottom: SPACING.lg },
  confirmTitle: { fontSize: 26, fontWeight: '800', color: COLORS.text, marginBottom: 10, textAlign: 'center' },
  confirmSub: { fontSize: 14, color: COLORS.text2, textAlign: 'center', lineHeight: 22, marginBottom: SPACING.xl },
  confirmDetails: { width: '100%', backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.xl, padding: SPACING.lg, marginBottom: SPACING.xl },
  confirmRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  confirmLabel: { fontSize: 13, color: COLORS.text2 },
  confirmVal: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  verifyBtn: { width: '100%', backgroundColor: COLORS.orange, borderRadius: RADIUS.lg, padding: 18, alignItems: 'center', marginBottom: 12 },
  verifyBtnText: { color: '#000', fontSize: 15, fontWeight: '700' },
  cancelBtn: { width: '100%', borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg, padding: 16, alignItems: 'center' },
  cancelBtnText: { color: COLORS.text2, fontSize: 14 },
});
