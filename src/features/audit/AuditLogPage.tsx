import { ChevronDown, ChevronUp, RefreshCw, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "../../lib/supabase/client";

type AuditRow = {
  id:string;
  created_at:string;
  event_type:string;
  entity_type:string;
  entity_id:string|null;
  actor_user_id:string|null;
  reason:string|null;
  before_data:any;
  after_data:any;
  actor_name:string;
  actor_role:string;
  detail_text:string;
  entity_label:string;
  assignment_detail?:{pic:string;added:string[];removed:string[];active:string[];text:string}|null;
};

const roleMeta:Record<string,{label:string;className:string}> = {
  pic:{label:"PIC",className:"bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300"},
  admin:{label:"ADMIN",className:"bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100"},
  super_admin:{label:"SUPER ADMIN",className:"bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"},
  client:{label:"KLIEN",className:"bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"},
  system:{label:"SYSTEM",className:"bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"},
};
function RoleBadge({role}:{role:string}){
  const meta=roleMeta[role]??{label:String(role||"-").toUpperCase(),className:"bg-slate-100 text-slate-600"};
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide ${meta.className}`}>{meta.label}</span>;
}
function pretty(value:string){return String(value??"-").replaceAll("_"," ").replace(/\b\w/g,c=>c.toUpperCase());}
function compactObject(value:any){
  if(!value||typeof value!=="object") return "";
  const ignored=new Set(["updated_at","created_at"]);
  return Object.entries(value).filter(([k,v])=>!ignored.has(k)&&v!==null&&v!==undefined&&v!=="").slice(0,5).map(([k,v])=>`${pretty(k)}: ${typeof v==="object"?JSON.stringify(v):String(v)}`).join(" · ");
}

function relationOne(value:any){
  return Array.isArray(value)?value[0]:value;
}
function stockpointLabel(stock:any){
  if(!stock) return null;
  return [stock.code,stock.name].filter(Boolean).join(" · ");
}
function assignmentSummary(row:any,profile:any,stockMap:Record<string,any>){
  const after=row.after_data??{};
  const added=(Array.isArray(after.added)?after.added:[]).map((id:string)=>stockpointLabel(stockMap[id])??id);
  const removed=(Array.isArray(after.removed)?after.removed:[]).map((id:string)=>stockpointLabel(stockMap[id])??id);
  const active=(Array.isArray(after.active_stockpoint_ids)?after.active_stockpoint_ids:[]).map((id:string)=>stockpointLabel(stockMap[id])??id);
  const pp=relationOne(profile?.pic_profiles);
  const pic=[pp?.pic_code,profile?.full_name].filter(Boolean).join(" · ")||"PIC";
  const parts=[`PIC: ${pic}`];
  if(added.length) parts.push(`Ditambahkan: ${added.join(", ")}`);
  if(removed.length) parts.push(`Dilepas: ${removed.join(", ")}`);
  if(!added.length&&!removed.length) parts.push("Tidak ada perubahan assignment");
  if(active.length) parts.push(`Stockpoint aktif: ${active.join(", ")}`);
  else parts.push("Stockpoint aktif: tidak ada");
  return {pic,added,removed,active,text:parts.join(" · ")};
}

export default function AuditLogPage(){
  const [rows,setRows]=useState<AuditRow[]>([]);
  const [loading,setLoading]=useState(false);
  const [search,setSearch]=useState("");
  const [userFilter,setUserFilter]=useState("");
  const [actionFilter,setActionFilter]=useState("");
  const [dateFrom,setDateFrom]=useState("");
  const [dateTo,setDateTo]=useState("");
  const [pageSize,setPageSize]=useState("20");
  const [page,setPage]=useState(1);
  const [detailRow,setDetailRow]=useState<AuditRow|null>(null);
  const [sortKey,setSortKey]=useState<"created_at"|"event_type"|"actor_name"|"actor_role"|"entity_label"|"detail_text"|"entity_id">("created_at");
  const [sortDir,setSortDir]=useState<"asc"|"desc">("desc");

  async function load(){
    setLoading(true);
    try{
      const s=getSupabaseClient();
      const {data,error}=await s.from("audit_events").select("id,created_at,event_type,entity_type,entity_id,actor_user_id,reason,before_data,after_data").order("created_at",{ascending:false}).limit(2000);
      if(error) throw error;
      const audit=data??[];
      const actorIds=[...new Set(audit.map((r:any)=>r.actor_user_id).filter(Boolean))];
      const profileEntityIds=[...new Set(audit.filter((r:any)=>r.entity_type==="profile"&&r.entity_id).map((r:any)=>r.entity_id))];
      const entitySubmissionIds=[...new Set(audit.filter((r:any)=>r.entity_type==="submission"&&r.entity_id).map((r:any)=>r.entity_id))];
      const assignmentStockpointIds=[...new Set(audit.flatMap((r:any)=>{
        if(r.event_type!=="pic_stockpoint_assignments_updated") return [];
        const after=r.after_data??{};
        return [after.added,after.removed,after.active_stockpoint_ids].flatMap((value:any)=>Array.isArray(value)?value:[]);
      }).filter(Boolean))];
      const profileIds=[...new Set([...actorIds,...profileEntityIds])];
      const [profilesRes,submissionsRes]=await Promise.all([
        profileIds.length?s.from("profiles").select("id,full_name,role,pic_profiles(pic_code)").in("id",profileIds):Promise.resolve({data:[] as any[]}),
        entitySubmissionIds.length?s.from("submissions").select("id,store_name,store_code,workflow_status,stockpoint_id,pic_user_id").in("id",entitySubmissionIds):Promise.resolve({data:[] as any[]}),
      ] as any);
      const profiles=(profilesRes as any).data??[];
      const submissions=(submissionsRes as any).data??[];
      const profileMap=Object.fromEntries(profiles.map((p:any)=>[p.id,p]));
      const stockIds=[...new Set([...submissions.map((r:any)=>r.stockpoint_id).filter(Boolean),...assignmentStockpointIds])];
      const picIds=[...new Set(submissions.map((r:any)=>r.pic_user_id).filter(Boolean))];
      const [stocksRes,picsRes]=await Promise.all([
        stockIds.length?s.from("stockpoints").select("id,code,name").in("id",stockIds):Promise.resolve({data:[] as any[]}),
        picIds.length?s.from("profiles").select("id,full_name,pic_profiles(pic_code)").in("id",picIds):Promise.resolve({data:[] as any[]}),
      ] as any);
      const stockMap=Object.fromEntries(((stocksRes as any).data??[]).map((x:any)=>[x.id,x]));
      const picMap=Object.fromEntries(((picsRes as any).data??[]).map((x:any)=>[x.id,x]));
      const subMap=Object.fromEntries(submissions.map((x:any)=>[x.id,x]));

      setRows(audit.map((row:any)=>{
        const actor=row.actor_user_id?profileMap[row.actor_user_id]:null;
        let entityLabel=pretty(row.entity_type);
        let context="";
        if(row.entity_type==="submission"&&row.entity_id&&subMap[row.entity_id]){
          const sub=subMap[row.entity_id], sp=stockMap[sub.stockpoint_id], pic=picMap[sub.pic_user_id];
          const pp=Array.isArray(pic?.pic_profiles)?pic.pic_profiles[0]:pic?.pic_profiles;
          entityLabel=sub.store_name||sub.store_code||"Submission";
          context=[sp?`${sp.code} · ${sp.name}`:null,pic?`${pp?.pic_code??""} ${pic.full_name}`.trim():null].filter(Boolean).join(" · ");
        }
        let assignment_detail:any=null;
        if(row.event_type==="pic_stockpoint_assignments_updated"&&row.entity_type==="profile"&&row.entity_id){
          const profile=profileMap[row.entity_id];
          assignment_detail=assignmentSummary(row,profile,stockMap);
          entityLabel=profile?.full_name||"PIC";
        }
        const before=compactObject(row.before_data),after=compactObject(row.after_data);
        let change="";
        if(before&&after) change=`Sebelum: ${before} → Sesudah: ${after}`;
        else if(after) change=after;
        else if(before) change=`Sebelum: ${before}`;
        const detail=assignment_detail?.text??([context,row.reason?`Alasan: ${row.reason}`:null,change].filter(Boolean).join(" · ")||"Tidak ada detail tambahan.");
        return {...row,actor_name:actor?.full_name??(row.actor_user_id?"User":"System"),actor_role:actor?.role??"system",detail_text:detail,entity_label:entityLabel,assignment_detail};
      }));
    }catch(error){console.error("audit_log_failed",error);setRows([]);}finally{setLoading(false);}
  }
  useEffect(()=>{load();},[]);

  const users=useMemo(()=>Array.from(new Map(rows.filter(r=>r.actor_user_id).map(r=>[r.actor_user_id,{id:r.actor_user_id!,name:r.actor_name,role:r.actor_role}])).values()).sort((a,b)=>a.name.localeCompare(b.name)),[rows]);
  const actions=useMemo(()=>[...new Set(rows.map(r=>r.event_type))].sort(),[rows]);
  const filtered=useMemo(()=>{
    const q=search.trim().toLowerCase();
    const result=rows.filter(row=>{
      const queryOk=!q||[row.event_type,row.entity_type,row.entity_label,row.actor_name,row.detail_text,row.entity_id].join(" ").toLowerCase().includes(q);
      const userOk=!userFilter||row.actor_user_id===userFilter;
      const actionOk=!actionFilter||row.event_type===actionFilter;
      const when=new Date(row.created_at);
      const fromOk=!dateFrom||when>=new Date(`${dateFrom}T00:00:00`);
      const toOk=!dateTo||when<=new Date(`${dateTo}T23:59:59.999`);
      return queryOk&&userOk&&actionOk&&fromOk&&toOk;
    });
    return [...result].sort((a,b)=>{
      const av=sortKey==="created_at"?new Date(a.created_at).getTime():String((a as any)[sortKey]??"").toLowerCase();
      const bv=sortKey==="created_at"?new Date(b.created_at).getTime():String((b as any)[sortKey]??"").toLowerCase();
      if(av===bv) return 0;
      const cmp=av>bv?1:-1;
      return sortDir==="asc"?cmp:-cmp;
    });
  },[rows,search,userFilter,actionFilter,dateFrom,dateTo,sortKey,sortDir]);
  useEffect(()=>setPage(1),[search,userFilter,actionFilter,dateFrom,dateTo,pageSize]);
  const size=Number(pageSize),totalPages=Math.max(1,Math.ceil(filtered.length/size)),safePage=Math.min(page,totalPages),paged=filtered.slice((safePage-1)*size,safePage*size);
  function toggleSort(key:typeof sortKey){
    if(sortKey===key) setSortDir(v=>v==="asc"?"desc":"asc");
    else {setSortKey(key);setSortDir("asc");}
  }
  function reset(){setSearch("");setUserFilter("");setActionFilter("");setDateFrom("");setDateTo("");setSortKey("created_at");setSortDir("desc");setPage(1);}

  return <section>
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-2xl font-bold text-[#0B1D3A]">Audit Log</h2><p className="mt-1 text-sm text-slate-500">Riwayat aksi penting yang tercatat oleh sistem.</p></div><button onClick={load} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600"><RefreshCw size={16} className={loading?"animate-spin":""}/>Perbarui</button></div>

    <div className="brand-card mt-6 rounded-2xl p-5">
      <div className="grid items-end gap-3 md:grid-cols-2 xl:grid-cols-12">
        <label className="relative xl:col-span-3"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari event, entity, detail..." className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-[var(--role-accent)]"/></label>
        <select value={userFilter} onChange={e=>setUserFilter(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm xl:col-span-2"><option value="">Semua User</option>{users.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select>
        <select value={actionFilter} onChange={e=>setActionFilter(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm xl:col-span-2"><option value="">Semua Aksi</option>{actions.map(a=><option key={a} value={a}>{pretty(a)}</option>)}</select>
        <label className="block xl:col-span-2"><span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">Dari tanggal</span><input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label>
        <label className="block xl:col-span-2"><span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">Sampai tanggal</span><input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label>
        <button onClick={reset} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 xl:col-span-1">Reset</button>
      </div>
    </div>

    <div className="brand-card mt-5 overflow-hidden rounded-2xl">
      <div className="hidden overflow-x-auto md:block"><table className="min-w-[1180px] w-full text-sm"><thead className="bg-[var(--role-pale)]"><tr>{[
        ["Waktu","created_at"],["Aksi","event_type"],["User","actor_name"],["Role","actor_role"],["Entity","entity_label"],["Detail","detail_text"],["ID Entity","entity_id"]
      ].map(([label,key])=><th key={label as string} className="px-4 py-3 text-left text-xs font-semibold text-slate-500">{key?<button type="button" onClick={()=>toggleSort(key as any)} className="inline-flex items-center gap-1.5 hover:text-slate-900"><span>{label}</span>{sortKey===key?(sortDir==="asc"?<ChevronUp size={14}/>:<ChevronDown size={14}/>):<span className="text-slate-300">↕</span>}</button>:label}</th>)}</tr></thead><tbody>
        {paged.length?paged.map(row=><tr key={row.id} className="border-t border-slate-100 align-top"><td className="whitespace-nowrap px-4 py-3 text-slate-500">{new Date(row.created_at).toLocaleString("id-ID")}</td><td className="px-4 py-3 font-semibold text-[#0B1D3A]">{pretty(row.event_type)}</td><td className="px-4 py-3">{row.actor_name}</td><td className="px-4 py-3"><RoleBadge role={row.actor_role}/></td><td className="px-4 py-3"><p className="font-semibold text-[#0B1D3A]">{row.entity_label}</p><p className="text-xs text-slate-400">{pretty(row.entity_type)}</p></td><td className="max-w-[420px] px-4 py-3"><button onClick={()=>setDetailRow(row)} className="text-left text-xs leading-5 text-slate-500 hover:text-[var(--role-accent)]">{row.detail_text}</button></td><td className="max-w-[180px] truncate px-4 py-3 text-xs text-slate-400">{row.entity_id??"-"}</td></tr>):<tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-slate-400">{loading?"Memuat audit log...":"Belum ada audit event yang dapat ditampilkan."}</td></tr>}
      </tbody></table></div>
      <div className="space-y-3 p-3 md:hidden">{paged.map(row=><article key={row.id} className="mobile-data-card rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-[#0B1D3A]">{pretty(row.event_type)}</p><p className="mt-1 text-xs text-slate-500">{new Date(row.created_at).toLocaleString("id-ID")}</p></div><RoleBadge role={row.actor_role}/></div><p className="mt-3 text-sm"><b>{row.actor_name}</b> · {row.entity_label}</p><button onClick={()=>setDetailRow(row)} className="mt-3 w-full rounded-xl bg-[var(--role-pale)] px-3 py-2 text-left text-xs leading-5 text-slate-500">{row.detail_text}</button></article>)}</div>
      <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2 text-sm text-slate-500"><span>Tampilkan</span><select value={pageSize} onChange={e=>setPageSize(e.target.value)} className="rounded-lg border border-slate-200 px-2 py-1.5"><option>20</option><option>50</option><option>100</option></select><span>dari {filtered.length} data</span></div><div className="flex items-center gap-2"><button disabled={safePage<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-40">Sebelumnya</button><span className="text-sm text-slate-500">Halaman {safePage} / {totalPages}</span><button disabled={safePage>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-40">Berikutnya</button></div></div>
    </div>

    {detailRow&&<div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"><div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 text-slate-800 shadow-2xl dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"><div className="flex items-start justify-between gap-4"><div><h3 className="text-lg font-bold text-slate-900 dark:text-white">Detail Audit</h3><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{pretty(detailRow.event_type)}</p></div><button onClick={()=>setDetailRow(null)} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"><X size={17}/></button></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><div><p className="text-xs text-slate-400">Waktu</p><p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{new Date(detailRow.created_at).toLocaleString("id-ID")}</p></div><div><p className="text-xs text-slate-400">User</p><div className="mt-1 flex items-center gap-2"><span className="text-sm font-semibold text-slate-900 dark:text-white">{detailRow.actor_name}</span><RoleBadge role={detailRow.actor_role}/></div></div><div><p className="text-xs text-slate-400">Entity</p><p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{detailRow.entity_label}</p></div><div><p className="text-xs text-slate-400">ID Entity</p><p className="mt-1 break-all text-xs text-slate-600 dark:text-slate-300">{detailRow.entity_id??"-"}</p></div></div><div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900"><p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Ringkasan</p><p className="mt-2 text-sm leading-6 text-slate-800 dark:text-slate-100">{detailRow.detail_text}</p></div>{detailRow.assignment_detail?<div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30"><p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Stockpoint ditambahkan</p><div className="mt-2 space-y-1 text-sm text-slate-800 dark:text-slate-100">{detailRow.assignment_detail.added.length?detailRow.assignment_detail.added.map(item=><p key={item}>• {item}</p>):<p className="text-slate-400">Tidak ada</p>}</div></div><div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900 dark:bg-rose-950/30"><p className="text-xs font-semibold text-rose-700 dark:text-rose-300">Stockpoint dilepas</p><div className="mt-2 space-y-1 text-sm text-slate-800 dark:text-slate-100">{detailRow.assignment_detail.removed.length?detailRow.assignment_detail.removed.map(item=><p key={item}>• {item}</p>):<p className="text-slate-400">Tidak ada</p>}</div></div><div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2 dark:border-slate-700 dark:bg-slate-900"><p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Stockpoint aktif setelah perubahan</p><div className="mt-2 flex flex-wrap gap-2">{detailRow.assignment_detail.active.length?detailRow.assignment_detail.active.map(item=><span key={item} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">{item}</span>):<span className="text-sm text-slate-400">Tidak ada Stockpoint aktif</span>}</div></div></div>:(detailRow.before_data||detailRow.after_data)&&<div className="mt-4 grid gap-3 sm:grid-cols-2">{detailRow.before_data&&<div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"><p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Sebelum</p><pre className="mt-2 whitespace-pre-wrap break-words font-sans text-xs leading-5 text-slate-600 dark:text-slate-300">{JSON.stringify(detailRow.before_data,null,2)}</pre></div>}{detailRow.after_data&&<div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"><p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Sesudah</p><pre className="mt-2 whitespace-pre-wrap break-words font-sans text-xs leading-5 text-slate-600 dark:text-slate-300">{JSON.stringify(detailRow.after_data,null,2)}</pre></div>}</div>}</div></div>}
  </section>;
}
