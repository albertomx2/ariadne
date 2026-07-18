import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function hasAiAccess() {
  // Local development without Supabase keeps the Ollama workflow available.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return true;

  const supabase = await createClient();
  if (!supabase) return false;
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  return Boolean(user && !error);
}
