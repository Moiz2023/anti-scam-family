import React from "react";
import { View, ActivityIndicator } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../lib/AuthContext";
import { colors } from "../theme/colors";
import type { AnalyzeResult } from "../lib/api";

import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import HomeScreen from "../screens/HomeScreen";
import CheckScreen from "../screens/CheckScreen";
import ResultScreen from "../screens/ResultScreen";
import CallFamilyScreen from "../screens/CallFamilyScreen";
import HelpScreen from "../screens/HelpScreen";
import FamilyScreen from "../screens/FamilyScreen";
import QrScanScreen from "../screens/QrScanScreen";
import ConsentScreen from "../screens/ConsentScreen";

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type TabParamList = {
  HomeTab: undefined;
  FamilyTab: undefined;
  HelpTab: undefined;
};

export type AppStackParamList = {
  Tabs: undefined;
  Check: { prefillLink?: string } | undefined;
  Result: { result: AnalyzeResult; isPhoneCheck?: boolean; readOnly?: boolean };
  CallFamily: undefined;
  QrScan: undefined;
  Consent: undefined;
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

const TAB_ICONS: Record<keyof TabParamList, keyof typeof Ionicons.glyphMap> = {
  HomeTab: "home",
  FamilyTab: "people",
  HelpTab: "help-buoy",
};

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: route.name === "HomeTab" ? false : true,
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTitleStyle: { color: colors.text, fontWeight: "700" as const },
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={TAB_ICONS[route.name]} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeScreen} options={{ title: "Accueil" }} />
      <Tab.Screen name="FamilyTab" component={FamilyScreen} options={{ title: "Famille" }} />
      <Tab.Screen name="HelpTab" component={HelpScreen} options={{ title: "Aide" }} />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  return (
    <AppStack.Navigator
      screenOptions={{
        headerTintColor: colors.brand,
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTitleStyle: { color: colors.text, fontWeight: "700" },
      }}
    >
      <AppStack.Screen name="Tabs" component={TabNavigator} options={{ headerShown: false }} />
      <AppStack.Screen name="Check" component={CheckScreen} options={{ title: "Vérifier" }} />
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
    </AppStack.Navigator>
  );
}

export default function RootNavigator() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {session ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
