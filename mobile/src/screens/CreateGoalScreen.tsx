import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput,
  TouchableOpacity, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { api } from '../services/api';

const GOAL_PRESETS = [
  { name: '🏠 Emergency Fund', target: 100000 },
  { name: '📱 New Phone', target: 50000 },
  { name: '🎓 Education', target: 200000 },
  { name: '✈️ Travel', target: 150000 },
  { name: '💼 Business', target: 500000 },
];

export const CreateGoalScreen = ({ navigation }: any) => {
  const [name, setName] = useState('');
  const [targetSats, setTargetSats] = useState('');
  const [targetKes, setTargetKes] = useState('');
  const [loading, setLoading] = useState(false);
  const [inputMode, setInputMode] = useState<'kes' | 'sats'>('kes');

  const KES_TO_SATS = 7.5;

  const handleKesChange = (val: string) => {
    setTargetKes(val);
    const sats = Math.round(parseFloat(val || '0') * KES_TO_SATS);
    setTargetSats(isNaN(sats) ? '' : String(sats));
  };

  const handleSatsChange = (val: string) => {
    setTargetSats(val);
    const kes = Math.round(parseFloat(val || '0') / KES_TO_SATS);
    setTargetKes(isNaN(kes) ? '' : String(kes));
  };

  const selectPreset = (preset: { name: string; target: number }) => {
    setName(preset.name);
    setTargetSats(String(preset.target));
    setTargetKes(String(Math.round(preset.target / KES_TO_SATS)));
  };

  const handleCreate = async () => {
    if (!name.trim()) { Alert.alert('Name required', 'Give your goal a name'); return; }
    if (!targetSats || parseInt(targetSats) < 1000) {
      Alert.alert('Invalid amount', 'Minimum goal is 1,000 sats (≈ KES 133)'); return;
    }
    setLoading(true);
    try {
      await api.post('/savings/goals', {
        name: name.trim(),
        target_sats: parseInt(targetSats),
      });
      Alert.alert('🌱 Goal Created!', `${name} has been planted. Start saving to grow your tree.`, [
        { text: 'Start Saving', onPress: () => navigation.replace('Save') }
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Could not create goal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.body}>

            {/* Header */}
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Plant a New Seed 🌱</Text>
            <Text style={styles.sub}>Set a savings goal and watch your tree grow</Text>

            {/* Presets */}
            <Text style={styles.label}>QUICK PRESETS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetScroll}>
              {GOAL_PRESETS.map((p, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.presetChip, name === p.name && styles.presetChipActive]}
                  onPress={() => selectPreset(p)}
                >
                  <Text style={[styles.presetName, name === p.name && styles.presetNameActive]}>{p.name}</Text>
                  <Text style={styles.presetSats}>{p.target.toLocaleString()} sats</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Goal Name */}
            <Text style={styles.label}>GOAL NAME</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Emergency Fund, New Phone..."
              placeholderTextColor={COLORS.text3}
              value={name}
              onChangeText={setName}
              maxLength={50}
            />

            {/* Amount Toggle */}
            <View style={styles.toggleRow}>
              <Text style={styles.label}>TARGET AMOUNT</Text>
              <View style={styles.modeToggle}>
                <TouchableOpacity
                  style={[styles.modeBtn, inputMode === 'kes' && styles.modeBtnActive]}
                  onPress={() => setInputMode('kes')}
                >
                  <Text style={[styles.modeBtnText, inputMode === 'kes' && styles.modeBtnTextActive]}>KES</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modeBtn, inputMode === 'sats' && styles.modeBtnActive]}
                  onPress={() => setInputMode('sats')}
                >
                  <Text style={[styles.modeBtnText, inputMode === 'sats' && styles.modeBtnTextActive]}>SATS</Text>
                </TouchableOpacity>
              </View>
            </View>

            {inputMode === 'kes' ? (
              <View style={styles.inputWithLabel}>
                <Text style={styles.inputPrefix}>KES</Text>
                <TextInput
                  style={styles.inputInline}
                  placeholder="5,000"
                  placeholderTextColor={COLORS.text3}
                  value={targetKes}
                  onChangeText={handleKesChange}
                  keyboardType="numeric"
                />
              </View>
            ) : (
              <View style={styles.inputWithLabel}>
                <Text style={styles.inputPrefix}>SATS</Text>
                <TextInput
                  style={styles.inputInline}
                  placeholder="37,500"
                  placeholderTextColor={COLORS.text3}
                  value={targetSats}
                  onChangeText={handleSatsChange}
                  keyboardType="numeric"
                />
              </View>
            )}

            {/* Conversion display */}
            {targetSats !== '' && (
              <View style={styles.conversionCard}>
                <Text style={styles.conversionText}>
                  KES {parseInt(targetKes || '0').toLocaleString()} ≈ {parseInt(targetSats || '0').toLocaleString()} sats
                </Text>
                <Text style={styles.conversionSub}>At today's rate of KES 1 = 7.5 sats</Text>
              </View>
            )}

            {/* Create Button */}
            <TouchableOpacity
              style={[styles.createBtn, (!name || !targetSats) && styles.createBtnDisabled]}
              onPress={handleCreate}
              disabled={loading || !name || !targetSats}
            >
              {loading
                ? <ActivityIndicator color="#000" />
                : <Text style={styles.createBtnText}>Plant This Goal 🌱</Text>
              }
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  body: { padding: SPACING.lg, paddingBottom: 60 },
  backBtn: { marginBottom: SPACING.lg },
  backText: { color: COLORS.greenLight, fontSize: 14 },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.text, marginBottom: 6 },
  sub: { fontSize: 13, color: COLORS.text2, marginBottom: SPACING.xl },
  label: { fontSize: 11, color: COLORS.text3, letterSpacing: 1, marginBottom: SPACING.sm },
  presetScroll: { marginBottom: SPACING.lg },
  presetChip: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg, padding: 12, marginRight: 10, minWidth: 130 },
  presetChipActive: { borderColor: COLORS.orange, backgroundColor: 'rgba(247,147,26,0.08)' },
  presetName: { fontSize: 13, color: COLORS.text, marginBottom: 4 },
  presetNameActive: { color: COLORS.orange },
  presetSats: { fontSize: 11, color: COLORS.text3, fontFamily: 'Courier' },
  input: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg, padding: 16, color: COLORS.text, fontSize: 15, marginBottom: SPACING.lg },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  modeToggle: { flexDirection: 'row', backgroundColor: COLORS.bg3, borderRadius: 20, padding: 2 },
  modeBtn: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 18 },
  modeBtnActive: { backgroundColor: COLORS.orange },
  modeBtnText: { fontSize: 11, color: COLORS.text3, fontWeight: '600' },
  modeBtnTextActive: { color: '#000' },
  inputWithLabel: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg, marginBottom: SPACING.md, overflow: 'hidden' },
  inputPrefix: { fontSize: 13, color: COLORS.text3, paddingHorizontal: 16, paddingVertical: 16, borderRightWidth: 1, borderRightColor: COLORS.border, fontWeight: '600' },
  inputInline: { flex: 1, padding: 16, color: COLORS.text, fontSize: 22, fontWeight: '700' },
  conversionCard: { backgroundColor: 'rgba(247,147,26,0.08)', borderWidth: 1, borderColor: 'rgba(247,147,26,0.2)', borderRadius: RADIUS.lg, padding: 14, marginBottom: SPACING.xl },
  conversionText: { fontSize: 14, color: COLORS.orange, fontWeight: '600', marginBottom: 4 },
  conversionSub: { fontSize: 11, color: COLORS.text3 },
  createBtn: { backgroundColor: COLORS.orange, borderRadius: RADIUS.lg, padding: 18, alignItems: 'center' },
  createBtnDisabled: { opacity: 0.5 },
  createBtnText: { color: '#000', fontSize: 16, fontWeight: '700' },
});
