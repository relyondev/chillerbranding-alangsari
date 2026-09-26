import { notify } from "../../components/ui/ToastHost";
import {
  Check,
  ChevronDown,
  Search,
  UserPlus,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseClient } from "../../lib/supabase/client";

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
                className="inline-flex max-w-full items-center gap-2 rounded-full bg-[#EEF6FF] px-3 py-1.5 text-xs font-semibold text-[#1565EF]"
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
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#1565EF] focus:ring-4 focus:ring-[#BEE6FF]/45"
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
                        : "hover:bg-[#F5F9FF]"
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                        checked
                          ? "border-[#1565EF] bg-[#1565EF] text-white"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {checked && <Check size={13} />}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-semibold text-[#1565EF]">
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

  const filteredRows = rows.filter((row) => {
    const q = userSearch.trim().toLowerCase();
    const roleOk = !userRoleFilter || row.role === userRoleFilter;
    const queryOk = !q || [row.full_name, row.email, row.role, row.pic_profiles?.pic_code]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(q);
    return roleOk && queryOk;
  });

  return (
    <section>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#0B1D3A]">
            Manajemen User
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Kelola Super Admin, Admin, PIC, dan Klien.
          </p>
        </div>

        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1565EF] px-4 py-2.5 text-sm font-semibold text-white"
        >
          <UserPlus size={17} />
          Tambah User
        </button>
      </div>

      <div className="brand-card mt-6 rounded-2xl p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_220px_auto_auto]">
          <input
            value={userSearch}
            onChange={(e)=>setUserSearch(e.target.value)}
            placeholder="Cari nama, email, ID PIC..."
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#1565EF]"
          />
          <select
            value={userRoleFilter}
            onChange={(e)=>setUserRoleFilter(e.target.value)}
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
          >
            <option value="">Semua Role</option>
            <option value="super_admin">Super Admin</option>
            <option value="admin">Admin</option>
            <option value="pic">PIC</option>
            <option value="client">Klien</option>
          </select>
          <button type="button" onClick={()=>{setUserSearch("");setUserRoleFilter("");}} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600">Reset</button>
          <button type="button" onClick={load} className="rounded-xl border border-[#BEE6FF] px-4 py-3 text-sm font-semibold text-[#1565EF]">Perbarui</button>
        </div>
      </div>

      <div className="brand-card mt-6 overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-[#F5F9FF]">
              <tr>
                {[
                  "Nama",
                  "Email",
                  "Role",
                  "ID PIC",
                  "Status",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-3 text-left text-xs font-semibold text-slate-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {filteredRows.length ? (
                filteredRows.map((r) => (
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

                    <td className="px-5 py-3">
                      {r.is_active ? "Aktif" : "Nonaktif"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-10 text-center text-sm text-slate-400"
                  >
                    Belum ada data user.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-[#1565EF]"
                />
              </label>

              <label className="text-sm font-semibold text-slate-600">
                Email
                <input
                  name="email"
                  required
                  type="email"
                  placeholder="nama@email.com"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-[#1565EF]"
                />
              </label>

              <label className="text-sm font-semibold text-slate-600">
                No. Telepon
                <input
                  name="phone"
                  placeholder="08xxxxxxxxxx"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-[#1565EF]"
                />
              </label>

              <label className="text-sm font-semibold text-slate-600">
                Role
                <select
                  value={role}
                  onChange={(event) =>
                    setRole(event.target.value)
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-[#1565EF]"
                >
                  <option value="pic">PIC</option>
                  <option value="admin">Admin</option>
                  <option value="client">Klien</option>
                  <option value="super_admin">
                    Super Admin
                  </option>
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
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-[#1565EF]"
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
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-[#1565EF]"
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
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-normal outline-none focus:border-[#1565EF]"
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
                  <div className="rounded-xl border border-dashed border-[#BEE6FF] bg-white p-5 text-center text-sm text-slate-400">
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
                className="rounded-xl bg-[#1565EF] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving
                  ? "Memproses..."
                  : "Buat User"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
