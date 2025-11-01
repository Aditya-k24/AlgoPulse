import 'dotenv/config';

export default {
  expo: {
    name: "AlgoPulse",
    slug: "algopulse",
    version: "1.0.0",
    orientation: "portrait",
    userInterfaceStyle: "dark",
    sdkVersion: "54.0.0",
    scheme: "algopulse",
    splash: {
      resizeMode: "contain",
      backgroundColor: "#0B0F14"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.algopulse.app"
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#0B0F14"
      },
      package: "com.algopulse.app"
    },
    plugins: [
      ["expo-notifications"]
    ],
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    }
  }
};

