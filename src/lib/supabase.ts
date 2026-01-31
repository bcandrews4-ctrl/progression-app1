import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfigError = (() => {
  if (!supabaseUrl || !supabaseAnonKey) {
    return "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.";
  }
  if (supabaseAnonKey.startsWith("sb_publishable_")) {
    return "Supabase publishable key detected. Use the anon key from Settings -> API.";
  }
  return null;
})();

export const supabaseConfigured = !supabaseConfigError;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ Supabase env vars missing!");
  console.error("URL:", supabaseUrl ? "✅ Set" : "❌ Missing");
  console.error("Key:", supabaseAnonKey ? "✅ Set" : "❌ Missing");
  console.error("Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are in .env.local");
}

if (supabaseAnonKey && supabaseAnonKey.startsWith("sb_publishable_")) {
  console.warn("⚠️ You're using a publishable key. For auth, you need the 'anon' key from Settings → API → Project API keys");
}

export const supabase = createClient(supabaseUrl ?? "", supabaseAnonKey ?? "");
