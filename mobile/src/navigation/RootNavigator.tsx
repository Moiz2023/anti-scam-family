import React from "react";
import { View, ActivityIndicator } from "react-native";
import { NavigationContainer, type NavigatorScreenParams } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useAuth } from "../lib/AuthContext";
import { colors } from "../theme/colors";
import type { AnalyzeResult } from "../lib/api";
import CustomTabBar from "./TabBar";

import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import HomeScreen from "../screens/HomeScreen";
import CheckScreen from "../screens/CheckScreen";
import ActivityScreen from "../screens/ActivityScreen";
import EmergencyScreen from "../screens/EmergencyScreen";
import ResultScreen from "../screens/ResultScreen";
import CallFamilyScreen from "../screens/CallFamilyScreen";
import FamilyScreen from "../screens/FamilyScreen";
import QrScanScreen from "../screens/QrScanScreen";
import ConsentScreen from "../screens/ConsentScreen";
import AccountScreen from "../screens/AccountScreen";

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type TabParamList = {
  DashboardTab: undefined;
  ScanTab: { prefillLink?: string } | undefined;
  ActivityTab: undefined;
  EmergencyTab: undefined;
};

export type AppStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  Result: { result: AnalyzeResult; isPhoneCheck?: boolean; readOnly?: boolean };
  CallFamily: undefined;
  QrScan: undefined;
  Consent: undefined;
  Account: undefined;
  FamilyManage: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tab.Screen name="DashboardTab" component={HomeScreen} />
      <Tab.Screen name="ScanTab" component={CheckScreen} />
      <Tab.Screen name="ActivityTab" component={ActivityScreen} />
      <Tab.Screen name="EmergencyTab" component={EmergencyScreen} />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  return (
    <AppStack.Navigator
      screenOptions={{
        headerTintColor: colors.ink,
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTitleStyle: { color: colors.text, fontWeight: "700" },
      }}
    >
      <AppStack.Screen name="Tabs" component={TabNavigator} options={{ headerShown: false }} />
      <AppStack.Screen name="Result" component={ResultScreen} options={{ title: "Résultat" }} />
      <AppStack.Screen
        name="CallFamily"
        component={CallFamilyScreen}
        options={{ title: "Appeler la famille" }}
      />
      <AppStack.Screen
        name="QrScan"
        component={QrScanScreen}
        options={{ title: "Scanner un QR code", headerTintColor: "#fff", headerStyle: { backgroundColor: colors.dark } }}
      />
      <AppStack.Screen name="Consent" component={ConsentScreen} options={{ title: "Partage avec la famille" }} />
      <AppStack.Screen name="Account" component={AccountScreen} options={{ title: "Mon compte" }} />
      <AppStack.Screen name="FamilyManage" component={FamilyScreen} options={{ title: "Ma famille" }} />
    </AppStack.Navigator>
  );
}

export default function RootNavigator() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.ink} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {session ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
