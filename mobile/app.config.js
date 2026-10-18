// app.config.js (plutot que app.json). Les variables EXPO_PUBLIC_* utilisees
// par l'app (voir src/lib/supabase.ts) sont chargees automatiquement par
// Expo CLI depuis le fichier .env a la racine du repo (../.env depuis ce
// dossier) — pas besoin de les reprendre ici.

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
    plugins: [
      "expo-notifications",
      [
        "expo-camera",
        {
          cameraPermission:
            "Anti-Scam Family utilise l'appareil photo pour scanner un QR code (ex: amende de stationnement) et verifier le lien avant de payer.",
        },
      ],
    ],
  },
};
