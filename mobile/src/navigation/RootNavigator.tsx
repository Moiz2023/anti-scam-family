import React from "react";
import { View, ActivityIndicator } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
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

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type AppStackParamList = {
  Home: undefined;
  Check: undefined;
  Result: { result: AnalyzeResult };
  CallFamily: undefined;
  Help: undefined;
  Family: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
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
      <AppStack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <AppStack.Screen name="Check" component={CheckScreen} options={{ title: "Vérifier" }} />
      <AppStack.Screen name="Result" component={ResultScreen} options={{ title: "Résultat" }} />
      <AppStack.Screen
        name="CallFamily"
        component={CallFamilyScreen}
        options={{ title: "Appeler la famille" }}
      />
      <AppStack.Screen name="Help" component={HelpScreen} options={{ title: "Aide" }} />
      <AppStack.Screen name="Family" component={FamilyScreen} options={{ title: "Ma famille" }} />
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
