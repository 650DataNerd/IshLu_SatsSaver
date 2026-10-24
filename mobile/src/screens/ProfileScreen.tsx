import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Switch, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BottomNav } from '../components/BottomNav';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { api, clearToken } from '../services/api';

export const ProfileScreen = ({ navigation }: any) => {
  const [userName, setUserName] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [trust, setTrust] = useState<any>(null);
  const [pinLock, setPinLock] = useState(true);
  const [biometric, setBiometric] = useState(false);
  const [notifications, setNotifications] = useState(true);

  useEffect(() => {
    const load = async () => {
      const name = await AsyncStorage.getItem('user_name');
      const phone = await AsyncStorage.getItem('user_phone');
      if (name) setUserName(name);
      if (phone) setUserPhone(phone);
      try {
        const res = await api.get('/trust/score');
        setTrust(res.data);
      } catch {}
    };
    load();
  }, []);

  const handleLogout = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await clearToken();
            await AsyncStorage.clear();
            navigation.replace('Onboarding');
          }
        }
      ]
    );
  };

  const initials = userName
    ? userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : '₿';

  const tierColors: any = {
    Seed: COLORS.tierSeed,
    Bronze: COLORS.tierBronze,
    Silver: COLORS.tierSilver,
    Gold: COLORS.tierGold,
    Platinum: COLORS.tierPlatinum,
  };

  const tierColor = tierColors[trust?.tier] || COLORS.text3;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Profile Hero */}
        <View style={styles.hero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.heroInfo}>
            <Text style={styles.name}>{userName || 'Bitcoin Holder'}</Text>
            <Text style={styles.phone}>{userPhone}</Text>
            {trust && (
              <View style={[styles.tierBadge, { borderColor: `${tierColor}55` }]}>
                <Text style={[styles.tierText, { color: tierColor }]}>
                  {trust.tier} · {trust.score} Score
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Credit Score Card */}
        {trust && (
          <View style={styles.scoreCard}>
            <Text style={styles.scoreEyebrow}>CREDIT SCORE</Text>
            <View style={styles.scoreRow}>
              <Text style={[styles.scoreNumber, { color: tierColor }]}>
                {trust.score}
              </Text>
              <View style={styles.scoreRight}>
                <Text style={styles.scoreTier}>{trust.tier} Tier</Text>
                <Text style={styles.scoreDesc}>{trust.ai_explanation}</Text>
                <Text style={styles.scoreMax}>
                  Max loan: {trust.max_loan_sats?.toLocaleString()} sats
                </Text>
              </View>
            </View>
            {/* Score breakdown */}
            {Object.entries(trust.breakdown || {}).map(([key, val]: any) => (
              <View key={key} style={styles.barRow}>
                <Text style={styles.barLabel}>{key.replace(/_/g, ' ')}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, {
                    width: `${(val.score / val.max) * 100}%`,
                    backgroundColor: tierColor,
                  }]} />
                </View>
                <Text style={styles.barVal}>{Math.round(val.score)}/{val.max}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Security Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SECURITY</Text>
          <View style={styles.settingsCard}>
            {[
              { icon: '🔢', label: 'PIN Lock', desc: 'Require PIN to open app', val: pinLock, set: setPinLock },
              { icon: '🧬', label: 'Biometric', desc: 'Fingerprint or face ID', val: biometric, set: setBiometric },
              { icon: '🔔', label: 'Notifications', desc: 'Loan due date reminders', val: notifications, set: setNotifications },
            ].map((item, i, arr) => (
              <View
                key={i}
                style={[styles.settingsRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}
              >
                <View style={styles.settingsLeft}>
                  <View style={styles.settingsIcon}>
                    <Text style={{ fontSize: 16 }}>{item.icon}</Text>
                  </View>
                  <View>
                    <Text style={styles.settingsLabel}>{item.label}</Text>
                    <Text style={styles.settingsDesc}>{item.desc}</Text>
                  </View>
                </View>
                <Switch
                  value={item.val}
                  onValueChange={item.set}
                  trackColor={{ false: COLORS.bg3, true: COLORS.green }}
                  thumbColor="white"
                />
              </View>
            ))}
          </View>
        </View>

        {/* Account */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACCOUNT</Text>
          <View style={styles.settingsCard}>
            {[
              { icon: '🔐', label: 'Change Password', onPress: () => navigation.navigate('ForgotPassword') },
              { icon: '📋', label: 'Loan History', onPress: () => navigation.navigate('Activity') },
              { icon: '⚡', label: 'Get a Loan', onPress: () => navigation.navigate('Loan') },
            ].map((item, i, arr) => (
              <TouchableOpacity
                key={i}
                style={[styles.settingsRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}
                onPress={item.onPress}
              >
                <View style={styles.settingsLeft}>
                  <View style={styles.settingsIcon}>
                    <Text style={{ fontSize: 16 }}>{item.icon}</Text>
                  </View>
                  <Text style={styles.settingsLabel}>{item.label}</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Legal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>LEGAL</Text>
          <View style={styles.settingsCard}>
            {[
              { label: 'Terms of Service' },
              { label: 'Privacy Policy' },
              { label: 'Loan Agreement' },
            ].map((item, i, arr) => (
              <TouchableOpacity
                key={i}
                style={[styles.settingsRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}
              >
                <Text style={styles.settingsLabel}>{item.label}</Text>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Version + Logout */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
          <Text style={styles.version}>IshLu v2.0.0 · Bitcoin Loans for Africa</Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <BottomNav active="Profile" onNavigate={(s) => navigation.navigate(s)} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: '#050805', padding: SPACING.lg },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.greenDim, borderWidth: 2, borderColor: COLORS.green, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: COLORS.text, fontWeight: '800', fontSize: 22 },
  heroInfo: { flex: 1 },
  name: { fontSize: 20, fontWeight: '800', color: COLORS.text, marginBottom: 2 },
  phone: { fontSize: 12, color: COLORS.text3, marginBottom: 8 },
  tierBadge: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  tierText: { fontSize: 11, fontWeight: '700' },
  scoreCard: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.xl, padding: SPACING.md, margin: SPACING.md },
  scoreEyebrow: { fontSize: 9, color: COLORS.text3, letterSpacing: 2, marginBottom: 12 },
  scoreRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 16, marginBottom: 16 },
  scoreNumber: { fontSize: 52, fontWeight: '800', lineHeight: 56 },
  scoreRight: { flex: 1 },
  scoreTier: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  scoreDesc: { fontSize: 12, color: COLORS.text2, lineHeight: 17, marginBottom: 6 },
  scoreMax: { fontSize: 11, color: COLORS.orange },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  barLabel: { fontSize: 10, color: COLORS.text3, width: 100, textTransform: 'capitalize' },
  barTrack: { flex: 1, height: 4, backgroundColor: COLORS.bg3, borderRadius: 2, overflow: 'hidden' },
  barFill: { height: 4, borderRadius: 2 },
  barVal: { fontSize: 10, color: COLORS.text2, width: 28, textAlign: 'right' },
  section: { paddingHorizontal: SPACING.md, marginBottom: SPACING.lg },
  sectionTitle: { fontSize: 9, color: COLORS.text3, letterSpacing: 2, marginBottom: 10 },
  settingsCard: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg, overflow: 'hidden' },
  settingsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  settingsLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  settingsIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: COLORS.bg3, alignItems: 'center', justifyContent: 'center' },
  settingsLabel: { fontSize: 13, color: COLORS.text },
  settingsDesc: { fontSize: 11, color: COLORS.text3, marginTop: 1 },
  chevron: { color: COLORS.text3, fontSize: 18 },
  logoutBtn: { borderWidth: 1, borderColor: COLORS.red, borderRadius: RADIUS.lg, padding: 16, alignItems: 'center', marginBottom: 12 },
  logoutText: { color: COLORS.red, fontWeight: '600', fontSize: 14 },
  version: { fontSize: 10, color: COLORS.text3, textAlign: 'center' },
});
