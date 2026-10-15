// app.config.js (plutot que app.json) pour pouvoir injecter les variables
// d'environnement Supabase dans `extra` au moment du build/start.
require("dotenv").config({ path: __dirname + "/../.env" });

module.exports = {
  expo: {
    name: "Anti-Scam Family",
    slug: "anti-scam-family",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    scheme: "antiscamfamily",
    ios: {
      supportsTablet: true,
      bundleIdentifier: "be.sbzinfinite.antiscamfamily",
    },
    android: {
      package: "be.sbzinfinite.antiscamfamily",
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/android-icon-foreground.png",
        backgroundImage: "./assets/android-icon-background.png",
        monochromeImage: "./assets/android-icon-monochrome.png",
      },
      predictiveBackGestureEnabled: false,
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    plugins: ["expo-notifications"],
    extra: {
      supabaseUrl: process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    },
  },
};
