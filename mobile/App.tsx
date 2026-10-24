import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { RegisterScreen } from './src/screens/RegisterScreen';
import { ForgotPasswordScreen } from './src/screens/ForgotPasswordScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { LoanScreen } from './src/screens/LoanScreen';
import { ActivityScreen } from './src/screens/ActivityScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { DepositScreen } from './src/screens/DepositScreen';
import { getToken } from './src/services/api';
import { COLORS } from './src/constants/theme';

const Stack = createStackNavigator();

export default function App() {
  const [initialRoute, setInitialRoute] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await getToken();
        setInitialRoute(token ? 'Dashboard' : 'Onboarding');
      } catch {
        setInitialRoute('Onboarding');
      }
    };
    checkAuth();
  }, []);

  if (!initialRoute) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <ActivityIndicator size="large" color={COLORS.orange} />
        <Text style={{ color: COLORS.text2, fontSize: 13 }}>IshLu — Bitcoin Loans</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <StatusBar style="light" backgroundColor={COLORS.bg} />
        <Stack.Navigator
          initialRouteName={initialRoute}
          screenOptions={{ headerShown: false, cardStyle: { backgroundColor: COLORS.bg } }}
        >
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="Dashboard" component={DashboardScreen} />
          <Stack.Screen name="Loan" component={LoanScreen} />
          <Stack.Screen name="Activity" component={ActivityScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="Deposit" component={DepositScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
