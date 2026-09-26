import { RefreshCw, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "../../lib/supabase/client";

export default function AuditLogPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("audit_events")
        .select("id,created_at,event_type,entity_type,entity_id,actor_user_id,after_data")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;

      const actorIds = [...new Set((data ?? []).map((r:any)=>r.actor_user_id).filter(Boolean))];
      let actorMap: Record<string,string> = {};

      if (actorIds.length) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id,full_name")
          .in("id", actorIds);

        actorMap = Object.fromEntries((profiles ?? []).map((p:any)=>[p.id,p.full_name]));
      }

      setRows((data ?? []).map((row:any)=>({
        ...row,
        actor_name: row.actor_user_id ? (actorMap[row.actor_user_id] ?? "User") : "System",
      })));
    } catch (error) {
      console.error("audit_log_failed", error);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;

    return rows.filter((row) =>
      [
        row.event_type,
        row.entity_type,
        row.actor_name,
        row.entity_id,
        JSON.stringify(row.after_data ?? {}),
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [rows, search]);

  function prettyEvent(value: string) {
    return String(value ?? "-")
      .replaceAll("_", " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  return (
    <section>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#0B1D3A]">Audit Log</h2>
          <p className="mt-1 text-sm text-slate-500">
            Riwayat aksi penting yang tercatat oleh sistem.
          </p>
        </div>

        <button
          type="button"
          onClick={load}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Perbarui
        </button>
      </div>

      <div className="brand-card mt-6 rounded-2xl p-4">
        <label className="relative block">
          <Search
            size={17}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari event, user, entity..."
            className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-[#1565EF]"
          />
        </label>
      </div>

      <div className="brand-card mt-5 overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-[#F5F9FF]">
              <tr>
                {["Waktu","Aksi","User","Entity","ID Entity","Detail"].map((h)=>(
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {filtered.length ? (
                filtered.map((row)=>(
                  <tr key={row.id} className="border-t border-slate-100 align-top">
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                      {new Date(row.created_at).toLocaleString("id-ID")}
                    </td>
                    <td className="px-4 py-3 font-semibold text-[#0B1D3A]">
                      {prettyEvent(row.event_type)}
                    </td>
                    <td className="px-4 py-3">{row.actor_name}</td>
                    <td className="px-4 py-3">{prettyEvent(row.entity_type)}</td>
                    <td className="max-w-[180px] truncate px-4 py-3 text-xs text-slate-400">
                      {row.entity_id ?? "-"}
                    </td>
                    <td className="max-w-[360px] px-4 py-3">
                      <pre className="whitespace-pre-wrap break-words font-sans text-xs leading-5 text-slate-500">
                        {row.after_data ? JSON.stringify(row.after_data, null, 2) : "-"}
                      </pre>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-400">
                    {loading ? "Memuat audit log..." : "Belum ada audit event yang dapat ditampilkan."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
