import { notify } from "../../components/ui/ToastHost";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  KeyRound,
  ChevronDown,
  Search,
  UserPlus,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseClient } from "../../lib/supabase/client";
import { useAppRole } from "../../hooks/useAppRole";

type Branch = {
  id: string;
  code: string;
  name: string;
};

type Stockpoint = {
  id: string;
  branch_id: string;
  code: string;
  name: string;
  is_active: boolean;
};

type Assignment = {
  stockpoint_id: string;
  pic_user_id: string;
};

function StockpointPicker({
  stockpoints,
  selected,
  occupiedIds,
  onChange,
}: {
  stockpoints: Stockpoint[];
  selected: string[];
  occupiedIds: Set<string>;
  onChange: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocumentClick(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onDocumentClick);
    return () => document.removeEventListener("mousedown", onDocumentClick);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return stockpoints.filter((sp) => {
      if (!q) return true;

      return `${sp.code} ${sp.name}`
        .toLowerCase()
        .includes(q);
    });
  }, [stockpoints, query]);

  const selectedRows = stockpoints.filter((sp) =>
    selected.includes(sp.id)
  );

  function toggle(id: string) {
    if (occupiedIds.has(id)) return;

    if (selected.includes(id)) {
      onChange(selected.filter((value) => value !== id));
    } else {
      onChange([...selected, id]);
    }
  }

  function remove(id: string) {
    onChange(selected.filter((value) => value !== id));
  }

  return (
    <div ref={wrapperRef} className="relative">
      <label className="text-sm font-semibold text-slate-600">
        Stockpoint
      </label>

      <div className="mt-2 rounded-2xl border border-slate-200 bg-white p-3">
        {selectedRows.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {selectedRows.map((sp) => (
              <span
                key={sp.id}
                className="inline-flex max-w-full items-center gap-2 rounded-full bg-[var(--role-pale)] px-3 py-1.5 text-xs font-semibold text-[var(--role-accent)]"
              >
                <span className="truncate">
                  {sp.code} · {sp.name}
                </span>

                <button
                  type="button"
                  onClick={() => remove(sp.id)}
                  className="shrink-0 rounded-full p-0.5 hover:bg-[#DCEEFF]"
                  aria-label={`Hapus ${sp.name}`}
                >
                  <X size={13} />
                </button>
              </span>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-[#F9FBFE] px-4 py-3 text-left text-sm"
        >
          <Search size={17} className="shrink-0 text-slate-400" />

          <span className="flex-1 text-slate-500">
            {selected.length > 0
              ? `${selected.length} stockpoint dipilih`
              : "Cari dan pilih stockpoint"}
          </span>

          <ChevronDown
            size={17}
            className={`shrink-0 text-slate-400 transition ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>

      {open && (
        <div className="absolute z-[100] mt-2 w-full overflow-hidden rounded-2xl border border-[#DCE8F7] bg-white shadow-[0_18px_50px_rgba(15,42,82,.16)]">
          <div className="border-b border-slate-100 p-3">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                autoFocus
                value={query}
                onChange={(event) =>
                  setQuery(event.target.value)
                }
                placeholder="Cari kode atau nama stockpoint..."
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[var(--role-accent)] focus:ring-4 focus:ring-[var(--role-border)]"
              />
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto p-2">
            {filtered.length === 0 ? (
              <div className="px-3 py-8 text-center text-sm text-slate-400">
                Stockpoint tidak ditemukan.
              </div>
            ) : (
              filtered.map((sp) => {
                const checked = selected.includes(sp.id);
                const occupied = occupiedIds.has(sp.id);

                return (
                  <button
                    key={sp.id}
                    type="button"
                    disabled={occupied}
                    onClick={() => toggle(sp.id)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${
                      occupied
                        ? "cursor-not-allowed bg-slate-50 opacity-55"
                        : "hover:bg-[var(--role-pale)]"
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                        checked
                          ? "border-[var(--role-accent)] bg-[var(--role-accent)] text-white"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {checked && <Check size={13} />}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-semibold text-[var(--role-accent)]">
                        {sp.code}
                      </span>

                      <span className="mt-0.5 block truncate text-sm font-medium text-[#0B1D3A]">
                        {sp.name}
                      </span>
                    </span>

                    {occupied && (
                      <span className="shrink-0 rounded-full bg-slate-200 px-2.5 py-1 text-[10px] font-semibold text-slate-500">
                        Sudah terpakai
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      <p className="mt-2 text-xs text-slate-400">
        PIC bisa memiliki beberapa Stockpoint, tetapi setiap Stockpoint
        hanya boleh memiliki satu PIC aktif.
      </p>
    </div>
  );
}

export default function UserManagementPage() {
  const { role: actorRole } = useAppRole();
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);

  const [branches, setBranches] = useState<Branch[]>([]);
  const [stockpoints, setStockpoints] = useState<Stockpoint[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  const [role, setRole] = useState("pic");
  const [branchId, setBranchId] = useState("");
  const [selectedStockpoints, setSelectedStockpoints] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("");
  const [sortKey, setSortKey] = useState("full_name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [pageSize, setPageSize] = useState("10");
  const [page, setPage] = useState(1);
  const [resetTarget, setResetTarget] = useState<any | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState("");
  const [resettingPassword, setResettingPassword] = useState(false);

  async function load() {
    try {
      const s = getSupabaseClient();

      const [
        { data: users },
        { data: branchRows },
        { data: stockpointRows },
        { data: assignmentRows },
      ] = await Promise.all([
        s.from("profiles")
          .select(
            "id,full_name,phone,role,is_active,email,pic_profiles(pic_code,branch_id)"
          )
          .order("created_at", { ascending: false }),

        s.from("branches")
          .select("id,code,name")
          .eq("is_active", true)
          .order("name"),

        s.from("stockpoints")
          .select("id,branch_id,code,name,is_active")
          .eq("is_active", true)
          .order("name"),

        s.from("pic_stockpoint_assignments")
          .select("stockpoint_id,pic_user_id")
          .eq("is_active", true),
      ]);

      setRows(users ?? []);
      setBranches((branchRows ?? []) as Branch[]);
      setStockpoints((stockpointRows ?? []) as Stockpoint[]);
      setAssignments((assignmentRows ?? []) as Assignment[]);
    } catch {
      setRows([]);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    setSelectedStockpoints([]);
  }, [branchId]);

  useEffect(() => {
    if (role !== "pic") {
      setBranchId("");
      setSelectedStockpoints([]);
    }
  }, [role]);

  const availableStockpoints = useMemo(
    () =>
      stockpoints.filter(
        (sp) => sp.branch_id === branchId
      ),
    [stockpoints, branchId]
  );

  const occupiedIds = useMemo(
    () =>
      new Set(
        assignments.map((row) => row.stockpoint_id)
      ),
    [assignments]
  );

  function resetForm() {
    setRole("pic");
    setBranchId("");
    setSelectedStockpoints([]);
  }

  async function submit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const form = event.currentTarget;
    const fd = new FormData(form);

    if (role === "pic") {
      if (!branchId) {
        notify("error","Branch wajib dipilih","Pilih Branch untuk user PIC.");
        return;
      }

      if (selectedStockpoints.length === 0) {
        notify("error","Stockpoint wajib dipilih","Pilih minimal 1 Stockpoint untuk PIC.");
        return;
      }
    }

    const password = String(fd.get("password") ?? "");
    const passwordConfirm = String(fd.get("password_confirm") ?? "");

    if (password.length < 8) {
      notify("error","Password terlalu pendek","Password awal minimal 8 karakter.");
      return;
    }

    if (password !== passwordConfirm) {
      notify("error","Konfirmasi password berbeda","Ulangi password dengan nilai yang sama.");
      return;
    }

    const payload = {
      email: fd.get("email"),
      full_name: fd.get("full_name"),
      phone: fd.get("phone"),
      password,
      role,
      branch_id: role === "pic" ? branchId : null,
      stockpoint_ids:
        role === "pic" ? selectedStockpoints : [],
    };

    setSaving(true);

    try {
      const s = getSupabaseClient();
      const {
        data: { session },
      } = await s.auth.getSession();

      const res = await fetch(
        `${import.meta.env.PUBLIC_SUPABASE_URL}/functions/v1/admin-create-user`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      const response = await res
        .json()
        .catch(() => ({ error: "create_user_failed" }));

      if (!res.ok) {
        throw new Error(
          response.error || "Gagal membuat user."
        );
      }

      notify(
        "success",
        "User berhasil dibuat",
        response.pic_code
          ? `Akun aktif. ID PIC: ${response.pic_code}`
          : "Akun langsung aktif dan siap digunakan."
      );

      form.reset();
      resetForm();
      setOpen(false);
      await load();
    } catch (error) {
      notify(
        "error",
        "Gagal membuat user",
        error instanceof Error ? error.message : "Gagal membuat user."
      );
    } finally {
      setSaving(false);
    }
  }


async function submitPasswordReset(event: React.FormEvent) {
  event.preventDefault();
  if (!resetTarget) return;
  if (resetPassword.length < 8) { notify("error","Password terlalu pendek","Password baru minimal 8 karakter."); return; }
  if (resetPassword !== resetPasswordConfirm) { notify("error","Konfirmasi tidak sama","Password baru dan konfirmasi harus sama."); return; }
  setResettingPassword(true);
  try {
    const s = getSupabaseClient();
    const { data: { session } } = await s.auth.getSession();
    const res = await fetch(`${import.meta.env.PUBLIC_SUPABASE_URL}/functions/v1/admin-reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ user_id: resetTarget.id, password: resetPassword }),
    });
    const payload = await res.json().catch(() => ({ error: "reset_password_failed" }));
    if (!res.ok) throw new Error(payload.error || "Reset password gagal.");
    notify("success","Password berhasil direset",`Password ${resetTarget.full_name} sudah diperbarui.`);
    setResetTarget(null); setResetPassword(""); setResetPasswordConfirm("");
  } catch (error) {
    notify("error","Reset password gagal",error instanceof Error ? error.message : "Reset password gagal.");
  } finally { setResettingPassword(false); }
}

  const filteredRows = rows.filter((row) => {
    const q = userSearch.trim().toLowerCase();
    const roleOk = !userRoleFilter || row.role === userRoleFilter;
    const queryOk = !q || [row.full_name, row.email, row.role, row.pic_profiles?.pic_code]
      .filter(Boolean).join(" ").toLowerCase().includes(q);
    return roleOk && queryOk;
  });

  const sortedRows = [...filteredRows].sort((a,b) => {
    const av = sortKey === "pic_code" ? a.pic_profiles?.pic_code : a[sortKey];
    const bv = sortKey === "pic_code" ? b.pic_profiles?.pic_code : b[sortKey];
    const aa = typeof av === "boolean" ? Number(av) : String(av ?? "").toLowerCase();
    const bb = typeof bv === "boolean" ? Number(bv) : String(bv ?? "").toLowerCase();
    const cmp = aa < bb ? -1 : aa > bb ? 1 : 0;
    return sortDir === "asc" ? cmp : -cmp;
  });
  const size = pageSize === "all" ? Math.max(sortedRows.length,1) : Number(pageSize);
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / size));
  const safePage = Math.min(page,totalPages);
  const pagedRows = pageSize === "all" ? sortedRows : sortedRows.slice((safePage-1)*size, safePage*size);
  function toggleSort(key:string){ if(sortKey===key) setSortDir(v=>v==="asc"?"desc":"asc"); else {setSortKey(key);setSortDir("asc");} setPage(1); }
  function SortIcon({column}:{column:string}){ return sortKey!==column?<ArrowUpDown size={14}/>:sortDir==="asc"?<ArrowUp size={14}/>:<ArrowDown size={14}/>; }

  return (
    <section>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#0B1D3A]">
            Manajemen User
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {actorRole === "admin" ? "Kelola PIC dan Klien." : "Kelola Super Admin, Admin, PIC, dan Klien."}
          </p>
        </div>

        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--role-accent)] px-4 py-2.5 text-sm font-semibold text-white"
        >
          <UserPlus size={17} />
          Tambah User
        </button>
      </div>

      <div className="brand-card mt-6 rounded-2xl p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_220px_auto_auto]">
          <input
            value={userSearch}
            onChange={(e)=>{setUserSearch(e.target.value);setPage(1);}}
            placeholder="Cari nama, email, ID PIC..."
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[var(--role-accent)]"
          />
          <select
            value={userRoleFilter}
            onChange={(e)=>{setUserRoleFilter(e.target.value);setPage(1);}}
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
          >
            <option value="">Semua Role</option>
            <option value="super_admin">Super Admin</option>
            <option value="admin">Admin</option>
            <option value="pic">PIC</option>
            <option value="client">Klien</option>
          </select>
          <button type="button" onClick={()=>{setUserSearch("");setUserRoleFilter("");}} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600">Reset</button>
          <button type="button" onClick={load} className="rounded-xl border border-[var(--role-border)] px-4 py-3 text-sm font-semibold text-[var(--role-accent)]">Perbarui</button>
        </div>
      </div>

      <div className="brand-card mt-6 overflow-hidden rounded-2xl">
        <div className="hidden md:block">
          <table className="min-w-full text-sm">
            <thead className="bg-[var(--role-pale)]">
              <tr>
                {[
                  ["Nama","full_name"],
                  ["Email","email"],
                  ["Role","role"],
                  ["ID PIC","pic_code"],
                  ["Status","is_active"],
                ].map(([label,key]) => (
                  <th key={key} className="px-5 py-3 text-left text-xs font-semibold text-slate-500">
                    <button type="button" onClick={()=>toggleSort(key)} className="inline-flex items-center gap-1.5 hover:text-[var(--role-accent)]">{label}<SortIcon column={key}/></button>
                  </th>
                ))}
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500">Aksi</th>
              </tr>
            </thead>

            <tbody>
              {pagedRows.length ? (
                pagedRows.map((r) => (
                  <tr
                    key={r.id}
                    className="border-t border-slate-100"
                  >
                    <td className="px-5 py-3 font-semibold text-[#0B1D3A]">
                      {r.full_name}
                    </td>

                    <td className="px-5 py-3">
                      {r.email}
                    </td>

                    <td className="px-5 py-3">
                      {r.role}
                    </td>

                    <td className="px-5 py-3">
                      {r.pic_profiles?.pic_code ?? "—"}
                    </td>

                    <td className="px-5 py-3">{r.is_active ? "Aktif" : "Nonaktif"}</td>
                    <td className="px-5 py-3">
                      {(actorRole === "super_admin" || ["pic","client"].includes(r.role)) && (
                        <button type="button" onClick={()=>{setResetTarget(r);setResetPassword("");setResetPasswordConfirm("");}} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--role-accent)] px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[var(--role-accent-hover)] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[var(--role-soft)]">
                          <KeyRound size={14}/> Reset Password
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-10 text-center text-sm text-slate-400"
                  >
                    Belum ada data user.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="space-y-3 p-3 md:hidden">
          {pagedRows.length ? pagedRows.map((r)=>(
            <article key={r.id} className="mobile-data-card rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-[#0B1D3A]">{r.full_name}</p><p className="mt-1 break-all text-xs text-slate-500">{r.email}</p></div><span className="rounded-full bg-[var(--role-pale)] px-2.5 py-1 text-[11px] font-semibold text-[var(--role-accent)]">{r.role}</span></div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><dt className="mobile-label text-xs text-slate-400">ID PIC</dt><dd className="mt-1 font-medium">{r.pic_profiles?.pic_code ?? "—"}</dd></div><div><dt className="mobile-label text-xs text-slate-400">Status</dt><dd className="mt-1 font-medium">{r.is_active?"Aktif":"Nonaktif"}</dd></div></dl>
              {(actorRole === "super_admin" || ["pic","client"].includes(r.role)) && <button type="button" onClick={()=>{setResetTarget(r);setResetPassword("");setResetPasswordConfirm("");}} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--role-accent)] px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--role-accent-hover)] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[var(--role-soft)]"><KeyRound size={15}/>Reset Password</button>}
            </article>
          )) : <div className="py-10 text-center text-sm text-slate-400">Belum ada data user.</div>}
        </div>
        <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>Tampilkan</span>
            <select value={pageSize} onChange={(e)=>{setPageSize(e.target.value);setPage(1);}} className="rounded-lg border border-slate-200 px-2 py-1.5">
              <option>10</option><option>25</option><option>50</option><option>100</option><option value="all">All</option>
            </select>
            <span>dari {sortedRows.length} data</span>
          </div>
          <div className="flex items-center gap-2">
            <button disabled={safePage<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold disabled:opacity-40">Sebelumnya</button>
            <span className="text-sm text-slate-500">{pageSize==="all"?"Semua data":`Halaman ${safePage} / ${totalPages}`}</span>
            <button disabled={safePage>=totalPages||pageSize==="all"} onClick={()=>setPage(p=>Math.min(totalPages,p+1))} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold disabled:opacity-40">Berikutnya</button>
          </div>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-[#0B1D3A]/45 p-4 py-10 backdrop-blur-sm">
          <form
            onSubmit={submit}
            className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl sm:p-7"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-[#0B1D3A]">
                  Tambah User
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Akun dibuat langsung aktif. Tidak ada email invitation.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  resetForm();
                }}
                className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
                aria-label="Tutup"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <label className="text-sm font-semibold text-slate-600">
                Nama Lengkap
                <input
                  name="full_name"
                  required
                  placeholder="Nama lengkap"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-[var(--role-accent)]"
                />
              </label>

              <label className="text-sm font-semibold text-slate-600">
                Email
                <input
                  name="email"
                  required
                  type="email"
                  placeholder="nama@email.com"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-[var(--role-accent)]"
                />
              </label>

              <label className="text-sm font-semibold text-slate-600">
                No. Telepon
                <input
                  name="phone"
                  placeholder="08xxxxxxxxxx"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-[var(--role-accent)]"
                />
              </label>

              <label className="text-sm font-semibold text-slate-600">
                Role
                <select
                  value={role}
                  onChange={(event) =>
                    setRole(event.target.value)
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-[var(--role-accent)]"
                >
                  <option value="pic">PIC</option>
                  <option value="client">Klien</option>
                  {actorRole === "super_admin" && <option value="admin">Admin</option>}
                  {actorRole === "super_admin" && <option value="super_admin">Super Admin</option>}
                </select>
              </label>

              <label className="text-sm font-semibold text-slate-600">
                Password Awal
                <input
                  name="password"
                  required
                  type="password"
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="Minimal 8 karakter"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-[var(--role-accent)]"
                />
              </label>

              <label className="text-sm font-semibold text-slate-600">
                Konfirmasi Password
                <input
                  name="password_confirm"
                  required
                  type="password"
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="Ulangi password awal"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-[var(--role-accent)]"
                />
              </label>
            </div>

            {role === "pic" && (
              <div className="mt-6 space-y-5 rounded-2xl border border-[#DCE8F7] bg-[#F8FBFF] p-5">
                <div>
                  <h4 className="font-semibold text-[#0B1D3A]">
                    Assignment PIC
                  </h4>

                  <p className="mt-1 text-xs text-slate-500">
                    PIC hanya memiliki 1 Branch dan dapat
                    memiliki beberapa Stockpoint.
                  </p>
                </div>

                <label className="block text-sm font-semibold text-slate-600">
                  Branch
                  <select
                    value={branchId}
                    onChange={(event) =>
                      setBranchId(event.target.value)
                    }
                    required
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-normal outline-none focus:border-[var(--role-accent)]"
                  >
                    <option value="">
                      Pilih Branch
                    </option>

                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.code} · {b.name}
                      </option>
                    ))}
                  </select>
                </label>

                {branchId ? (
                  <StockpointPicker
                    stockpoints={availableStockpoints}
                    selected={selectedStockpoints}
                    occupiedIds={occupiedIds}
                    onChange={setSelectedStockpoints}
                  />
                ) : (
                  <div className="rounded-xl border border-dashed border-[var(--role-border)] bg-white p-5 text-center text-sm text-slate-400">
                    Pilih Branch terlebih dahulu untuk
                    menampilkan Stockpoint.
                  </div>
                )}
              </div>
            )}

            <div className="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  resetForm();
                }}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600"
              >
                Batal
              </button>

              <button
                disabled={saving}
                className="rounded-xl bg-[var(--role-accent)] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving
                  ? "Memproses..."
                  : "Buat User"}
              </button>
            </div>
          </form>
        </div>
      )}

      {resetTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0B1D3A]/55 p-4 backdrop-blur-sm">
          <form onSubmit={submitPasswordReset} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4"><div><h3 className="text-lg font-bold text-[#0B1D3A]">Reset Password</h3><p className="mt-1 text-sm text-slate-500">{resetTarget.full_name} · {resetTarget.email}</p></div><button type="button" onClick={()=>setResetTarget(null)} className="rounded-xl border border-slate-200 p-2 text-slate-500"><X size={17}/></button></div>
            <div className="mt-5 space-y-4"><label className="block text-sm font-semibold text-slate-600">Password Baru<input autoFocus type="password" minLength={8} value={resetPassword} onChange={e=>setResetPassword(e.target.value)} placeholder="Minimal 8 karakter" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal"/></label><label className="block text-sm font-semibold text-slate-600">Konfirmasi Password<input type="password" minLength={8} value={resetPasswordConfirm} onChange={e=>setResetPasswordConfirm(e.target.value)} placeholder="Ulangi password baru" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal"/></label></div>
            <p className="mt-4 text-xs leading-5 text-slate-400">Password tidak disimpan ke database maupun Audit Log.</p>
            <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={()=>setResetTarget(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600">Batal</button><button disabled={resettingPassword} className="rounded-xl bg-[var(--role-accent)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{resettingPassword?"Memproses...":"Simpan Password Baru"}</button></div>
          </form>
        </div>
      )}
    </section>
  );
}
