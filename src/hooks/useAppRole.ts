import { useEffect, useState } from "react";
import { getSupabaseClient } from "../lib/supabase/client";

export type AppRole = "super_admin" | "admin" | "pic" | "client";

export function useAppRole() {
  const [role, setRole] = useState<AppRole | null>(null);
  const [fullName, setFullName] = useState("Memuat...");
  const [picCode, setPicCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const supabase = getSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("role,full_name,is_active")
          .eq("id", user.id)
          .single();

        if (error || !profile?.is_active) return;

        let resolvedPicCode: string | null = null;
        if (profile.role === "pic") {
          const { data: pic } = await supabase
            .from("pic_profiles")
            .select("pic_code")
            .eq("user_id", user.id)
            .maybeSingle();
          resolvedPicCode = pic?.pic_code ?? null;
        }

        if (!cancelled) {
          const resolvedRole = profile.role as AppRole;
          setRole(resolvedRole);
          setFullName(profile.full_name || user.email || "User");
          setPicCode(resolvedPicCode);
          document.documentElement.dataset.role = resolvedRole;
          try { localStorage.setItem("branding-ops-role", resolvedRole); } catch {}
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return { role, fullName, picCode, loading };
}
