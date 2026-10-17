import { Eye, FileClock, Images, PlayCircle, RefreshCw, RotateCcw, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "../../lib/supabase/client";

function WorkList({title,rows,reopened=false,done=false,onDetail}:{title:string;rows:any[];reopened?:boolean;done?:boolean;onDetail?:(row:any)=>void}) {
  return (
    <div className={`brand-card overflow-hidden rounded-2xl ${done?"border-emerald-200":""}`}>
      {!done && <div className="flex items-center gap-2 px-5 py-4">
        {reopened?<RotateCcw size={18} className="text-amber-500"/>:<FileClock size={18} className="text-[var(--role-accent)]"/>}
        <h3 className="font-semibold text-[#0B1D3A]">{title}</h3>
      </div>}
      <div className="space-y-3 p-5">
        {rows.length ? rows.map((row)=>(
          <article key={row.id} className="rounded-xl border border-slate-100 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-semibold text-[#0B1D3A]">{row.store_name}</p>
                <p className="mt-1 text-sm text-slate-500">{row.stockpoint_name} · {row.store_code}</p>
                {reopened && row.reopen_reason && <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">Alasan reopen: {row.reopen_reason}</p>}
                {done && row.last_admin_edited_at && <p className="mt-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">Diedit oleh Admin: <b>{row.last_admin_editor_name || "ADMIN"}</b> · {new Date(row.last_admin_edited_at).toLocaleString("id-ID")}</p>}
              </div>
              {done && onDetail ? <div className="flex shrink-0 flex-wrap gap-2"><button type="button" onClick={()=>onDetail(row)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#0B1D3A]"><Eye size={16}/>Detail</button><a href={`/app/photos?submission=${row.id}`} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#0B1D3A]"><Images size={16}/>Lihat Foto</a></div> : row.workflow_status==="draft" && <a href={`/app/submissions?draft=${row.id}`} className="pic-primary-action inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#0B1D3A] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#13284d]"><PlayCircle size={16}/>Lanjutkan</a>}
            </div>
          </article>
        )):<div className="py-8 text-center text-sm text-slate-400">Tidak ada data.</div>}
      </div>
    </div>
  );
}

export default function MyWorkPage(){
  const [rows,setRows]=useState<any[]>([]);
  const [loading,setLoading]=useState(false);
  const [search,setSearch]=useState("");
  const [detail,setDetail]=useState<any|null>(null);
  const status=typeof window!=="undefined" ? new URLSearchParams(window.location.search).get("status")||"draft" : "draft";

  async function load(){
    setLoading(true);
    try{
      const supabase=getSupabaseClient();
      const {data,error}=await supabase.rpc("report_submissions",{p_search:null,p_branch_code:null,p_branding_status:null,p_limit:500,p_offset:0});
      if(error) throw error;
      setRows(data??[]);
    }catch{ setRows([]); }
    finally{ setLoading(false); }
  }
  useEffect(()=>{load();},[]);

  const filtered=useMemo(()=>{
    const q=search.trim().toLowerCase();
    return rows.filter((row)=>{
      if(row.workflow_status!==status) return false;
      if(!q) return true;
      return [row.store_name,row.store_code,row.stockpoint_name,row.owner_name,row.salesman_code].filter(Boolean).join(" ").toLowerCase().includes(q);
    });
  },[rows,search,status]);

  const regular=filtered.filter((row)=>!row.reopened_at);
  const reopened=filtered.filter((row)=>Boolean(row.reopened_at));

  return (
    <section>
      {status==="done" ? <div className="flex flex-col gap-3 rounded-2xl bg-emerald-600 px-5 py-5 text-white sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-2xl font-bold">Pekerjaan Selesai</h2><p className="mt-1 text-sm text-emerald-50">Daftar pekerjaan yang sudah selesai.</p></div><button onClick={load} className="inline-flex items-center gap-2 self-start rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white sm:self-auto"><RefreshCw size={16} className={loading?"animate-spin":""}/>Perbarui</button></div> : <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-2xl font-bold text-[#0B1D3A]">Pekerjaan Belum Selesai</h2><p className="mt-1 text-sm text-slate-500">Pekerjaan belum selesai dan reopen dipisahkan agar lebih mudah dipantau.</p></div><button onClick={load} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600"><RefreshCw size={16} className={loading?"animate-spin":""}/>Perbarui</button></div>}

      <div className="brand-card mt-6 rounded-2xl p-4">
        <label className="relative block">
          <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Cari nama toko, kode toko, Stockpoint..."
            className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-[var(--role-accent)]"/>
        </label>
      </div>

      {status==="done" ? (
        <div className="mt-5"><WorkList title="Pekerjaan Selesai" rows={filtered} done onDetail={setDetail}/></div>
      ):(
        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          <WorkList title="Pekerjaan Belum Selesai" rows={regular}/>
          <WorkList title="Reopen" rows={reopened} reopened/>
        </div>
      )}

      {detail && <div className="fixed inset-0 z-[130] flex items-center justify-center bg-[#0B1D3A]/60 p-4 backdrop-blur-sm"><div className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><h3 className="text-lg font-bold text-[#0B1D3A]">Detail Pekerjaan</h3><p className="mt-1 text-sm text-slate-500">{String(detail.store_name||"-").toUpperCase()}</p></div><button onClick={()=>setDetail(null)} className="rounded-xl border border-slate-200 p-2"><X size={18}/></button></div><div className="mt-5 grid gap-3 sm:grid-cols-2">{[["Tanggal",detail.installation_date],["Branch",detail.branch_name],["Stockpoint",`${detail.stockpoint_code||"-"} · ${detail.stockpoint_name||"-"}`],["PIC",`${detail.pic_code||"-"} · ${detail.pic_name||"-"}`],["Salesman",`${detail.salesman_code||"-"} · ${detail.salesman_name||"-"}`],["Kode Toko",detail.store_code],["Nama Toko",detail.store_name],["Nama Pemilik",detail.owner_name],["No HP/WA",detail.owner_phone],["Jenis Store",detail.store_type],["Chiller",detail.has_chiller?"YA":"TIDAK"],["Status Branding",detail.branding_status==="brandable"?"DIBRANDING":detail.branding_status==="not_brandable"?"TIDAK DIBRANDING":detail.branding_status],["Alamat",detail.store_address],["Alasan",detail.not_brandable_reason||"—"]].map(([label,value])=><div key={String(label)} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 break-words text-sm font-semibold text-[#0B1D3A]">{String(value||"—")}</p></div>)}</div><div className="mt-5 flex justify-end"><button onClick={()=>setDetail(null)} className="rounded-xl bg-[#0B1D3A] px-4 py-2.5 text-sm font-semibold text-white">Tutup</button></div></div></div>}
    </section>
  );
}
