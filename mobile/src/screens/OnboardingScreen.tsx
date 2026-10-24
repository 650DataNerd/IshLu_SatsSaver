import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { IshLuLogo } from '../components/IshLuLogo';

const CURRENCIES = [
  { code: 'KES', flag: '🇰🇪', name: 'Kenya', status: 'live' },
  { code: 'NGN', flag: '🇳🇬', name: 'Nigeria', status: 'soon' },
  { code: 'GHS', flag: '🇬🇭', name: 'Ghana', status: 'soon' },
  { code: 'USD', flag: '🌍', name: 'Global', status: 'soon' },
];

export const OnboardingScreen = ({ navigation }: any) => {
  const [selected, setSelected] = useState('KES');

  return (
    <LinearGradient colors={['#040704', '#080C08']} style={styles.container}>
      <SafeAreaView style={styles.safe}>



        <IshLuLogo />

        {/* Headline */}
        <View style={styles.middle}>
          <Text style={styles.h1}>Don't sell{'\n'}your Bitcoin.</Text>
          <Text style={styles.h2}>Get a loan.</Text>
          <Text style={styles.sub}>
            Lock BTC as collateral. Receive local currency instantly. Repay and get your Bitcoin back.
          </Text>

          {/* Currency selector */}
          <Text style={styles.currencyLabel}>SELECT YOUR CURRENCY</Text>
          <View style={styles.currencyRow}>
            {CURRENCIES.map((c) => (
              <TouchableOpacity
                key={c.code}
                style={[
                  styles.currencyBtn,
                  selected === c.code && styles.currencyBtnActive,
                  c.status === 'soon' && styles.currencyBtnSoon,
                ]}
                onPress={() => c.status === 'live' && setSelected(c.code)}
                activeOpacity={c.status === 'live' ? 0.8 : 1}
              >
                <Text style={styles.currencyFlag}>{c.flag}</Text>
                <Text style={[styles.currencyCode, selected === c.code && styles.currencyCodeActive]}>
                  {c.code}
                </Text>
                {c.status === 'soon' && (
                  <Text style={styles.soonBadge}>Soon</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Numbers */}
          <View style={styles.pills}>
            {[
              { val: '11.49%', lbl: 'APR' },
              { val: '67%', lbl: 'LTV' },
              { val: '100K sats', lbl: 'Min Collateral' },
            ].map((p, i) => (
              <View key={i} style={styles.pill}>
                <Text style={styles.pillVal}>{p.val}</Text>
                <Text style={styles.pillLbl}>{p.lbl}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* CTAs */}
        <View style={styles.bottom}>
          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.btnPrimaryText}>
              Get a {selected} Loan →
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.btnSecondary}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.btnSecondaryText}>Sign in</Text>
          </TouchableOpacity>
          <Text style={styles.footer}>
            Secured by Bitcoin · KES live · NGN, GHS, USD coming
          </Text>
        </View>

      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, padding: SPACING.lg, justifyContent: 'space-between' },
  brand: { paddingTop: SPACING.md },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.greenBright },
  brandText: { fontSize: 11, color: COLORS.text3, letterSpacing: 4, fontWeight: '700' },
  middle: { flex: 1, justifyContent: 'center' },
  h1: { fontSize: 42, fontWeight: '800', color: COLORS.text, lineHeight: 46, marginBottom: 4 },
  h2: { fontSize: 42, fontWeight: '800', color: COLORS.orangeLight, fontStyle: 'italic', lineHeight: 50, marginBottom: SPACING.md },
  sub: { fontSize: 14, color: COLORS.text2, lineHeight: 22, marginBottom: SPACING.lg },
  currencyLabel: { fontSize: 9, color: COLORS.text3, letterSpacing: 2, marginBottom: SPACING.sm },
  currencyRow: { flexDirection: 'row', gap: 8, marginBottom: SPACING.lg },
  currencyBtn: { flex: 1, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg, padding: 10, alignItems: 'center', gap: 4, position: 'relative' },
  currencyBtnActive: { borderColor: COLORS.orange, backgroundColor: 'rgba(200,146,42,0.08)' },
  currencyBtnSoon: { opacity: 0.5 },
  currencyFlag: { fontSize: 18 },
  currencyCode: { fontSize: 11, color: COLORS.text2, fontWeight: '700' },
  currencyCodeActive: { color: COLORS.orange },
  soonBadge: { fontSize: 7, color: COLORS.text3, backgroundColor: COLORS.bg3, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
  pills: { flexDirection: 'row', gap: 10 },
  pill: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg, padding: 12, flex: 1, alignItems: 'center' },
  pillVal: { fontSize: 14, fontWeight: '800', color: COLORS.orangeLight, marginBottom: 3 },
  pillLbl: { fontSize: 9, color: COLORS.text3 },
  bottom: { gap: 12, paddingBottom: SPACING.md },
  btnPrimary: { backgroundColor: COLORS.orange, borderRadius: RADIUS.lg, padding: 18, alignItems: 'center' },
  btnPrimaryText: { color: '#000', fontSize: 16, fontWeight: '800' },
  btnSecondary: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg, padding: 16, alignItems: 'center' },
  btnSecondaryText: { color: COLORS.text2, fontSize: 14 },
  footer: { fontSize: 10, color: COLORS.text3, textAlign: 'center' },
});
