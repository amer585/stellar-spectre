import { supabase } from "@/integrations/supabase/client";

function clearLocalSupabaseState() {
  try {
    // Remove localStorage keys that supabase uses
    Object.keys(localStorage).forEach((k) => {
      const kl = k.toLowerCase();
      if (kl.startsWith('supabase') || kl.startsWith('sb-') || kl.includes('supabase')) {
        localStorage.removeItem(k);
      }
    });

    // Remove cookie keys related to sb/supabase (best effort)
    document.cookie.split(';').forEach((entry) => {
      const name = entry.split('=')[0].trim();
      if (!name) return;
      if (name.toLowerCase().includes('sb-') || name.toLowerCase().includes('supabase')) {
        document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT;`;
      }
    });
  } catch (e) {
    console.warn('clearLocalSupabaseState failed', e);
  }
}

export async function logoutSafe({ redirectTo }: { redirectTo?: string } = {}) {
  try {
    // 1) Check if a session exists server-side / client-side
    const { data: sessionData, error: getSessionError } = await supabase.auth.getSession();
    if (getSessionError) {
      console.warn('getSession error', getSessionError);
    }

    // If no session object, treat as already-signed-out: clear and return success
    if (!sessionData?.session) {
      clearLocalSupabaseState();
      return { ok: true, reason: 'no-session' };
    }

    // 2) Attempt signOut; handle both returned error and thrown errors
    const { error } = await supabase.auth.signOut();
    if (error) {
      const msg = String(error?.message || '');
      // If server says session not found or returns 403, treat as success:
      if (msg.includes('session_not_found') || error?.status === 403 || error?.code === 'session_not_found') {
        clearLocalSupabaseState();
        return { ok: true, reason: 'session_not_found_ignored' };
      }
      // otherwise return failure info
      return { ok: false, error };
    }

    // success path
    clearLocalSupabaseState();
    return { ok: true };
  } catch (err: any) {
    const msg = String(err?.message || err || '');
    if (msg.includes('session_not_found') || err?.status === 403) {
      clearLocalSupabaseState();
      return { ok: true, reason: 'session_not_found_ignored' };
    }
    console.error('Unexpected logout error', err);
    return { ok: false, error: err };
  }
}