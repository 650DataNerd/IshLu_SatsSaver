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

export const LoginScreen = ({ navigation }: any) => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!phone.trim()) { Alert.alert('Enter your phone number'); return; }
    if (!password) { Alert.alert('Enter your password'); return; }
    setLoading(true);
    try {
      const res = await api.post('/auth/login', {
        phone: phone.trim(),
        password,
      });
      await saveToken(res.data.access_token);
      await AsyncStorage.setItem('user_phone', phone.trim());
      navigation.replace('Dashboard');
    } catch (e: any) {
      Alert.alert('Login Failed', e.response?.data?.detail || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#040704', '#080C08']} style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>

            <IshLuLogo />

            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.sub}>Sign in to your IshLu account</Text>

            <View style={styles.form}>
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

              <Text style={styles.label}>PASSWORD</Text>
              <TextInput
                style={styles.input}
                placeholder="Your password"
                placeholderTextColor={COLORS.text3}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />

              <TouchableOpacity
                onPress={() => navigation.navigate('ForgotPassword')}
              >
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.btn, (!phone || !password) && styles.btnDisabled]}
              onPress={handleLogin}
              disabled={loading || !phone || !password}
            >
              {loading
                ? <ActivityIndicator color="#000" />
                : <Text style={styles.btnText}>Sign In →</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.registerLink}
              onPress={() => navigation.navigate('Register')}
            >
              <Text style={styles.registerText}>
                New to IshLu? <Text style={styles.registerAccent}>Create account</Text>
              </Text>
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
  title: {
    fontSize: 28, fontWeight: '800',
    color: COLORS.text,
    marginTop: SPACING.lg, marginBottom: 6,
  },
  sub: { fontSize: 14, color: COLORS.text2, marginBottom: SPACING.xl },
  form: { marginBottom: SPACING.lg },
  label: {
    fontSize: 10, color: COLORS.text3,
    letterSpacing: 2, marginBottom: SPACING.sm,
  },
  input: {
    backgroundColor: COLORS.card,
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: 16, color: COLORS.text,
    fontSize: 15, marginBottom: SPACING.lg,
  },
  forgotText: {
    fontSize: 13, color: COLORS.orange,
    textAlign: 'right', marginTop: -8,
  },
  btn: {
    backgroundColor: COLORS.orange,
    borderRadius: RADIUS.lg,
    padding: 18, alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#000', fontSize: 16, fontWeight: '800' },
  registerLink: { alignItems: 'center' },
  registerText: { color: COLORS.text2, fontSize: 14 },
  registerAccent: { color: COLORS.orange },
});
