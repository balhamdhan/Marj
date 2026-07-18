import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  // This will show clearly in the browser console if env vars are missing —
  // makes it obvious to debug rather than failing silently.
  console.warn(
    "Supabase env vars are missing. Check that NEXT_PUBLIC_SUPABASE_URL and " +
      "NEXT_PUBLIC_SUPABASE_ANON_KEY are set in your .env.local (locally) or " +
      "in your Vercel project's Environment Variables (when deployed)."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
