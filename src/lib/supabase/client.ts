import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ydophhbpkfurlspxczug.supabase.co";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_DgQ4CFJc1Qi1t_Q0TvlVgw_YSPuN_07";

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
