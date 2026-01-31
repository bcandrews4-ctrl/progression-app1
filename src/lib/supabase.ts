import { createClient } from "@supabase/supabase-js";

let supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Normalize URL: remove trailing slash if present
if (supabaseUrl) {
  supabaseUrl = supabaseUrl.replace(/\/+$/, "");
}

// Only log errors in development
const isDev = import.meta.env.DEV;

if (!supabaseUrl || !supabaseAnonKey) {
  const errorMsg = "❌ Supabase env vars missing!";
  if (isDev) {
    console.error(errorMsg);
    console.error("URL:", supabaseUrl ? "✅ Set" : "❌ Missing");
    console.error("Key:", supabaseAnonKey ? "✅ Set" : "❌ Missing");
    console.error("Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in Vercel environment variables");
  } else {
    // In production, log to console but don't break the app
    console.error(errorMsg);
  }
}

if (isDev && supabaseAnonKey && supabaseAnonKey.startsWith("sb_publishable_")) {
  console.warn("⚠️ You're using a publishable key. For auth, you need the 'anon' key from Settings → API → Project API keys");
}

// Validate URL format
if (supabaseUrl && !supabaseUrl.startsWith("https://")) {
  console.error("❌ Invalid Supabase URL format. Must start with https://");
}

// Create client - throw error if critical config is missing
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ Cannot initialize Supabase client: missing credentials");
}

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    global: {
      headers: {
        "x-client-info": "gym-progression-app",
      },
    },
  }
);
