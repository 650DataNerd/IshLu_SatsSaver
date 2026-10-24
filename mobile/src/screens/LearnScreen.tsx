import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomNav } from '../components/BottomNav';
import { COLORS, SPACING, RADIUS } from '../constants/theme';

const articles = [
  { icon: '❓', title: 'What are Sats?', desc: '100 million sats = 1 BTC. Start here.', tag: 'Beginner', tagColor: COLORS.greenLight },
  { icon: '🛡️', title: 'Bitcoin vs. Volatility', desc: 'How to think about price swings when saving long term.', tag: 'Intermediate', tagColor: COLORS.blue },
  { icon: '💡', title: 'How Loans Work', desc: 'Use savings as collateral. Get liquidity without selling.', tag: 'Intermediate', tagColor: COLORS.blue },
  { icon: '🔒', title: 'Security Tips', desc: 'Protect your wallet. Your keys, your coins.', tag: 'Beginner', tagColor: COLORS.greenLight },
];

export const LearnScreen = ({ navigation }: any) => {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.body}>
          <Text style={styles.title}>Learn Elite 📚</Text>
          <Text style={styles.sub}>Master Bitcoin. Grow as your sats grow.</Text>

          <View style={styles.featured}>
            <Text style={styles.featuredTag}>🔥 FEATURED READ</Text>
            <Text style={styles.featuredTitle}>The Philosophy of Long-term Growth</Text>
            <Text style={styles.featuredDesc}>Why every small saving decision today compounds into financial freedom tomorrow.</Text>
            <TouchableOpacity style={styles.readBtn}>
              <Text style={styles.readBtnText}>Start Reading →</Text>
            </TouchableOpacity>
          </View>

          {articles.map((a, i) => (
            <TouchableOpacity key={i} style={styles.learnCard} activeOpacity={0.8}>
              <View style={styles.learnIcon}><Text style={{ fontSize: 22 }}>{a.icon}</Text></View>
              <View style={styles.learnInfo}>
                <Text style={styles.learnTitle}>{a.title}</Text>
                <Text style={styles.learnDesc}>{a.desc}</Text>
                <View style={[styles.tagChip, { backgroundColor: `${a.tagColor}22` }]}>
                  <Text style={[styles.tagText, { color: a.tagColor }]}>{a.tag}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
      <BottomNav active="Learn" onNavigate={(s) => navigation.navigate(s)} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  body: { padding: SPACING.lg, paddingBottom: 100 },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  sub: { fontSize: 13, color: COLORS.text2, marginBottom: SPACING.lg },
  featured: { backgroundColor: '#1F1200', borderWidth: 1, borderColor: 'rgba(247,147,26,0.2)', borderRadius: RADIUS.xl, padding: SPACING.lg, marginBottom: SPACING.md },
  featuredTag: { fontSize: 10, color: COLORS.orange, letterSpacing: 1, marginBottom: 8 },
  featuredTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  featuredDesc: { fontSize: 13, color: COLORS.text2, lineHeight: 20, marginBottom: 14 },
  readBtn: { backgroundColor: COLORS.orange, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10, alignSelf: 'flex-start' },
  readBtnText: { color: '#000', fontWeight: '700', fontSize: 13 },
  learnCard: { flexDirection: 'row', gap: 12, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: 10 },
  learnIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.bg3, alignItems: 'center', justifyContent: 'center' },
  learnInfo: { flex: 1 },
  learnTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 3 },
  learnDesc: { fontSize: 12, color: COLORS.text2, lineHeight: 18 },
  tagChip: { alignSelf: 'flex-start', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, marginTop: 6 },
  tagText: { fontSize: 10, fontWeight: '600' },
});
