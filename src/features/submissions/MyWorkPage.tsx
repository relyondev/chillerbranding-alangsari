import { FileClock, PlayCircle, RefreshCw, RotateCcw, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "../../lib/supabase/client";

function WorkList({title,rows,reopened=false}:{title:string;rows:any[];reopened?:boolean}) {
  return (
    <div className="brand-card rounded-2xl p-5">
      <div className="flex items-center gap-2">
        {reopened?<RotateCcw size={18} className="text-amber-500"/>:<FileClock size={18} className="text-[#1565EF]"/>}
        <h3 className="font-semibold text-[#0B1D3A]">{title}</h3>
      </div>
      <div className="mt-4 space-y-3">
        {rows.length ? rows.map((row)=>(
          <article key={row.id} className="rounded-xl border border-slate-100 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-semibold text-[#0B1D3A]">{row.store_name}</p>
                <p className="mt-1 text-sm text-slate-500">{row.stockpoint_name} · {row.store_code}</p>
                {reopened && row.reopen_reason && <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">Alasan reopen: {row.reopen_reason}</p>}
              </div>
              {row.workflow_status==="draft" && <a href={`/app/submissions?draft=${row.id}`} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#1565EF] px-4 py-2.5 text-sm font-semibold text-white"><PlayCircle size={16}/>Lanjutkan</a>}
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#0B1D3A]">{status==="done"?"Pekerjaan Selesai":"Pekerjaan Saya"}</h2>
          <p className="mt-1 text-sm text-slate-500">{status==="done"?"Daftar pekerjaan yang sudah selesai.":"Draft biasa dan pekerjaan reopen dipisahkan agar lebih mudah dipantau."}</p>
        </div>
        <button onClick={load} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600">
          <RefreshCw size={16} className={loading?"animate-spin":""}/>Perbarui
        </button>
      </div>

      <div className="brand-card mt-6 rounded-2xl p-4">
        <label className="relative block">
          <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Cari nama toko, kode toko, Stockpoint..."
            className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-[#1565EF]"/>
        </label>
      </div>

      {status==="done" ? (
        <div className="mt-5"><WorkList title="Pekerjaan Selesai" rows={filtered}/></div>
      ):(
        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          <WorkList title="Draft" rows={regular}/>
          <WorkList title="Reopen" rows={reopened} reopened/>
        </div>
      )}
    </section>
  );
}
