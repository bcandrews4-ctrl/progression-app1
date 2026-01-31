import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Only log errors in development
const isDev = import.meta.env.DEV;

if (!supabaseUrl || !supabaseAnonKey) {
  if (isDev) {
    console.error("❌ Supabase env vars missing!");
    console.error("URL:", supabaseUrl ? "✅ Set" : "❌ Missing");
    console.error("Key:", supabaseAnonKey ? "✅ Set" : "❌ Missing");
    console.error("Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in Vercel environment variables");
  }
}

if (isDev && supabaseAnonKey && supabaseAnonKey.startsWith("sb_publishable_")) {
  console.warn("⚠️ You're using a publishable key. For auth, you need the 'anon' key from Settings → API → Project API keys");
}

// Create client with fallback empty strings (will fail gracefully)
export const supabase = createClient(
  supabaseUrl || "",
  supabaseAnonKey || "",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
