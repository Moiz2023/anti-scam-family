import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

// Metro inline ces variables EXPO_PUBLIC_* au moment du build (web et natif).
// Contrairement a Constants.expoConfig.extra, ca fonctionne de facon fiable
// sur toutes les plateformes, y compris `expo start --web`.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "SUPABASE_URL / SUPABASE_ANON_KEY manquants. Renseigne-les dans le fichier .env " +
      "a la racine du projet (voir .env.example).",
  );
}

export const supabase = createClient(supabaseUrl ?? "", supabaseAnonKey ?? "", {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
