import { Mail, Phone, ShieldCheck, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { getSupabaseClient } from "../../lib/supabase/client";

type Profile = {
  full_name: string;
  email: string | null;
  phone: string | null;
  role: "super_admin" | "admin" | "pic" | "client";
};

const roleLabel: Record<Profile["role"], string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  pic: "PIC",
  client: "Klien",
};

export default function AccountPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
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

        const { data, error } = await supabase
          .from("profiles")
          .select("full_name,email,phone,role")
          .eq("id", user.id)
          .single();

        if (error) throw error;

        if (!cancelled) {
          setProfile({
            full_name: data.full_name ?? "-",
            email: data.email ?? user.email ?? null,
            phone: data.phone ?? null,
            role: data.role,
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="mx-auto max-w-5xl">
      <div>
        <h2 className="text-2xl font-bold text-[#0B1D3A]">Pengaturan Akun</h2>
        <p className="mt-1 text-sm text-slate-500">
          Informasi akun yang sedang digunakan untuk masuk ke sistem.
        </p>
      </div>

      <div className="brand-card mt-6 rounded-3xl p-5 sm:p-7">
        <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--role-pale)] text-[var(--role-accent)]">
            <UserRound size={22} />
          </div>
          <div>
            <p className="text-sm text-slate-400">Profil</p>
            <p className="mt-1 font-semibold text-[#0B1D3A]">
              {loading ? "Memuat..." : profile?.full_name ?? "-"}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-[#FBFDFF] p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <Mail size={15} />
              Email
            </div>
            <p className="mt-2 break-all text-sm font-semibold text-[#0B1D3A]">
              {loading ? "Memuat..." : profile?.email ?? "-"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-[#FBFDFF] p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <Phone size={15} />
              Nomor Telepon
            </div>
            <p className="mt-2 text-sm font-semibold text-[#0B1D3A]">
              {loading ? "Memuat..." : profile?.phone || "-"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-[#FBFDFF] p-4 md:col-span-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <ShieldCheck size={15} />
              Role
            </div>
            <p className="mt-2 text-sm font-semibold text-[#0B1D3A]">
              {loading ? "Memuat..." : profile ? roleLabel[profile.role] : "-"}
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-dashed border-[var(--role-border)] bg-[var(--role-pale)] px-4 py-3 text-xs leading-5 text-slate-500">
          Perubahan email dan password akan ditambahkan pada versi berikutnya.
        </div>
      </div>
    </section>
  );
}
