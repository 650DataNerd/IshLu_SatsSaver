import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, ScrollView
} from 'react-native';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { api } from '../services/api';

interface AkiliCardProps {
  explanation: string;
  score: number;
  tier: string;
  totalSats: number;
}

export const AkiliCard: React.FC<AkiliCardProps> = ({ explanation, score, tier, totalSats }) => {
  const [expanded, setExpanded] = useState(false);
  const [message, setMessage] = useState('');
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<{ q: string; a: string }[]>([]);

  const askAkili = async () => {
    if (!message.trim()) return;
    setLoading(true);
    const q = message.trim();
    setMessage('');
    try {
      const res = await api.post('/trust/chat', { message: q });
      setChatHistory(prev => [...prev, { q, a: res.data.reply }]);
      setReply(res.data.reply);
    } catch {
      setChatHistory(prev => [...prev, {
        q,
        a: "Samahani, I'm having trouble connecting. Try again shortly!"
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <TouchableOpacity style={styles.header} onPress={() => setExpanded(!expanded)}>
        <View style={styles.headerLeft}>
          <View style={styles.akiliAvatar}>
            <Text style={styles.akiliEmoji}>🤖</Text>
          </View>
          <View>
            <Text style={styles.akiliName}>Akili</Text>
            <Text style={styles.akiliRole}>Your Financial Coach</Text>
          </View>
        </View>
        <Text style={styles.expandIcon}>{expanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {/* Insight */}
      <Text style={styles.insight}>{explanation}</Text>

      {/* Expanded chat */}
      {expanded && (
        <View style={styles.chatSection}>
          <View style={styles.divider} />

          {/* Chat history */}
          {chatHistory.map((item, i) => (
            <View key={i} style={styles.chatItem}>
              <View style={styles.userBubble}>
                <Text style={styles.userText}>{item.q}</Text>
              </View>
              <View style={styles.akiliBubble}>
                <Text style={styles.akiliText}>{item.a}</Text>
              </View>
            </View>
          ))}

          {/* Quick questions */}
          {chatHistory.length === 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickQuestions}>
              {[
                'How do I improve my score?',
                'Can I get a loan?',
                'What are sats?',
                'How does M-Pesa work?',
              ].map((q, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.quickChip}
                  onPress={() => { setMessage(q); }}
                >
                  <Text style={styles.quickChipText}>{q}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Input */}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Ask Akili anything..."
              placeholderTextColor={COLORS.text3}
              value={message}
              onChangeText={setMessage}
              multiline
            />
            <TouchableOpacity
              style={[styles.sendBtn, !message.trim() && styles.sendBtnDisabled]}
              onPress={askAkili}
              disabled={loading || !message.trim()}
            >
              {loading
                ? <ActivityIndicator size="small" color="#000" />
                : <Text style={styles.sendIcon}>→</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(45,155,87,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(45,155,87,0.25)',
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  akiliAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(45,155,87,0.2)', alignItems: 'center', justifyContent: 'center' },
  akiliEmoji: { fontSize: 18 },
  akiliName: { fontSize: 14, fontWeight: '700', color: COLORS.greenLight },
  akiliRole: { fontSize: 10, color: COLORS.text3 },
  expandIcon: { color: COLORS.text3, fontSize: 12 },
  insight: { fontSize: 13, color: COLORS.text2, lineHeight: 20 },
  chatSection: { marginTop: SPACING.sm },
  divider: { height: 1, backgroundColor: 'rgba(45,155,87,0.2)', marginVertical: SPACING.sm },
  chatItem: { marginBottom: SPACING.sm },
  userBubble: { backgroundColor: COLORS.bg3, borderRadius: 12, padding: 10, alignSelf: 'flex-end', maxWidth: '80%', marginBottom: 6 },
  userText: { fontSize: 13, color: COLORS.text },
  akiliBubble: { backgroundColor: 'rgba(45,155,87,0.15)', borderRadius: 12, padding: 10, alignSelf: 'flex-start', maxWidth: '85%' },
  akiliText: { fontSize: 13, color: COLORS.text2, lineHeight: 19 },
  quickQuestions: { marginBottom: SPACING.sm },
  quickChip: { backgroundColor: COLORS.bg3, borderWidth: 1, borderColor: COLORS.border, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, marginRight: 8 },
  quickChipText: { fontSize: 12, color: COLORS.text2 },
  inputRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  input: { flex: 1, backgroundColor: COLORS.bg3, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 10, color: COLORS.text, fontSize: 13, maxHeight: 80 },
  sendBtn: { width: 40, height: 40, backgroundColor: COLORS.green, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
  sendIcon: { color: '#000', fontSize: 18, fontWeight: '700' },
});
