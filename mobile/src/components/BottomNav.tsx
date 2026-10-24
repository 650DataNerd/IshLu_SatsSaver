import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING } from '../constants/theme';

interface BottomNavProps {
  active: string;
  onNavigate: (screen: string) => void;
}

const tabs = [
  { key: 'Dashboard', icon: '🏠', label: 'Home' },
  { key: 'Loan', icon: '⚡', label: 'Loans', primary: true },
  { key: 'Activity', icon: '📊', label: 'Activity' },
  { key: 'Profile', icon: '👤', label: 'Profile' },
];

export const BottomNav: React.FC<BottomNavProps> = ({ active, onNavigate }) => {
  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = active === tab.key;
        if (tab.primary) {
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.primaryTab}
              onPress={() => onNavigate(tab.key)}
              activeOpacity={0.8}
            >
              <View style={[styles.primaryBtn, isActive && styles.primaryBtnActive]}>
                <Text style={styles.primaryIcon}>{tab.icon}</Text>
              </View>
              <Text style={[styles.label, { color: isActive ? COLORS.orange : COLORS.text3 }]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        }
        return (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, isActive && styles.tabActive]}
            onPress={() => onNavigate(tab.key)}
            activeOpacity={0.7}
          >
            <Text style={styles.icon}>{tab.icon}</Text>
            <Text style={[styles.label, isActive && styles.labelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: 'rgba(8,12,8,0.97)',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingBottom: 20,
    paddingTop: 6,
    paddingHorizontal: SPACING.md,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: SPACING.sm, borderRadius: 12, gap: 3 },
  tabActive: { backgroundColor: 'rgba(200,146,42,0.08)' },
  primaryTab: { flex: 1, alignItems: 'center', paddingVertical: 4, gap: 3 },
  primaryBtn: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: COLORS.orange,
    alignItems: 'center', justifyContent: 'center',
    marginTop: -24,
    shadowColor: COLORS.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 8, elevation: 8
  },
  primaryBtnActive: { backgroundColor: COLORS.orangeLight },
  primaryIcon: { fontSize: 24 },
  icon: { fontSize: 20 },
  label: { fontSize: 9, color: COLORS.text3 },
  labelActive: { color: COLORS.orange },
});
