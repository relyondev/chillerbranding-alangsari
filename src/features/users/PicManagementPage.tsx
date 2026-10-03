import { ArrowDown, ArrowUp, ArrowUpDown, Check, MapPinned, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { notify } from "../../components/ui/ToastHost";
import { getSupabaseClient } from "../../lib/supabase/client";

type Branch = { id:string; code:string; name:string };
type Stockpoint = { id:string; branch_id:string; code:string; name:string };
type PicRow = {
  id:string;
  full_name:string;
  is_active:boolean;
  pic_code:string;
  branch_id:string;
  branch_name:string;
  stockpoints:{id:string;code:string;name:string}[];
  done_count:number;
  draft_count:number;
};

export default function PicManagementPage(){
  const [rows,setRows]=useState<PicRow[]>([]);
  const [branches,setBranches]=useState<Branch[]>([]);
  const [stockpoints,setStockpoints]=useState<Stockpoint[]>([]);
  const [search,setSearch]=useState("");
  const [branchFilter,setBranchFilter]=useState("");
  const [stockpointFilter,setStockpointFilter]=useState("");
  const [sortKey,setSortKey]=useState("pic_code");
  const [sortDir,setSortDir]=useState<"asc"|"desc">("asc");
  const [pageSize,setPageSize]=useState("10");
  const [page,setPage]=useState(1);
  const [loading,setLoading]=useState(false);

  const [assignmentTarget,setAssignmentTarget]=useState<PicRow|null>(null);
  const [assignmentOptions,setAssignmentOptions]=useState<any[]>([]);
  const [assignmentSelected,setAssignmentSelected]=useState<string[]>([]);
  const [assignmentInitial,setAssignmentInitial]=useState<string[]>([]);
  const [assignmentSearch,setAssignmentSearch]=useState("");
  const [loadingAssignments,setLoadingAssignments]=useState(false);
  const [savingAssignments,setSavingAssignments]=useState(false);

  async function load(){
    setLoading(true);
    try{
      const s=getSupabaseClient();
      const [profilesRes,branchesRes,stockpointsRes,assignmentsRes,submissionsRes]=await Promise.all([
        s.from("profiles").select("id,full_name,is_active,pic_profiles(pic_code,branch_id)").eq("role","pic").order("full_name"),
        s.from("branches").select("id,code,name").eq("is_active",true).order("name"),
        s.from("stockpoints").select("id,branch_id,code,name").eq("is_active",true).order("name"),
        s.from("pic_stockpoint_assignments").select("pic_user_id,stockpoint_id").eq("is_active",true),
        s.from("submissions").select("pic_user_id,workflow_status").is("deleted_at",null),
      ]);
      if(profilesRes.error) throw profilesRes.error;
      const branchRows=(branchesRes.data??[]) as Branch[];
      const stockRows=(stockpointsRes.data??[]) as Stockpoint[];
      setBranches(branchRows); setStockpoints(stockRows);
      const branchMap=Object.fromEntries(branchRows.map(b=>[b.id,b]));
      const stockMap=Object.fromEntries(stockRows.map(sp=>[sp.id,sp]));
      const assignmentMap:Record<string,string[]>={};
      for(const a of assignmentsRes.data??[]){ (assignmentMap[a.pic_user_id]??=[]).push(a.stockpoint_id); }
      const counts:Record<string,{draft:number;done:number}>={};
      for(const sub of submissionsRes.data??[]){
        counts[sub.pic_user_id]??={draft:0,done:0};
        if(sub.workflow_status==="done") counts[sub.pic_user_id].done++; else counts[sub.pic_user_id].draft++;
      }
      const result=(profilesRes.data??[]).map((p:any)=>{
        const pp=Array.isArray(p.pic_profiles)?p.pic_profiles[0]:p.pic_profiles;
        const assigned=(assignmentMap[p.id]??[]).map(id=>stockMap[id]).filter(Boolean);
        return {
          id:p.id, full_name:p.full_name, is_active:p.is_active,
          pic_code:pp?.pic_code??"—", branch_id:pp?.branch_id??"",
          branch_name:branchMap[pp?.branch_id]?.name??"—", stockpoints:assigned,
          done_count:counts[p.id]?.done??0, draft_count:counts[p.id]?.draft??0,
        } as PicRow;
      });
      setRows(result);
    }catch(error){ console.error(error); notify("error","Data PIC gagal dimuat",error instanceof Error?error.message:"Terjadi kesalahan."); }
    finally{setLoading(false);}
  }
  useEffect(()=>{load();},[]);
  useEffect(()=>{setStockpointFilter("");setPage(1);},[branchFilter]);

  const chainedStockpoints=useMemo(()=>branchFilter?stockpoints.filter(sp=>sp.branch_id===branchFilter):[],[stockpoints,branchFilter]);
  const filtered=useMemo(()=>rows.filter(r=>{
    const q=search.trim().toLowerCase();
    const qOk=!q||[r.pic_code,r.full_name,r.branch_name,...r.stockpoints.flatMap(sp=>[sp.code,sp.name])].join(" ").toLowerCase().includes(q);
    const branchOk=!branchFilter||r.branch_id===branchFilter;
    const stockOk=!stockpointFilter||r.stockpoints.some(sp=>sp.id===stockpointFilter);
    return qOk&&branchOk&&stockOk;
  }),[rows,search,branchFilter,stockpointFilter]);
  const sorted=useMemo(()=>[...filtered].sort((a:any,b:any)=>{
    const value=(row:any)=> sortKey==="stockpoints"?row.stockpoints.map((sp:any)=>sp.name).join(", "):row[sortKey];
    const aa=String(value(a)??"").toLowerCase(),bb=String(value(b)??"").toLowerCase();
    const cmp=aa<bb?-1:aa>bb?1:0; return sortDir==="asc"?cmp:-cmp;
  }),[filtered,sortKey,sortDir]);
  const size=pageSize==="all"?Math.max(sorted.length,1):Number(pageSize);
  const totalPages=Math.max(1,Math.ceil(sorted.length/size));
  const safePage=Math.min(page,totalPages);
  const paged=pageSize==="all"?sorted:sorted.slice((safePage-1)*size,safePage*size);
  function toggleSort(key:string){if(sortKey===key)setSortDir(v=>v==="asc"?"desc":"asc");else{setSortKey(key);setSortDir("asc");}setPage(1);}
  function SortIcon({column}:{column:string}){return sortKey!==column?<ArrowUpDown size={14}/>:sortDir==="asc"?<ArrowUp size={14}/>:<ArrowDown size={14}/>;}

  async function openAssignmentManager(row:PicRow){
    setAssignmentTarget(row); setAssignmentSearch(""); setLoadingAssignments(true);
    try{
      const s=getSupabaseClient();
      const {data,error}=await s.rpc("admin_get_pic_stockpoint_options",{p_pic_user_id:row.id});
      if(error) throw error;
      const options=[...(data??[])].sort((a:any,b:any)=>Number(Boolean(b.has_work))-Number(Boolean(a.has_work)) || String(a.stockpoint_name).localeCompare(String(b.stockpoint_name)));
      setAssignmentOptions(options);
      const initial=options.filter((x:any)=>x.is_assigned).map((x:any)=>x.stockpoint_id);
      setAssignmentInitial(initial);
      setAssignmentSelected(initial);
    }catch(error){setAssignmentTarget(null);notify("error","Assignment gagal dimuat",error instanceof Error?error.message:"Terjadi kesalahan.");}
    finally{setLoadingAssignments(false);}
  }
  function toggleAssignment(row:any){
    if(row.assigned_to_other_pic)return;
    const selected=assignmentSelected.includes(row.stockpoint_id);
    if(selected&&row.has_work){notify("warning","Tidak bisa dilepas","PIC sudah pernah punya pekerjaan di Stockpoint ini.");return;}
    setAssignmentSelected(cur=>selected?cur.filter(id=>id!==row.stockpoint_id):[...cur,row.stockpoint_id]);
  }
  async function saveAssignments(){
    if(!assignmentTarget)return; setSavingAssignments(true);
    try{
      const s=getSupabaseClient();
      const {error}=await s.rpc("admin_set_pic_stockpoint_assignments",{p_pic_user_id:assignmentTarget.id,p_stockpoint_ids:assignmentSelected});
      if(error)throw error;
      notify("success","Stockpoint diperbarui","Assignment PIC berhasil disimpan.");
      setAssignmentTarget(null); await load();
    }catch(error:any){notify("error","Gagal memperbarui Stockpoint",String(error?.message??"").includes("cannot_unassign_stockpoint_with_work")?"Stockpoint tidak dapat dilepas karena PIC sudah pernah memiliki pekerjaan di sana.":error?.message??"Terjadi kesalahan.");}
    finally{setSavingAssignments(false);}
  }
  const shownOptions=useMemo(()=>{
    const q=assignmentSearch.trim().toLowerCase();
    return assignmentOptions
      .filter((row:any)=>!q||`${row.stockpoint_code} ${row.stockpoint_name}`.toLowerCase().includes(q))
      .sort((a:any,b:any)=>{
        const aSelected=assignmentSelected.includes(a.stockpoint_id), bSelected=assignmentSelected.includes(b.stockpoint_id);
        if(aSelected!==bSelected) return aSelected?-1:1;
        const aInitial=assignmentInitial.includes(a.stockpoint_id), bInitial=assignmentInitial.includes(b.stockpoint_id);
        if(aInitial!==bInitial) return aInitial?-1:1;
        if(Boolean(a.has_work)!==Boolean(b.has_work)) return a.has_work?-1:1;
        return String(a.stockpoint_name).localeCompare(String(b.stockpoint_name));
      });
  },[assignmentOptions,assignmentSearch,assignmentSelected,assignmentInitial]);

  return <section>
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div><h2 className="text-2xl font-bold text-[#0B1D3A]">Manajemen PIC</h2><p className="mt-1 text-sm text-slate-500">Kelola assignment Stockpoint dan pantau pekerjaan PIC.</p></div>
      <button onClick={load} className="rounded-xl border border-[var(--role-border)] px-4 py-2.5 text-sm font-semibold text-[var(--role-accent)]">{loading?"Memuat...":"Perbarui"}</button>
    </div>
    <div className="brand-card mt-6 rounded-2xl p-4">
      <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr_auto]">
        <div className="relative"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder="Cari ID PIC, nama, Stockpoint..." className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-[var(--role-accent)]"/></div>
        <select value={branchFilter} onChange={e=>setBranchFilter(e.target.value)} className="rounded-xl border border-slate-200 px-4 py-3 text-sm"><option value="">Semua Branch</option>{branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select>
        <select disabled={!branchFilter} value={stockpointFilter} onChange={e=>{setStockpointFilter(e.target.value);setPage(1);}} className="rounded-xl border border-slate-200 px-4 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"><option value="">{branchFilter?"Semua Stockpoint":"Pilih Branch dulu"}</option>{chainedStockpoints.map(sp=><option key={sp.id} value={sp.id}>{sp.code} · {sp.name}</option>)}</select>
        <button onClick={()=>{setSearch("");setBranchFilter("");setStockpointFilter("");setPage(1);}} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600">Reset</button>
      </div>
    </div>

    <div className="brand-card mt-6 overflow-hidden rounded-2xl">
      <div className="hidden overflow-x-auto md:block"><table className="min-w-[1080px] w-full text-sm"><thead className="bg-[var(--role-pale)]"><tr>{[["ID PIC","pic_code"],["Nama","full_name"],["Branch","branch_name"],["Stockpoint apa saja","stockpoints"],["Status","is_active"],["Pekerjaan Selesai","done_count"],["Pekerjaan Draft","draft_count"]].map(([label,key])=><th key={key} className="px-4 py-3 text-left text-xs font-semibold text-slate-500"><button className="inline-flex items-center gap-1" onClick={()=>toggleSort(key)}>{label}<SortIcon column={key}/></button></th>)}<th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Edit Stockpoint</th></tr></thead><tbody>
      {paged.length?paged.map(r=><tr key={r.id} className="border-t border-slate-100"><td className="px-4 py-3 font-semibold">{r.pic_code}</td><td className="px-4 py-3">{r.full_name}</td><td className="px-4 py-3">{r.branch_name}</td><td className="px-4 py-3"><div className="flex max-w-[360px] flex-wrap gap-1.5">{r.stockpoints.length?r.stockpoints.map(sp=><span key={sp.id} className="rounded-full bg-[var(--role-pale)] px-2.5 py-1 text-[11px] font-semibold text-[var(--role-accent)]">{sp.code} · {sp.name}</span>):<span className="text-slate-400">—</span>}</div></td><td className="px-4 py-3">{r.is_active?"Aktif":"Nonaktif"}</td><td className="px-4 py-3 font-semibold">{r.done_count}</td><td className="px-4 py-3 font-semibold">{r.draft_count}</td><td className="px-4 py-3"><button onClick={()=>openAssignmentManager(r)} className="inline-flex items-center gap-2 rounded-xl bg-[var(--role-accent)] px-3 py-2 text-xs font-semibold text-white shadow-sm"><MapPinned size={14}/>Edit Stockpoint</button></td></tr>):<tr><td colSpan={8} className="px-5 py-10 text-center text-slate-400">Belum ada PIC.</td></tr>}
      </tbody></table></div>
      <div className="space-y-3 p-3 md:hidden">{paged.map(r=><article key={r.id} className="mobile-data-card rounded-2xl border border-slate-200 bg-white p-4"><div className="flex justify-between gap-3"><div><p className="font-bold text-[#0B1D3A]">{r.full_name}</p><p className="text-xs text-slate-500">{r.pic_code} · {r.branch_name}</p></div><span className="rounded-full bg-[var(--role-pale)] px-2.5 py-1 text-xs font-semibold text-[var(--role-accent)]">{r.is_active?"Aktif":"Nonaktif"}</span></div><div className="mt-3 flex flex-wrap gap-1.5">{r.stockpoints.map(sp=><span key={sp.id} className="rounded-full bg-[var(--role-pale)] px-2 py-1 text-[10px] text-[var(--role-accent)]">{sp.code} · {sp.name}</span>)}</div><div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><span className="text-xs text-slate-400">Selesai</span><p className="font-bold">{r.done_count}</p></div><div><span className="text-xs text-slate-400">Draft</span><p className="font-bold">{r.draft_count}</p></div></div><button onClick={()=>openAssignmentManager(r)} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--role-accent)] px-3 py-2.5 text-sm font-semibold text-white"><MapPinned size={15}/>Edit Stockpoint</button></article>)}</div>
      <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2 text-sm text-slate-500"><span>Tampilkan</span><select value={pageSize} onChange={e=>{setPageSize(e.target.value);setPage(1);}} className="rounded-lg border border-slate-200 px-2 py-1.5"><option>10</option><option>25</option><option>50</option><option>100</option><option value="all">All</option></select><span>dari {sorted.length} data</span></div><div className="flex items-center gap-2"><button disabled={safePage<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-40">Sebelumnya</button><span className="text-sm text-slate-500">{pageSize==="all"?"Semua data":`Halaman ${safePage} / ${totalPages}`}</span><button disabled={safePage>=totalPages||pageSize==="all"} onClick={()=>setPage(p=>Math.min(totalPages,p+1))} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-40">Berikutnya</button></div></div>
    </div>

    {assignmentTarget&&<div className="fixed inset-0 z-[95] flex items-start justify-center overflow-y-auto bg-black/55 p-4 py-10 backdrop-blur-sm"><div className="w-full max-w-2xl rounded-3xl bg-white p-6 text-[#0B1D3A] shadow-2xl"><div className="flex items-start justify-between gap-4"><div><h3 className="text-xl font-bold text-[#0B1D3A]">Kelola Stockpoint PIC</h3><p className="mt-1 text-sm text-slate-500">{assignmentTarget.full_name} · {assignmentTarget.pic_code}</p></div><button onClick={()=>setAssignmentTarget(null)} className="rounded-xl border border-slate-200 p-2 text-slate-500"><X size={18}/></button></div>
      <div className="relative mt-5"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={assignmentSearch} onChange={e=>setAssignmentSearch(e.target.value)} placeholder="Cari kode atau nama Stockpoint..." className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-[#0B1D3A] outline-none focus:border-[var(--role-accent)]"/></div>
      {loadingAssignments?<div className="py-12 text-center text-sm text-slate-400">Memuat Stockpoint...</div>:<div className="mt-4 max-h-[55vh] space-y-2 overflow-y-auto pr-1">{shownOptions.map((row:any)=>{const selected=assignmentSelected.includes(row.stockpoint_id),initial=assignmentInitial.includes(row.stockpoint_id),locked=selected&&row.has_work,unavailable=row.assigned_to_other_pic;return <button key={row.stockpoint_id} disabled={unavailable} onClick={()=>toggleAssignment(row)} className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left text-[#0B1D3A] transition-all duration-200 ${selected?"border-[var(--role-accent)] bg-[var(--role-pale)] shadow-sm":"border-slate-200 bg-white"} ${unavailable?"cursor-not-allowed opacity-45":"hover:border-[var(--role-accent)]"}`}><span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${selected?"border-[var(--role-accent)] bg-[var(--role-accent)] text-white":"border-slate-300 bg-white"}`}>{selected&&<Check size={13}/>}</span><span className="min-w-0 flex-1"><span className="block text-xs font-bold text-[var(--role-accent)]">{row.stockpoint_code}</span><span className="mt-0.5 block font-semibold text-[#0B1D3A]">{row.stockpoint_name}</span></span><span className="flex flex-wrap justify-end gap-1.5">{initial&&<span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">Sudah di-assign</span>}{selected&&!initial&&<span className="rounded-full bg-[var(--role-pale)] px-2.5 py-1 text-[10px] font-semibold text-[var(--role-accent)]">Baru dipilih</span>}{locked&&<span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-semibold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">Ada pekerjaan · tidak bisa dilepas</span>}{unavailable&&<span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500">Dipakai PIC lain</span>}</span></button>})}</div>}
      <div className="mt-6 flex justify-end gap-2"><button onClick={()=>setAssignmentTarget(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600">Batal</button><button disabled={savingAssignments||loadingAssignments} onClick={saveAssignments} className="rounded-xl bg-[var(--role-accent)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{savingAssignments?"Menyimpan...":"Simpan Assignment"}</button></div>
    </div></div>}
  </section>;
}
