import { notify } from "../../components/ui/ToastHost";
import { Download, FileSpreadsheet, FileText, MapPin, RefreshCw, RotateCcw, Search, Images, Undo2, CloudUpload, X } from "lucide-react";
import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useAppRole } from "../../hooks/useAppRole";
import { getSupabaseClient } from "../../lib/supabase/client";

type Row = any;

export default function ReportingPage({ operational = false }: { operational?: boolean }) {
  const { role } = useAppRole();
  const [rows,setRows] = useState<Row[]>([]);
  const [search,setSearch] = useState("");
  const [workflowStatus,setWorkflowStatus] = useState("");
  const [branch,setBranch] = useState("");
  const [status,setStatus] = useState("");
  const [loading,setLoading] = useState(false);
  const [syncingSheet,setSyncingSheet] = useState(false);
  const [exportOpen,setExportOpen] = useState(false);
  const [reopenTarget,setReopenTarget] = useState<Row|null>(null);
  const [reopenReason,setReopenReason] = useState("");
  const [reopening,setReopening] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const supabase=getSupabaseClient();
      const {data,error}=await supabase.rpc("report_submissions",{p_search:search||null,p_branch_code:branch||null,p_branding_status:status||null,p_limit:250,p_offset:0});
      if(error) throw error;
      setRows(data??[]);
    } catch (error) {
      console.error("report_submissions_failed", error);
      notify(
        "error",
        "Data pekerjaan gagal dimuat",
        error instanceof Error ? error.message : "Terjadi kesalahan saat memuat laporan."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      load();
    }, search ? 350 : 0);

    return () => window.clearTimeout(timer);
  }, [search, branch, status]);


  const visibleRows = rows.filter((row) => {
    if (!workflowStatus) return true;
    if (workflowStatus === "reopen") return row.workflow_status === "draft" && Boolean(row.reopened_at);
    if (workflowStatus === "draft") return row.workflow_status === "draft" && !row.reopened_at;
    return row.workflow_status === workflowStatus;
  });

  const workCounts = {
    draft: rows.filter((row)=>row.workflow_status==="draft" && !row.reopened_at).length,
    reopen: rows.filter((row)=>row.workflow_status==="draft" && Boolean(row.reopened_at)).length,
    done: rows.filter((row)=>row.workflow_status==="done").length,
  };

  async function syncSpreadsheet() {
    setSyncingSheet(true);
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.functions.invoke("spreadsheet-sync", {
        body: { sync_all: true },
      });
      if (error) throw error;
      notify("success","Sinkronisasi selesai",`Berhasil: ${data?.succeeded ?? 0}, gagal: ${data?.failed ?? 0}.`);
    } catch (error) {
      notify("error","Sinkronisasi gagal",error instanceof Error ? error.message : "Sinkronisasi Spreadsheet gagal.");
    } finally {
      setSyncingSheet(false);
    }
  }

  function exportXlsx() {
    const sheet=XLSX.utils.json_to_sheet(visibleRows.map(r=>({
      "Tanggal":r.installation_date,"Cabang":r.branch_name,"Stock Point":r.stockpoint_name,"ID PIC":r.pic_code,
      "Nama PIC":r.pic_name,"Kode Salesman":r.salesman_code,"Kode Toko":r.store_code,"Nama Toko":r.store_name,
      "Nama Pemilik":r.owner_name,"Nomor HP/WA":r.owner_phone,"Alamat":r.store_address,
      "GPS":`https://www.google.com/maps?q=${r.latitude},${r.longitude}`,"Jenis Store":r.store_type,
      "Chiller":r.has_chiller?"YA":"TIDAK","Status":r.branding_status,"Alasan":r.not_brandable_reason??""
    })));
    const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,sheet,"Laporan");XLSX.writeFile(book,"Laporan_Branding_Ops.xlsx");
  }
  function exportPdf() {
    const doc=new jsPDF({orientation:"landscape"});
    doc.text("Laporan Branding Ops",14,14);
    autoTable(doc,{startY:20,head:[["Tanggal","Branch","Stockpoint","Toko","PIC","Salesman","Status"]],body:visibleRows.map(r=>[r.installation_date,r.branch_name,r.stockpoint_name,r.store_name,r.pic_name,r.salesman_code,r.branding_status]),styles:{fontSize:7}});
    doc.save("Laporan_Branding_Ops.pdf");
  }

  async function confirmReopen(){
    if(!reopenTarget) return;
    if(!reopenReason.trim()) {
      notify("warning","Alasan wajib diisi","Tuliskan alasan pekerjaan dibuka kembali.");
      return;
    }
    setReopening(true);
    try {
      const supabase=getSupabaseClient();
      const {data:{session}}=await supabase.auth.getSession();
      const endpoint=`${import.meta.env.PUBLIC_SUPABASE_URL}/functions/v1/reopen-submission`;
      const res=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${session?.access_token}`},body:JSON.stringify({submission_id:reopenTarget.id,reason:reopenReason.trim()})});
      const payload=await res.json().catch(()=>({}));
      if(!res.ok) throw new Error(payload?.error || "Reopen belum berhasil.");
      notify("success","Pekerjaan berhasil direopen","Foto wajib diupload ulang oleh PIC.");
      setReopenTarget(null);
      setReopenReason("");
      await load();
    } catch(error) {
      notify("error","Reopen gagal",error instanceof Error ? error.message : "Reopen belum berhasil.");
    } finally {
      setReopening(false);
    }
  }

  return <section>
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div><h2 className="text-2xl font-bold text-[#0B1D3A]">{operational?"Data Pekerjaan":"Laporan"}</h2><p className="mt-1 text-sm text-slate-500">{operational?"Kelola dan pantau pekerjaan.":"Filter, lihat, dan export data pekerjaan."}</p></div>
      <div className="flex flex-wrap gap-2">
        {["admin","super_admin"].includes(role ?? "") && (
          <button
            onClick={syncSpreadsheet}
            disabled={syncingSheet}
            className="inline-flex items-center gap-2 rounded-xl border border-[#BEE6FF] bg-white px-4 py-2.5 text-sm font-semibold text-[#1565EF] disabled:opacity-50"
          >
            <CloudUpload size={17} className={syncingSheet ? "animate-pulse" : ""}/>
            {syncingSheet ? "Sinkronisasi..." : "Sinkronkan Spreadsheet"}
          </button>
        )}

        {!operational && (
          <div className="relative">
            <button
              type="button"
              onClick={()=>setExportOpen((value)=>!value)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#1565EF] px-4 py-2.5 text-sm font-semibold text-white"
            >
              <Download size={17}/>
              Export
            </button>

            {exportOpen && (
              <div className="absolute right-0 z-40 mt-2 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                <button
                  type="button"
                  onClick={()=>{ setExportOpen(false); exportXlsx(); }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-600 hover:bg-[#F5F9FF]"
                >
                  <FileSpreadsheet size={16}/>
                  Export XLSX
                </button>
                <button
                  type="button"
                  onClick={()=>{ setExportOpen(false); exportPdf(); }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-600 hover:bg-[#F5F9FF]"
                >
                  <FileText size={16}/>
                  Export PDF
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>

    <div className="mt-6 grid gap-3 sm:grid-cols-3">
      {[
        ["draft","Draft",workCounts.draft],
        ["reopen","Reopen",workCounts.reopen],
        ["done","Selesai",workCounts.done],
      ].map(([key,label,count]:any)=><button key={key} type="button" onClick={()=>setWorkflowStatus(workflowStatus===key?"":key)} className={`rounded-2xl border p-4 text-left transition ${workflowStatus===key?"border-[#1565EF] bg-[#EEF6FF]":"border-slate-200 bg-white hover:border-[#BEE6FF]"}`}><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-2 text-2xl font-bold text-[#0B1D3A]">{count}</p></button>)}
    </div>

    <div className="brand-card mt-6 rounded-2xl p-5">
      <div className="grid gap-3 md:grid-cols-5">
        <label className="relative md:col-span-2"><Search size={17} className="absolute left-3 top-3.5 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari nama/kode toko, pemilik, HP..." className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-3 text-sm"/></label>
        <select value={branch} onChange={e=>setBranch(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-3 text-sm"><option value="">Semua Branch</option><option>BGR</option><option>SMG</option><option>YOG</option><option>SBY</option><option>MLG</option></select>
        <select value={status} onChange={e=>setStatus(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-3 text-sm"><option value="">Semua Status</option><option value="brandable">Bisa Dibranding</option><option value="not_brandable">Tidak Bisa Dibranding</option></select>
        <select value={workflowStatus} onChange={e=>setWorkflowStatus(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-3 text-sm"><option value="">Semua Status Pekerjaan</option><option value="draft">Draft</option><option value="reopen">Reopen</option><option value="done">Done</option></select>
      </div>
      <div className="mt-4 flex flex-wrap gap-2"><button onClick={()=>{setSearch("");
    setWorkflowStatus("");setBranch("");setStatus("");setTimeout(load,0)}} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600"><RotateCcw size={16}/>Reset</button><button onClick={load} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600"><RefreshCw size={16} className={loading?"animate-spin":""}/>Perbarui</button></div>
    </div>

    <div className="brand-card mt-6 overflow-hidden rounded-2xl">
      <div className="overflow-x-auto"><table className="min-w-[1250px] w-full text-sm"><thead className="bg-[#F5F9FF]"><tr>{["Tanggal","Branch","Stockpoint","ID PIC","PIC","Kode Salesman","Kode Toko","Nama Toko","Pemilik","HP/WA","GPS","Jenis","Chiller","Branding","Status Pekerjaan","Foto","Aksi"].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500">{h}</th>)}</tr></thead>
      <tbody>{visibleRows.length?visibleRows.map(r=><tr key={r.id} className="border-t border-slate-100">
        <td className="px-4 py-3">{r.installation_date}</td><td className="px-4 py-3">{r.branch_name}</td><td className="px-4 py-3">{r.stockpoint_name}</td><td className="px-4 py-3">{r.pic_code}</td><td className="px-4 py-3">{r.pic_name}</td><td className="px-4 py-3">{r.salesman_code}</td><td className="px-4 py-3">{r.store_code}</td><td className="px-4 py-3 font-semibold text-[#0B1D3A]">{r.store_name}</td><td className="px-4 py-3">{r.owner_name}</td><td className="px-4 py-3">{r.owner_phone}</td>
        <td className="px-4 py-3"><a className="inline-flex items-center gap-1 font-semibold text-[#1565EF]" target="_blank" href={`https://www.google.com/maps?q=${r.latitude},${r.longitude}`}><MapPin size={15}/>Maps</a></td>
        <td className="px-4 py-3">{r.store_type}</td><td className="px-4 py-3">{r.has_chiller?"YA":"TIDAK"}</td><td className="px-4 py-3">{r.branding_status}</td>
        <td className="px-4 py-3">
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${r.workflow_status==="done"?"bg-emerald-50 text-emerald-700":r.reopened_at?"bg-sky-50 text-sky-700":"bg-amber-50 text-amber-700"}`}>
            {r.workflow_status==="done"?"DONE":r.reopened_at?"REOPEN":"DRAFT"}
          </span>
        </td>
        <td className="px-4 py-3"><a href={`/app/photos?submission=${r.id}`} className="inline-flex items-center gap-1 font-semibold text-[#1565EF]"><Images size={15}/>Lihat</a></td>
        <td className="px-4 py-3">{operational && ["admin","super_admin"].includes(role) && r.workflow_status==="done"?<button onClick={()=>{setReopenTarget(r);setReopenReason("");}} className="inline-flex items-center gap-1 rounded-lg border border-amber-200 px-3 py-2 text-xs font-semibold text-amber-700"><Undo2 size={14}/>Reopen</button>:<span className="text-xs text-slate-400">—</span>}</td>
      </tr>):<tr><td colSpan={17} className="px-5 py-12 text-center text-slate-400">Belum ada data.</td></tr>}</tbody></table></div>
    </div>
    {reopenTarget && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0B1D3A]/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4"><div><h3 className="text-lg font-bold text-[#0B1D3A]">Reopen pekerjaan</h3><p className="mt-1 text-sm text-slate-500">{reopenTarget.store_name}</p></div><button type="button" onClick={()=>setReopenTarget(null)} className="rounded-xl border border-slate-200 p-2 text-slate-500"><X size={17}/></button></div>
        <label className="mt-5 block text-sm font-semibold text-slate-600">Alasan reopen<textarea autoFocus value={reopenReason} onChange={(e)=>setReopenReason(e.target.value)} rows={4} placeholder="Jelaskan alasan pekerjaan dibuka kembali..." className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-[#1565EF]"/></label>
        <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={()=>setReopenTarget(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600">Batal</button><button type="button" disabled={reopening} onClick={confirmReopen} className="rounded-xl bg-[#1565EF] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{reopening?"Memproses...":"Reopen Pekerjaan"}</button></div>
      </div>
    </div>}

  </section>
}
