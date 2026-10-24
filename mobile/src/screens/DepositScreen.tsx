import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput,
  TouchableOpacity, Alert, ActivityIndicator,
  ScrollView, Share, Clipboard
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { api } from '../services/api';

export const DepositScreen = ({ navigation }: any) => {
  const [amountSats, setAmountSats] = useState('100000');
  const [invoice, setInvoice] = useState('');
  const [paymentHash, setPaymentHash] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [paid, setPaid] = useState(false);

  const QUICK_AMOUNTS = [100000, 500000, 1000000, 5000000];

  const handleCreateInvoice = async () => {
    const sats = parseInt(amountSats);
    if (sats < 100000) {
      Alert.alert('Minimum deposit is 100,000 sats');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/deposits/lightning/invoice', {
        amount_sats: sats,
        memo: 'IshLu BTC Deposit',
      });
      setInvoice(res.data.bolt11);
      setPaymentHash(res.data.payment_hash);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Could not create invoice');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    Share.share({
      message: invoice,
      title: 'IshLu Lightning Invoice',
    });
  };

  const handleCopy = () => {
    Clipboard.setString(invoice);
    Alert.alert('Copied!', 'Paste this in your Lightning wallet to pay');
  };

  const handleVerify = async () => {
    if (!paymentHash) return;
    setVerifying(true);
    try {
      const res = await api.get(`/deposits/lightning/verify/${paymentHash}`);
      if (res.data.paid) {
        setPaid(true);
        Alert.alert(
          '₿ Bitcoin Received!',
          `${res.data.amount_sats?.toLocaleString()} sats added to your collateral vault.`,
          [{ text: 'Get a Loan →', onPress: () => navigation.navigate('Loan') }]
        );
      } else {
        Alert.alert('Not yet', 'Payment not received. Try again in a moment.');
      }
    } catch {
      Alert.alert('Error', 'Could not verify payment');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.body}>

          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Deposit Bitcoin</Text>
          <Text style={styles.sub}>
            Deposit via Lightning Network. Sats become collateral for your loan.
          </Text>

          {!invoice ? (
            <>
              <View style={styles.amountCard}>
                <Text style={styles.label}>AMOUNT TO DEPOSIT</Text>
                <View style={styles.inputRow}>
                  <Text style={styles.inputPrefix}>₿</Text>
                  <TextInput
                    style={styles.input}
                    value={amountSats}
                    onChangeText={setAmountSats}
                    keyboardType="numeric"
                    placeholder="100000"
                    placeholderTextColor={COLORS.text3}
                  />
                  <Text style={styles.inputSuffix}>sats</Text>
                </View>

                <View style={styles.quickRow}>
                  {QUICK_AMOUNTS.map((a) => (
                    <TouchableOpacity
                      key={a}
                      style={[styles.quickChip, parseInt(amountSats) === a && styles.quickChipActive]}
                      onPress={() => setAmountSats(String(a))}
                    >
                      <Text style={[styles.quickChipText, parseInt(amountSats) === a && styles.quickChipTextActive]}>
                        {a >= 1000000 ? `${a / 1000000}M` : `${a / 1000}K`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.previewCard}>
                  <Text style={styles.previewLabel}>Loan capacity after deposit</Text>
                  <Text style={styles.previewVal}>
                    KES {Math.round((parseInt(amountSats || '0') / 7.5) * 0.67).toLocaleString()}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.btn}
                onPress={handleCreateInvoice}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="#000" />
                  : <Text style={styles.btnText}>Generate Invoice →</Text>
                }
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* Invoice card */}
              <View style={styles.invoiceCard}>
                <Text style={styles.invoiceLabel}>LIGHTNING INVOICE</Text>
                <Text style={styles.invoiceAmount}>
                  {parseInt(amountSats).toLocaleString()} sats
                </Text>
                <Text style={styles.invoiceText} numberOfLines={3}>
                  {invoice}
                </Text>
              </View>

              {/* Primary action */}
              <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
                <Text style={styles.shareBtnText}>⚡ Open in Wallet App</Text>
                <Text style={styles.shareBtnSub}>Share to Blink, Phoenix, Muun or any wallet</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.copyBtn} onPress={handleCopy}>
                <Text style={styles.copyBtnText}>📋 Copy Invoice</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.verifyBtn, paid && styles.verifyBtnPaid]}
                onPress={handleVerify}
                disabled={verifying || paid}
              >
                {verifying
                  ? <ActivityIndicator color="#000" />
                  : <Text style={styles.verifyBtnText}>
                      {paid ? '✓ Payment Confirmed' : "I've Paid — Confirm"}
                    </Text>
                }
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.newInvoiceBtn}
                onPress={() => { setInvoice(''); setPaymentHash(''); setPaid(false); }}
              >
                <Text style={styles.newInvoiceBtnText}>Generate new invoice</Text>
              </TouchableOpacity>
            </>
          )}

          {/* How it works */}
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>How it works</Text>
            {[
              '1. Generate a Lightning invoice above',
              '2. Scan QR or copy invoice to your Bitcoin wallet',
              '3. Pay from Blink, Phoenix, Muun, or any Lightning wallet',
              '4. Tap "I\'ve Paid" to confirm and credit your sats',
              '5. Use sats as collateral to get a KES loan',
            ].map((step, i) => (
              <Text key={i} style={styles.infoStep}>{step}</Text>
            ))}
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  body: { padding: SPACING.lg, paddingBottom: 60 },
  back: { marginBottom: SPACING.lg },
  backText: { color: COLORS.text3, fontSize: 14 },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.text, marginBottom: 6 },
  sub: { fontSize: 13, color: COLORS.text2, lineHeight: 20, marginBottom: SPACING.xl },
  label: { fontSize: 9, color: COLORS.text3, letterSpacing: 2, marginBottom: SPACING.sm },
  amountCard: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.xl, padding: SPACING.md, marginBottom: SPACING.md },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bg3, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg, marginBottom: SPACING.md, overflow: 'hidden' },
  inputPrefix: { fontSize: 18, color: COLORS.orange, paddingHorizontal: 14, borderRightWidth: 1, borderRightColor: COLORS.border, paddingVertical: 12 },
  input: { flex: 1, fontSize: 22, fontWeight: '700', color: COLORS.text, padding: 12 },
  inputSuffix: { fontSize: 11, color: COLORS.text3, paddingHorizontal: 12 },
  quickRow: { flexDirection: 'row', gap: 8, marginBottom: SPACING.md },
  quickChip: { flex: 1, backgroundColor: COLORS.bg3, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg, padding: 10, alignItems: 'center' },
  quickChipActive: { backgroundColor: 'rgba(200,146,42,0.15)', borderColor: COLORS.orange },
  quickChipText: { fontSize: 12, color: COLORS.text2, fontWeight: '600' },
  quickChipTextActive: { color: COLORS.orange },
  previewCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(200,146,42,0.08)', borderRadius: RADIUS.lg, padding: 12 },
  previewLabel: { fontSize: 12, color: COLORS.text2 },
  previewVal: { fontSize: 16, fontWeight: '800', color: COLORS.orangeLight },
  btn: { backgroundColor: COLORS.orange, borderRadius: RADIUS.lg, padding: 18, alignItems: 'center', marginBottom: SPACING.md },
  btnText: { color: '#000', fontWeight: '800', fontSize: 15 },
  invoiceCard: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.xl, padding: SPACING.md, marginBottom: SPACING.md },
  invoiceLabel: { fontSize: 9, color: COLORS.text3, letterSpacing: 2, marginBottom: 6 },
  invoiceAmount: { fontSize: 20, fontWeight: '800', color: COLORS.orangeLight, marginBottom: 10 },
  invoiceText: { fontSize: 10, color: COLORS.text2, fontFamily: 'Courier', lineHeight: 16 },
  shareBtn: { backgroundColor: COLORS.orange, borderRadius: RADIUS.lg, padding: 16, alignItems: 'center', marginBottom: 10 },
  shareBtnText: { color: '#000', fontWeight: '800', fontSize: 15 },
  shareBtnSub: { color: '#00000077', fontSize: 10, marginTop: 3 },
  copyBtn: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg, padding: 14, alignItems: 'center', marginBottom: 10 },
  copyBtnText: { color: COLORS.text, fontSize: 13 },
  verifyBtn: { backgroundColor: COLORS.green, borderRadius: RADIUS.lg, padding: 16, alignItems: 'center', marginBottom: 10 },
  verifyBtnPaid: { backgroundColor: COLORS.greenDim },
  verifyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  newInvoiceBtn: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg, padding: 14, alignItems: 'center', marginBottom: SPACING.lg },
  newInvoiceBtnText: { color: COLORS.text2, fontSize: 13 },
  infoCard: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg, padding: SPACING.md },
  infoTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 10 },
  infoStep: { fontSize: 12, color: COLORS.text2, lineHeight: 22 },
});
