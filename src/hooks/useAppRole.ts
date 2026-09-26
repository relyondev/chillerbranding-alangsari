import { useEffect, useState } from "react";
import { getSupabaseClient } from "../lib/supabase/client";

export type AppRole = "super_admin" | "admin" | "pic" | "client";

export function useAppRole() {
  const [role, setRole] = useState<AppRole | null>(null);
  const [fullName, setFullName] = useState("Memuat...");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const supabase = getSupabaseClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("role,full_name,is_active")
          .eq("id", user.id)
          .single();

        if (error || !profile?.is_active) return;

        if (!cancelled) {
          setRole(profile.role as AppRole);
          setFullName(profile.full_name || user.email || "User");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { role, fullName, loading };
}
