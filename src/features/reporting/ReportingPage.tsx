import { notify } from "../../components/ui/ToastHost";
import { ArrowDown, ArrowUp, ArrowUpDown, CloudUpload, Download, ExternalLink, FileSpreadsheet, FileText, Images, MapPin, RefreshCw, RotateCcw, Search, Undo2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useAppRole } from "../../hooks/useAppRole";
import { getSupabaseClient } from "../../lib/supabase/client";

type Row = any;
type SortDir = "asc" | "desc";

const upperValue = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "";
  return String(value).toUpperCase();
};

const displayUpper = (value: unknown) => upperValue(value) || "—";

const headers = [
  ["Tanggal","created_at"],["Branch","branch_name"],["ID Stockpoint","stockpoint_code"],["Stockpoint","stockpoint_name"],["ID PIC","pic_code"],["PIC","pic_name"],
  ["Kode Salesman","salesman_code"],["Kode Toko","store_code"],["Nama Toko","store_name"],["Pemilik","owner_name"],["HP/WA","owner_phone"],
  ["GPS",null],["Jenis","store_type"],["Chiller","has_chiller"],["Branding","branding_status"],["Status Pekerjaan","workflow_status"],["Foto",null],["Aksi",null]
] as const;

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
  const [sortKey,setSortKey] = useState("created_at");
  const [sortDir,setSortDir] = useState<SortDir>("desc");
  const [pageSize,setPageSize] = useState<string>("10");
  const [page,setPage] = useState(1);

  async function load() {
    setLoading(true);
    try {
      const supabase=getSupabaseClient();
      const {data,error}=await supabase.rpc("report_submissions",{p_search:search||null,p_branch_code:branch||null,p_branding_status:status||null,p_limit:500,p_offset:0});
      if(error) throw error;
      setRows(data??[]);
    } catch (error) {
      console.error("report_submissions_failed", error);
      notify("error","Data pekerjaan gagal dimuat",error instanceof Error ? error.message : "Terjadi kesalahan saat memuat laporan.");
    } finally { setLoading(false); }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => load(), search ? 350 : 0);
    return () => window.clearTimeout(timer);
  }, [search, branch, status]);
  useEffect(()=>setPage(1),[search,branch,status,workflowStatus,pageSize,sortKey,sortDir]);

  const visibleRows = useMemo(()=>rows.filter((row) => {
    if (!workflowStatus) return true;
    if (workflowStatus === "reopen") return row.workflow_status === "draft" && Boolean(row.reopened_at);
    if (workflowStatus === "draft") return row.workflow_status === "draft" && !row.reopened_at;
    return row.workflow_status === workflowStatus;
  }),[rows,workflowStatus]);

  const sortedRows = useMemo(()=>[...visibleRows].sort((a,b)=>{
    const av=a?.[sortKey]; const bv=b?.[sortKey];
    if(av==null && bv==null) return 0; if(av==null) return 1; if(bv==null) return -1;
    const aa=typeof av==="boolean" ? Number(av) : String(av).toLowerCase();
    const bb=typeof bv==="boolean" ? Number(bv) : String(bv).toLowerCase();
    const cmp=aa<bb?-1:aa>bb?1:0; return sortDir==="asc"?cmp:-cmp;
  }),[visibleRows,sortKey,sortDir]);

  const size=pageSize==="all"?Math.max(sortedRows.length,1):Number(pageSize);
  const totalPages=Math.max(1,Math.ceil(sortedRows.length/size));
  const safePage=Math.min(page,totalPages);
  const pageRows=pageSize==="all"?sortedRows:sortedRows.slice((safePage-1)*size,safePage*size);

  const workCounts = {
    draft: rows.filter((row)=>row.workflow_status==="draft" && !row.reopened_at).length,
    reopen: rows.filter((row)=>row.workflow_status==="draft" && Boolean(row.reopened_at)).length,
    done: rows.filter((row)=>row.workflow_status==="done").length,
  };

  function toggleSort(key:string){
    if(sortKey===key) setSortDir(v=>v==="asc"?"desc":"asc");
    else {setSortKey(key);setSortDir("asc");}
  }
  function SortIcon({column}:{column:string}){ return sortKey!==column?<ArrowUpDown size={14}/>:sortDir==="asc"?<ArrowUp size={14}/>:<ArrowDown size={14}/>; }

  async function syncSpreadsheet() {
    setSyncingSheet(true);
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.functions.invoke("spreadsheet-sync", { body: { sync_all: true } });
      if (error) throw error;
      notify("success","Sinkronisasi selesai",`Berhasil: ${data?.succeeded ?? 0}, gagal: ${data?.failed ?? 0}.`);
    } catch (error) { notify("error","Sinkronisasi gagal",error instanceof Error ? error.message : "Sinkronisasi Spreadsheet gagal."); }
    finally { setSyncingSheet(false); }
  }

  function exportXlsx() {
    const sheet=XLSX.utils.json_to_sheet(sortedRows.map(r=>({
      "Tanggal":r.installation_date,"Cabang":upperValue(r.branch_name),"ID Stockpoint":r.stockpoint_code,"Stock Point":upperValue(r.stockpoint_name),"ID PIC":upperValue(r.pic_code),"Nama PIC":upperValue(r.pic_name),
      "Kode Salesman":upperValue(r.salesman_code),"Kode Toko":upperValue(r.store_code),"Nama Toko":upperValue(r.store_name),"Nama Pemilik":upperValue(r.owner_name),"Nomor HP/WA":r.owner_phone,
      "Alamat":r.store_address,"GPS":r.google_maps_url || (r.latitude!=null&&r.longitude!=null?`https://www.google.com/maps?q=${r.latitude},${r.longitude}`:""),
      "Jenis Store":upperValue(r.store_type),"Chiller":r.has_chiller?"YA":"TIDAK","Status":upperValue(r.branding_status),"Alasan":r.not_brandable_reason??""
    })));
    const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,sheet,"Laporan");XLSX.writeFile(book,"Laporan_Branding_Chiller.xlsx");
  }
  function exportPdf() {
    const doc=new jsPDF({orientation:"landscape"}); doc.text("Laporan Branding Chiller",14,14);
    autoTable(doc,{startY:20,head:[["Tanggal","Branch","ID Stockpoint","Stockpoint","Toko","PIC","Salesman","Status"]],body:sortedRows.map(r=>[r.installation_date,upperValue(r.branch_name),r.stockpoint_code,upperValue(r.stockpoint_name),upperValue(r.store_name),upperValue(r.pic_name),upperValue(r.salesman_code),upperValue(r.branding_status)]),styles:{fontSize:7}});
    doc.save("Laporan_Branding_Chiller.pdf");
  }

  async function confirmReopen(){
    if(!reopenTarget) return;
    if(!reopenReason.trim()){notify("warning","Alasan wajib diisi","Tuliskan alasan pekerjaan dibuka kembali.");return;}
    setReopening(true);
    try{
      const supabase=getSupabaseClient(); const {data:{session}}=await supabase.auth.getSession();
      const res=await fetch(`${import.meta.env.PUBLIC_SUPABASE_URL}/functions/v1/reopen-submission`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${session?.access_token}`},body:JSON.stringify({submission_id:reopenTarget.id,reason:reopenReason.trim()})});
      const payload=await res.json().catch(()=>({})); if(!res.ok) throw new Error(payload?.error || "Reopen belum berhasil.");
      notify("success","Pekerjaan berhasil direopen","Foto wajib diupload ulang oleh PIC."); setReopenTarget(null);setReopenReason("");await load();
    }catch(error){notify("error","Reopen gagal",error instanceof Error?error.message:"Reopen belum berhasil.");}finally{setReopening(false);}
  }

  return <section>
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div><h2 className="text-2xl font-bold text-[#0B1D3A]">{operational?"Data Pekerjaan":"Laporan"}</h2><p className="mt-1 text-sm text-slate-500">{operational?"Kelola, filter, dan export data pekerjaan.":"Filter, lihat, dan export data pekerjaan."}</p></div>
      <div className="flex flex-wrap gap-2">
        {["admin","super_admin"].includes(role ?? "") && <button onClick={syncSpreadsheet} disabled={syncingSheet} className="inline-flex items-center gap-2 rounded-xl border border-[var(--role-border)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--role-accent)] disabled:opacity-50"><CloudUpload size={17}/>{syncingSheet?"Sinkronisasi...":"Sinkronkan Spreadsheet"}</button>}
        <a href="https://docs.google.com/spreadsheets/d/1ICeMYceuEGQEA6PJQ8vg-Iwi4RuPbTTHzC_U18c-WKk/edit" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-[var(--role-border)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--role-accent)]"><ExternalLink size={17}/>Buka Spreadsheet</a>
        <div className="relative"><button type="button" onClick={()=>setExportOpen(v=>!v)} className="inline-flex items-center gap-2 rounded-xl bg-[var(--role-accent)] px-4 py-2.5 text-sm font-semibold text-white"><Download size={17}/>Export</button>
        {exportOpen&&<div className="absolute right-0 z-40 mt-2 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
          <button type="button" onClick={()=>{setExportOpen(false);exportXlsx();}} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-600 hover:bg-[var(--role-pale)]"><FileSpreadsheet size={16}/>Export XLSX</button>
          <button type="button" onClick={()=>{setExportOpen(false);exportPdf();}} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-600 hover:bg-[var(--role-pale)]"><FileText size={16}/>Export PDF</button>
        </div>}</div>
      </div>
    </div>

    <div className="mt-6 grid gap-3 sm:grid-cols-3">{[["draft","Draft",workCounts.draft],["reopen","Reopen",workCounts.reopen],["done","Selesai",workCounts.done]].map(([key,label,count]:any)=><button key={key} type="button" onClick={()=>setWorkflowStatus(workflowStatus===key?"":key)} className={`rounded-2xl border p-4 text-left transition ${workflowStatus===key?"border-[var(--role-accent)] bg-[var(--role-pale)]":"border-slate-200 bg-white hover:border-[var(--role-border)]"}`}><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-2 text-2xl font-bold text-[#0B1D3A]">{count}</p></button>)}</div>

    <div className="brand-card mt-6 rounded-2xl p-5"><div className="grid gap-3 md:grid-cols-5">
      <label className="relative md:col-span-2"><Search size={17} className="absolute left-3 top-3.5 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari nama/kode toko, pemilik, HP..." className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-3 text-sm"/></label>
      <select value={branch} onChange={e=>setBranch(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-3 text-sm"><option value="">Semua Branch</option><option>BGR</option><option>SMG</option><option>YOG</option><option>SBY</option><option>MLG</option></select>
      <select value={status} onChange={e=>setStatus(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-3 text-sm"><option value="">Semua Status</option><option value="brandable">Bisa Dibranding</option><option value="not_brandable">Tidak Bisa Dibranding</option></select>
      <select value={workflowStatus} onChange={e=>setWorkflowStatus(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-3 text-sm"><option value="">Semua Status Pekerjaan</option><option value="draft">Draft</option><option value="reopen">Reopen</option><option value="done">Done</option></select>
    </div><div className="mt-4 flex flex-wrap gap-2"><button onClick={()=>{setSearch("");setWorkflowStatus("");setBranch("");setStatus("");}} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600"><RotateCcw size={16}/>Reset</button><button onClick={load} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600"><RefreshCw size={16} className={loading?"animate-spin":""}/>Perbarui</button></div></div>

    <div className="brand-card mt-6 overflow-hidden rounded-2xl">
      <div className="hidden overflow-x-auto md:block"><table className="min-w-[1950px] w-full text-sm"><thead className="bg-[var(--role-pale)]"><tr>{headers.map(([label,key])=><th key={label} className="px-4 py-3 text-left text-xs font-semibold text-slate-500">{key?<button type="button" onClick={()=>toggleSort(key)} className="inline-flex items-center gap-1.5 hover:text-[var(--role-accent)]">{label}<SortIcon column={key}/></button>:label}</th>)}</tr></thead>
      <tbody>{pageRows.length?pageRows.map(r=><tr key={r.id} className="border-t border-slate-100">
        <td className="px-4 py-3">{r.installation_date}</td><td className="px-4 py-3">{displayUpper(r.branch_name)}</td><td className="px-4 py-3 font-medium">{r.stockpoint_code}</td><td className="px-4 py-3">{displayUpper(r.stockpoint_name)}</td><td className="px-4 py-3">{displayUpper(r.pic_code)}</td><td className="px-4 py-3">{displayUpper(r.pic_name)}</td><td className="px-4 py-3">{displayUpper(r.salesman_code)}</td><td className="px-4 py-3">{displayUpper(r.store_code)}</td><td className="px-4 py-3 font-semibold text-[#0B1D3A]">{displayUpper(r.store_name)}</td><td className="px-4 py-3">{displayUpper(r.owner_name)}</td><td className="px-4 py-3">{r.owner_phone}</td>
        <td className="px-4 py-3">{(r.google_maps_url||(r.latitude!=null&&r.longitude!=null))?<a className="inline-flex items-center gap-1 font-semibold text-[var(--role-accent)]" target="_blank" rel="noreferrer" href={r.google_maps_url||`https://www.google.com/maps?q=${r.latitude},${r.longitude}`}><MapPin size={15}/>Maps</a>:<span className="text-slate-400">—</span>}</td>
        <td className="px-4 py-3">{displayUpper(r.store_type)}</td><td className="px-4 py-3">{r.has_chiller?"YA":"TIDAK"}</td><td className="px-4 py-3">{displayUpper(r.branding_status)}</td><td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${r.workflow_status==="done"?"bg-emerald-50 text-emerald-700":r.reopened_at?"bg-sky-50 text-sky-700":"bg-amber-50 text-amber-700"}`}>{r.workflow_status==="done"?"DONE":r.reopened_at?"REOPEN":"DRAFT"}</span></td>
        <td className="px-4 py-3"><a href={`/app/photos?submission=${r.id}`} className="inline-flex items-center gap-1 font-semibold text-[var(--role-accent)]"><Images size={15}/>Lihat</a></td>
        <td className="px-4 py-3">{operational&&["admin","super_admin"].includes(role??"")&&r.workflow_status==="done"?<button onClick={()=>{setReopenTarget(r);setReopenReason("");}} className="inline-flex items-center gap-1 rounded-lg border border-amber-200 px-3 py-2 text-xs font-semibold text-amber-700"><Undo2 size={14}/>Edit</button>:<span className="text-xs text-slate-400">—</span>}</td>
      </tr>):<tr><td colSpan={18} className="px-5 py-12 text-center text-slate-400">Belum ada data.</td></tr>}</tbody></table></div>
      <div className="space-y-3 p-3 md:hidden">
        {pageRows.length?pageRows.map(r=><article key={r.id} className="mobile-data-card rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-semibold text-[#0B1D3A]">{displayUpper(r.store_name)}</p><p className="mt-1 text-xs text-slate-500">{displayUpper(r.store_code)} · {r.stockpoint_code} · {displayUpper(r.stockpoint_name)}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${r.workflow_status==="done"?"bg-emerald-50 text-emerald-700":r.reopened_at?"bg-sky-50 text-sky-700":"bg-amber-50 text-amber-700"}`}>{r.workflow_status==="done"?"DONE":r.reopened_at?"REOPEN":"DRAFT"}</span></div>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm"><div><dt className="mobile-label text-xs text-slate-400">Tanggal</dt><dd className="mt-1">{r.installation_date}</dd></div><div><dt className="mobile-label text-xs text-slate-400">Branch</dt><dd className="mt-1">{displayUpper(r.branch_name)}</dd></div><div><dt className="mobile-label text-xs text-slate-400">PIC</dt><dd className="mt-1">{displayUpper(r.pic_name)}</dd></div><div><dt className="mobile-label text-xs text-slate-400">Pemilik</dt><dd className="mt-1">{displayUpper(r.owner_name)}</dd></div><div><dt className="mobile-label text-xs text-slate-400">HP/WA</dt><dd className="mt-1">{r.owner_phone}</dd></div><div><dt className="mobile-label text-xs text-slate-400">Branding</dt><dd className="mt-1">{displayUpper(r.branding_status)}</dd></div></dl>
          <div className="mt-4 flex flex-wrap gap-2">{(r.google_maps_url||(r.latitude!=null&&r.longitude!=null))&&<a className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-[var(--role-accent)]" target="_blank" rel="noreferrer" href={r.google_maps_url||`https://www.google.com/maps?q=${r.latitude},${r.longitude}`}><MapPin size={14}/>Maps</a>}<a href={`/app/photos?submission=${r.id}`} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-[var(--role-accent)]"><Images size={14}/>Foto</a>{operational&&["admin","super_admin"].includes(role??"")&&r.workflow_status==="done"&&<button onClick={()=>{setReopenTarget(r);setReopenReason("");}} className="inline-flex items-center gap-1 rounded-lg border border-amber-200 px-3 py-2 text-xs font-semibold text-amber-700"><Undo2 size={14}/>Edit</button>}</div>
        </article>):<div className="py-10 text-center text-sm text-slate-400">Belum ada data.</div>}
      </div>
      <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-500"><span>Tampilkan</span><select value={pageSize} onChange={e=>setPageSize(e.target.value)} className="rounded-lg border border-slate-200 px-2 py-1.5"><option>10</option><option>25</option><option>50</option><option>100</option><option value="all">All</option></select><span>dari {sortedRows.length} data</span></div>
        <div className="flex items-center gap-2"><button disabled={safePage<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold disabled:opacity-40">Sebelumnya</button><span className="text-sm text-slate-500">{pageSize==="all"?"Semua data":`Halaman ${safePage} / ${totalPages}`}</span><button disabled={safePage>=totalPages||pageSize==="all"} onClick={()=>setPage(p=>Math.min(totalPages,p+1))} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold disabled:opacity-40">Berikutnya</button></div>
      </div>
    </div>

    {reopenTarget&&<div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0B1D3A]/50 p-4 backdrop-blur-sm"><div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><h3 className="text-lg font-bold text-[#0B1D3A]">Reopen pekerjaan</h3><p className="mt-1 text-sm text-slate-500">{displayUpper(reopenTarget.store_name)}</p></div><button type="button" onClick={()=>setReopenTarget(null)} className="rounded-xl border border-slate-200 p-2 text-slate-500"><X size={17}/></button></div><label className="mt-5 block text-sm font-semibold text-slate-600">Alasan reopen<textarea autoFocus value={reopenReason} onChange={e=>setReopenReason(e.target.value)} rows={4} placeholder="Jelaskan alasan pekerjaan dibuka kembali..." className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-[var(--role-accent)]"/></label><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={()=>setReopenTarget(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600">Batal</button><button type="button" disabled={reopening} onClick={confirmReopen} className="rounded-xl bg-[var(--role-accent)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{reopening?"Memproses...":"Reopen Pekerjaan"}</button></div></div></div>}
  </section>;
}
