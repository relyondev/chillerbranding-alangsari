import {
  CircleUserRound,
  LogOut,
  UserRound,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAppRole } from "../../hooks/useAppRole";
import { getSupabaseClient } from "../../lib/supabase/client";

const label = {
  super_admin: "Super Admin",
  admin: "Admin",
  pic: "PIC",
  client: "Klien",
};

export default function Topbar({ title }: { title: string }) {
  const { role, fullName } = useAppRole();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleOutside(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);

    try {
      const supabase = getSupabaseClient();
      await supabase.auth.signOut();
    } finally {
      window.location.href = "/login";
    }
  }

  return (
    <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-[#1565EF]/10 bg-white/90 px-4 pl-16 backdrop-blur-xl sm:px-6 sm:pl-16 lg:px-8 lg:pl-8">
      <div>
        <h1 className="text-lg font-semibold text-[#0B1D3A] sm:text-xl">
          {title}
        </h1>
        <p className="hidden text-xs text-slate-400 sm:block">
          Sistem Operasional Branding Warung
        </p>
      </div>

      <div ref={wrapperRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex items-center gap-3 rounded-2xl p-1.5 transition hover:bg-[#F5F9FF]"
          aria-label="Buka menu profile"
          aria-expanded={open}
        >
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold text-[#0B1D3A]">
              {fullName}
            </p>
            <p className="text-xs text-slate-400">
              {role ? label[role] : "Memuat..."}
            </p>
          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1565EF] text-white shadow-sm">
            <CircleUserRound size={21} />
          </div>
        </button>

        {open && (
          <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-64 overflow-hidden rounded-2xl border border-[#DCE8F7] bg-white shadow-[0_18px_50px_rgba(15,42,82,.16)]">
            <div className="border-b border-slate-100 px-4 py-4">
              <p className="truncate text-sm font-semibold text-[#0B1D3A]">
                {fullName}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                {role ? label[role] : "Memuat..."}
              </p>
            </div>

            <div className="p-2">
              <a
                href="/app/account"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-[#F5F9FF] hover:text-[#1565EF]"
              >
                <UserRound size={17} />
                Akun
              </a>

              <button
                type="button"
                onClick={logout}
                disabled={loggingOut}
                className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60"
              >
                <LogOut size={17} />
                {loggingOut ? "Keluar..." : "Logout"}
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
