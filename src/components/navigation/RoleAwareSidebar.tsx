import { ChevronDown, LogOut, Menu, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAppRole } from "../../hooks/useAppRole";
import { menuByRole } from "../../lib/navigation/menu";
import { getSupabaseClient } from "../../lib/supabase/client";

const roleLabel = {
  super_admin: "Super Admin",
  admin: "Admin",
  pic: "PIC",
  client: "Klien",
};

function LinkItem({ item, onClick, nested = false }: any) {
  const Icon = item.icon;
  const [locationKey, setLocationKey] = useState("");

  useEffect(() => {
    setLocationKey(`${window.location.pathname}${window.location.search}`);
  }, []);

  const itemHasQuery = item.href.includes("?");
  const active =
    locationKey !== "" &&
    (
      itemHasQuery
        ? locationKey === item.href
        : locationKey.split("?")[0] === item.href
    );

  return (
    <a
      href={item.href}
      onClick={onClick}
      style={{ color: active ? "#FFFFFF" : "#CBD5E1" }}
      className={`flex min-w-0 items-center gap-3 rounded-xl text-sm font-medium transition ${
        nested ? "px-3 py-2.5" : "px-4 py-3"
      } ${
        active
          ? "bg-[#1565EF] shadow-[0_10px_30px_rgba(21,101,239,.28)]"
          : "hover:bg-white/10 hover:!text-white"
      }`}
    >
      <Icon size={nested ? 16 : 18} strokeWidth={1.9} className="shrink-0" />
      <span className="truncate">{item.label}</span>
    </a>
  );
}

function NavContent({ mobile = false, close }: { mobile?: boolean; close?: () => void }) {
  const { role, loading } = useAppRole();
  const groups = role ? (menuByRole[role] ?? []) : [];

  if (loading || !role) {
    return (
      <div className="flex flex-1 flex-col gap-4 px-4 py-6">
        <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
          <div className="h-3 w-12 animate-pulse rounded bg-white/10" />
          <div className="mt-2 h-5 w-24 animate-pulse rounded bg-white/10" />
        </div>

        <div className="space-y-3">
          <div className="h-11 animate-pulse rounded-xl bg-white/10" />
          <div className="h-11 animate-pulse rounded-xl bg-white/10" />
          <div className="h-11 animate-pulse rounded-xl bg-white/10" />
          <div className="h-11 animate-pulse rounded-xl bg-white/10" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="px-4 pt-4">
        <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#4DB6FF]">Role</p>
          <p className="mt-1 text-sm font-semibold text-white">{roleLabel[role]}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto p-4">
        {groups.map((group, idx) => {
          if (!group.label) return <div key={idx} className="space-y-1">{group.items.map((item) => <LinkItem key={item.href} item={item} onClick={close} />)}</div>;
          const GroupIcon = group.icon;
          return (
            <details key={group.label} open className="group rounded-xl">
              <summary className="flex cursor-pointer list-none items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-white/10">
                <GroupIcon size={18} />
                <span className="flex-1">{group.label}</span>
                <ChevronDown size={16} className="transition group-open:rotate-180" />
              </summary>
              <div className="ml-5 mt-1 space-y-1 border-l border-white/15 pl-3 pb-2">
                {group.items.map((item) => <LinkItem key={`${group.label}-${item.label}`} item={item} onClick={close} nested />)}
              </div>
            </details>
          );
        })}
      </nav>
    </>
  );
}


function LogoutButton({ onDone }: { onDone?: () => void }) {
  const [loading, setLoading] = useState(false);

  async function logout() {
    if (loading) return;
    setLoading(true);

    try {
      const supabase = getSupabaseClient();
      await supabase.auth.signOut();
    } finally {
      onDone?.();
      window.location.href = "/login";
    }
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={loading}
      className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white disabled:opacity-60"
    >
      <LogOut size={18} />
      <span>{loading ? "Keluar..." : "Logout"}</span>
    </button>
  );
}

export default function RoleAwareSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-white/10 bg-[#0B1D3A] lg:flex lg:flex-col">
        <div className="flex h-20 items-center border-b border-white/10 px-7">
          <div>
            <p className="text-lg font-bold tracking-tight text-white">Branding Ops</p>
            <p className="text-xs font-medium text-[#BEE6FF]">Operational System</p>
          </div>
        </div>
        <NavContent />
        <div className="border-t border-white/10 p-4">
          <LogoutButton />
        </div>
      </aside>

      <button
        onClick={() => setOpen(true)}
        className="fixed left-4 top-5 z-30 flex h-10 w-10 items-center justify-center rounded-xl border border-[#BEE6FF] bg-white text-[#0B1D3A] shadow-sm lg:hidden"
        aria-label="Buka menu"
      >
        <Menu size={20} />
      </button>

      {open && <button aria-label="Tutup menu" className="fixed inset-0 z-40 bg-[#0B1D3A]/50 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-[#0B1D3A] shadow-2xl transition-transform lg:hidden ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-20 items-center justify-between border-b border-white/10 px-6">
          <div>
            <p className="font-bold text-white">Branding Ops</p>
            <p className="text-xs text-[#BEE6FF]">Operational System</p>
          </div>
          <button className="text-white" onClick={() => setOpen(false)} aria-label="Tutup menu"><X size={22} /></button>
        </div>
        <NavContent mobile close={() => setOpen(false)} />
        <div className="border-t border-white/10 p-4">
          <LogoutButton onDone={() => setOpen(false)} />
        </div>
      </aside>
    </>
  );
}
