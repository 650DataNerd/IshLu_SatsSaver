import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput,
  TouchableOpacity, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { IshLuLogo } from '../components/IshLuLogo';
import { api, saveToken } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const RegisterScreen = ({ navigation }: any) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name.trim()) { Alert.alert('Enter your name'); return; }
    if (!phone.trim()) { Alert.alert('Enter your phone number'); return; }
    if (password.length < 6) { Alert.alert('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      const res = await api.post('/auth/register', {
        phone: phone.trim(),
        password,
        mpesa_phone: phone.trim(),
      });
      await saveToken(res.data.access_token);
      await AsyncStorage.setItem('user_name', name.trim());
      await AsyncStorage.setItem('user_phone', phone.trim());
      navigation.replace('Dashboard');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#040704', '#080C08']} style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
            <IshLuLogo />
            <Text style={styles.title}>Create account</Text>
            <Text style={styles.sub}>Start borrowing against your Bitcoin</Text>
            <View style={styles.form}>
              <Text style={styles.label}>FULL NAME</Text>
              <TextInput style={styles.input} placeholder="Your name" placeholderTextColor={COLORS.text3} value={name} onChangeText={setName} autoCapitalize="words" />
              <Text style={styles.label}>PHONE NUMBER</Text>
              <TextInput style={styles.input} placeholder="+254712345678" placeholderTextColor={COLORS.text3} value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoCapitalize="none" />
              <Text style={styles.label}>PASSWORD</Text>
              <TextInput style={styles.input} placeholder="Minimum 6 characters" placeholderTextColor={COLORS.text3} value={password} onChangeText={setPassword} secureTextEntry />
            </View>
            <TouchableOpacity style={[styles.btn, (!name || !phone || password.length < 6) && styles.btnDisabled]} onPress={handleRegister} disabled={loading || !name || !phone || password.length < 6}>
              {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.btnText}>Create Account →</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.loginLink} onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginText}>Already have an account? <Text style={styles.loginAccent}>Sign in</Text></Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  scroll: { padding: SPACING.lg, paddingTop: SPACING.md },
  back: { marginBottom: SPACING.xl },
  backText: { color: COLORS.text3, fontSize: 14 },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.text, marginTop: SPACING.lg, marginBottom: 6 },
  sub: { fontSize: 14, color: COLORS.text2, marginBottom: SPACING.xl },
  form: { marginBottom: SPACING.lg },
  label: { fontSize: 10, color: COLORS.text3, letterSpacing: 2, marginBottom: SPACING.sm },
  input: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg, padding: 16, color: COLORS.text, fontSize: 15, marginBottom: SPACING.lg },
  btn: { backgroundColor: COLORS.orange, borderRadius: RADIUS.lg, padding: 18, alignItems: 'center', marginBottom: SPACING.lg },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#000', fontSize: 16, fontWeight: '800' },
  loginLink: { alignItems: 'center' },
  loginText: { color: COLORS.text2, fontSize: 14 },
  loginAccent: { color: COLORS.orange },
});
