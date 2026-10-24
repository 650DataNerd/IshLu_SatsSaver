import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants/theme';

export const IshLuLogo = () => {
  return (
    <View>
      <Text style={styles.main}>
        Ish<Text style={styles.accent}>Lu</Text>
      </Text>
      <Text style={styles.sub}>BITCOIN LOANS</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  main: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  accent: { color: COLORS.orangeLight },
  sub: {
    fontSize: 10,
    color: COLORS.text3,
    letterSpacing: 3,
    fontWeight: '600',
  },
});
