import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(String(supabaseUrl), String(supabaseAnonKey), {
  auth: {
    // Without a storage adapter the session lives only in memory, so every
    // app restart — including a Metro reload — drops the user back to the
    // sign-in screen. async-storage was already a dependency; it just was
    // never wired in.
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    // Only meaningful for OAuth redirects in a browser; on React Native it
    // makes the client look for a URL fragment that never exists.
    detectSessionInUrl: false,
  },
});
