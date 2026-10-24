import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput,
  TouchableOpacity, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { api } from '../services/api';

export const ForgotPasswordScreen = ({ navigation }: any) => {
  const [step, setStep] = useState<'phone' | 'code' | 'done'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [devCode, setDevCode] = useState('');

  const handleRequestCode = async () => {
    if (!phone) { Alert.alert('Enter your phone number'); return; }
    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { phone: phone.trim() });
      // In dev mode the code comes back in response
      if (res.data.dev_code) setDevCode(res.data.dev_code);
      setStep('code');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!code || code.length !== 6) { Alert.alert('Enter the 6-digit code'); return; }
    if (!newPassword || newPassword.length < 6) { Alert.alert('Password must be at least 6 characters'); return; }
    if (newPassword !== confirmPassword) { Alert.alert('Passwords do not match'); return; }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        phone: phone.trim(),
        code,
        new_password: newPassword,
      });
      setStep('done');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#0D2410', '#0A1A0F', '#060E08']} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>

          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          {step === 'phone' && (
            <>
              <Text style={styles.emoji}>🔐</Text>
              <Text style={styles.title}>Reset Password</Text>
              <Text style={styles.sub}>Enter your phone number and we'll send you a reset code.</Text>

              <Text style={styles.label}>PHONE NUMBER</Text>
              <TextInput
                style={styles.input}
                placeholder="+254712345678"
                placeholderTextColor={COLORS.text3}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                autoCapitalize="none"
              />

              <TouchableOpacity
                style={[styles.btn, !phone && styles.btnDisabled]}
                onPress={handleRequestCode}
                disabled={loading || !phone}
              >
                {loading
                  ? <ActivityIndicator color="#000" />
                  : <Text style={styles.btnText}>Send Reset Code →</Text>
                }
              </TouchableOpacity>
            </>
          )}

          {step === 'code' && (
            <>
              <Text style={styles.emoji}>📱</Text>
              <Text style={styles.title}>Enter Reset Code</Text>
              <Text style={styles.sub}>
                A 6-digit code has been sent to {phone}.
              </Text>

              {devCode !== '' && (
                <View style={styles.devCodeCard}>
                  <Text style={styles.devCodeLabel}>Dev Mode — Your code:</Text>
                  <Text style={styles.devCodeVal}>{devCode}</Text>
                </View>
              )}

              <Text style={styles.label}>6-DIGIT CODE</Text>
              <TextInput
                style={[styles.input, styles.codeInput]}
                placeholder="000000"
                placeholderTextColor={COLORS.text3}
                value={code}
                onChangeText={setCode}
                keyboardType="numeric"
                maxLength={6}
              />

              <Text style={styles.label}>NEW PASSWORD</Text>
              <TextInput
                style={styles.input}
                placeholder="Minimum 6 characters"
                placeholderTextColor={COLORS.text3}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
              />

              <Text style={styles.label}>CONFIRM PASSWORD</Text>
              <TextInput
                style={styles.input}
                placeholder="Repeat new password"
                placeholderTextColor={COLORS.text3}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />

              <TouchableOpacity
                style={[styles.btn, (!code || !newPassword || !confirmPassword) && styles.btnDisabled]}
                onPress={handleResetPassword}
                disabled={loading || !code || !newPassword || !confirmPassword}
              >
                {loading
                  ? <ActivityIndicator color="#000" />
                  : <Text style={styles.btnText}>Reset Password →</Text>
                }
              </TouchableOpacity>

              <TouchableOpacity style={styles.resendBtn} onPress={handleRequestCode}>
                <Text style={styles.resendText}>Didn't get code? Resend</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 'done' && (
            <>
              <Text style={styles.emoji}>✅</Text>
              <Text style={styles.title}>Password Reset!</Text>
              <Text style={styles.sub}>
                Your password has been updated successfully. Sign in with your new password.
              </Text>
              <TouchableOpacity
                style={styles.btn}
                onPress={() => navigation.replace('Login')}
              >
                <Text style={styles.btnText}>Sign In →</Text>
              </TouchableOpacity>
            </>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { padding: SPACING.xl, paddingTop: 60 },
  backBtn: { marginBottom: SPACING.lg },
  backText: { color: COLORS.greenLight, fontSize: 14 },
  emoji: { fontSize: 48, marginBottom: SPACING.md },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
  sub: { fontSize: 14, color: COLORS.text2, lineHeight: 22, marginBottom: SPACING.xl },
  label: { fontSize: 11, color: COLORS.text3, letterSpacing: 1, marginBottom: SPACING.sm },
  input: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg, padding: 16, color: COLORS.text, fontSize: 15, marginBottom: SPACING.lg },
  codeInput: { fontSize: 28, fontWeight: '700', textAlign: 'center', letterSpacing: 12 },
  btn: { backgroundColor: COLORS.orange, borderRadius: RADIUS.lg, padding: 18, alignItems: 'center', marginBottom: SPACING.md },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#000', fontSize: 16, fontWeight: '700' },
  resendBtn: { alignItems: 'center', padding: 12 },
  resendText: { color: COLORS.text2, fontSize: 14 },
  devCodeCard: { backgroundColor: 'rgba(247,147,26,0.1)', borderWidth: 1, borderColor: 'rgba(247,147,26,0.3)', borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.lg, alignItems: 'center' },
  devCodeLabel: { fontSize: 11, color: COLORS.text3, marginBottom: 6 },
  devCodeVal: { fontSize: 32, fontWeight: '800', color: COLORS.orange, letterSpacing: 8 },
});
