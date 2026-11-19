import { createBrowserClient } from "@supabase/ssr";
import { supabasePublishableKey, supabaseUrl } from "./env";

/** Cliente para Client Components (subida de fotos, etc.). Respeta RLS. */
export function createClient() {
  return createBrowserClient(supabaseUrl(), supabasePublishableKey());
}
