import { BarChart3, CheckCircle2, CircleX, Image, MapPinned, RefreshCw, Search, Store, StoreIcon, X } from "lucide-react";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Tooltip, Legend } from "chart.js";
import { useEffect, useMemo, useState } from "react";
import { useAppRole } from "../../hooks/useAppRole";
import { getSupabaseClient } from "../../lib/supabase/client";
import { notify } from "../../components/ui/ToastHost";
import AdminEditDoneModal from "../reporting/AdminEditDoneModal";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Tooltip, Legend);

type Summary={
  total_visit:number;brandable:number;not_brandable:number;warung:number;grosir:number;stockpoints_touched:number;stockpoints_total:number;brandable_photo_denominator:number;
  photo_store_before:number;photo_chiller_before:number;photo_chiller_after:number;photo_wobbler_after:number;photo_poster_after:number;photo_spanduk_after:number;
  branch_counts:Array<{label:string;value:number}>;trend:Array<{label:string;value:number}>;
};
type PeriodStats={today:number;yesterday:number;week:number;previousWeek:number;month:number;previousMonth:number};
const empty:Summary={total_visit:0,brandable:0,not_brandable:0,warung:0,grosir:0,stockpoints_touched:0,stockpoints_total:0,brandable_photo_denominator:0,photo_store_before:0,photo_chiller_before:0,photo_chiller_after:0,photo_wobbler_after:0,photo_poster_after:0,photo_spanduk_after:0,branch_counts:[],trend:[]};
const pct=(v:number,t:number)=>t>0?Math.round(v/t*100):0;
const upper=(v:any)=>v?String(v).toUpperCase():"—";
const dateKey=(d:Date)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const shiftDays=(d:Date,days:number)=>{const x=new Date(d);x.setDate(x.getDate()+days);return x;};
const startOfWeekSunday=(d:Date)=>shiftDays(d,-d.getDay());
const comparisonNote=(current:number,previous:number,label:string)=>{const diff=current-previous;if(diff===0)return `Sama dengan ${label}`;return `${Math.abs(diff)} ${diff>0?"lebih banyak":"lebih sedikit"} dari ${label}`;};

const percentagePlugin:any={
  id:"percentageLabels",
  afterDatasetsDraw(chart:any){
    const dataset=chart.data.datasets?.[0]; if(!dataset) return;
    const total=(dataset.data||[]).reduce((a:number,b:number)=>a+Number(b||0),0); if(!total) return;
    const meta=chart.getDatasetMeta(0); const ctx=chart.ctx;
    ctx.save();ctx.fillStyle="#0F172A";ctx.font="600 12px Poppins, Arial";ctx.textAlign="center";ctx.textBaseline="middle";
    meta.data.forEach((arc:any,i:number)=>{const value=Number(dataset.data[i]||0);if(!value)return;const p=arc.tooltipPosition();ctx.fillText(`${Math.round(value/total*100)}%`,p.x,p.y);});
    ctx.restore();
  }
};

function MetricCard({label,value,percentage,icon:Icon,note}:{label:string;value:number;percentage?:number;icon:any;note?:string}){
  return <article className="brand-card rounded-2xl p-5"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p><div className="mt-2 flex items-end gap-2"><p className="text-3xl font-bold text-[#0B1D3A]">{value}</p>{percentage!==undefined&&<span className="mb-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">{percentage}%</span>}</div>{note&&<p className="mt-2 text-xs text-slate-400">{note}</p>}</div><span className="rounded-xl bg-[var(--role-pale)] p-3 text-[var(--role-accent)]"><Icon size={20}/></span></div></article>;
}

function PhotoCard({label,value,total}:{label:string;value:number;total:number}){
  const p=pct(value,total);
  const badge=p>=90?"bg-emerald-50 text-emerald-700":p>=75?"bg-amber-50 text-amber-700":"bg-rose-50 text-rose-700";
  const bar=p>=90?"bg-emerald-500":p>=75?"bg-amber-500":"bg-rose-500";
  return <article className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between"><span className="rounded-xl bg-slate-50 p-2 text-slate-500"><Image size={18}/></span><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${badge}`}>{p}%</span></div><p className="mt-3 text-sm font-semibold text-[#0B1D3A]">{label}</p><p className="mt-1 text-xs text-slate-400">{value} dari {total} pekerjaan brandable</p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${bar}`} style={{width:`${p}%`}}/></div></article>;
}

function DetailModal({row,onClose,onEdit,onReopen,canOperate}:{row:any;onClose:()=>void;onEdit:()=>void;onReopen:()=>void;canOperate:boolean}){
  const cells=[
    ["Tanggal",row.installation_date],["Branch",upper(row.branch_name)],["Stockpoint",`${row.stockpoint_code} · ${upper(row.stockpoint_name)}`],["PIC",`${upper(row.pic_code)} · ${upper(row.pic_name)}`],
    ["Salesman",`${upper(row.salesman_code)} · ${upper(row.salesman_name)}`],["Kode Toko",upper(row.store_code)],["Nama Toko",upper(row.store_name)],["Pemilik",upper(row.owner_name)],["HP/WA",row.owner_phone],["Jenis Store",upper(row.store_type)],["Branding",upper(row.branding_status)],["Alamat",row.store_address],
  ];
  return <div className="fixed inset-0 z-[115] overflow-y-auto bg-[#0B1D3A]/60 p-4 backdrop-blur-sm"><div className="mx-auto my-6 w-full max-w-4xl rounded-3xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><h3 className="text-xl font-bold text-[#0B1D3A]">Detail Pekerjaan</h3><p className="mt-1 text-sm text-slate-500">{upper(row.store_name)}</p></div><button onClick={onClose} className="rounded-xl border border-slate-200 p-2"><X size={18}/></button></div><div className="mt-5 overflow-hidden rounded-2xl border border-slate-200"><table className="w-full text-sm"><tbody>{cells.map(([k,v])=><tr key={String(k)} className="border-b border-slate-100 last:border-0"><th className="w-44 bg-slate-50 px-4 py-3 text-left text-xs font-semibold text-slate-500">{k}</th><td className="px-4 py-3 text-slate-700">{v||"—"}</td></tr>)}</tbody></table></div><div className="mt-5 flex flex-wrap justify-end gap-2"><a href={`/app/photos?submission=${row.id}`} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold">Lihat Foto</a>{canOperate&&<><button onClick={onReopen} className="rounded-xl border border-amber-200 px-4 py-2.5 text-sm font-semibold text-amber-700">Reopen</button><button onClick={onEdit} className="rounded-xl bg-[var(--role-accent)] px-4 py-2.5 text-sm font-semibold text-white">Edit</button></>}</div></div></div>;
}

function CompletedSection({title,rows,onDetail}:{title:string;rows:any[];onDetail:(row:any)=>void}){
  const [search,setSearch]=useState("");
  const filtered=useMemo(()=>{const q=search.trim().toLowerCase();return q?rows.filter(r=>`${r.store_name} ${r.store_code} ${r.stockpoint_name} ${r.pic_name} ${r.salesman_name??""}`.toLowerCase().includes(q)):rows;},[rows,search]);
  const [page,setPage]=useState(1); const size=8; const pages=Math.max(1,Math.ceil(filtered.length/size)); const safe=Math.min(page,pages); const pageRows=filtered.slice((safe-1)*size,safe*size);
  useEffect(()=>setPage(1),[search,rows.length]);
  return <section className="brand-card rounded-2xl p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-semibold text-[#0B1D3A]">{title}</h3><p className="mt-1 text-xs text-slate-400">{rows.length} pekerjaan selesai</p></div><label className="relative w-full sm:max-w-xs"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari toko / PIC / SP..." className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-xs outline-none"/></label></div><div className="mt-4 space-y-2">{pageRows.length?pageRows.map(row=><button key={row.id} onClick={()=>onDetail(row)} className="flex w-full items-center justify-between gap-4 rounded-xl border border-slate-100 px-3 py-3 text-left hover:border-[var(--role-border)] hover:bg-[var(--role-pale)]"><div className="min-w-0"><p className="truncate text-sm font-semibold text-[#0B1D3A]">{upper(row.store_name)}</p><p className="mt-1 truncate text-xs text-slate-500">{row.stockpoint_code} · {upper(row.stockpoint_name)} · {upper(row.pic_name)}</p></div><span className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold">Detail</span></button>):<div className="py-8 text-center text-sm text-slate-400">Belum ada data.</div>}</div>{pages>1&&<div className="mt-4 flex justify-end gap-2"><button disabled={safe<=1} onClick={()=>setPage(v=>Math.max(1,v-1))} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs disabled:opacity-40">Sebelumnya</button><span className="px-2 py-1.5 text-xs text-slate-400">{safe}/{pages}</span><button disabled={safe>=pages} onClick={()=>setPage(v=>Math.min(pages,v+1))} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs disabled:opacity-40">Berikutnya</button></div>}</section>;
}

export default function DashboardPage(){
  const {role,loading:roleLoading}=useAppRole();
  const [summary,setSummary]=useState<Summary>(empty);
  const [rows,setRows]=useState<any[]>([]);
  const [loading,setLoading]=useState(false);
  const [detail,setDetail]=useState<any|null>(null);
  const [editTarget,setEditTarget]=useState<any|null>(null);
  const [reopenTarget,setReopenTarget]=useState<any|null>(null);
  const [reopenReason,setReopenReason]=useState("");
  const [reopening,setReopening]=useState(false);
  const [periodStats,setPeriodStats]=useState<PeriodStats>({today:0,yesterday:0,week:0,previousWeek:0,month:0,previousMonth:0});
  const canOperate=["admin","super_admin"].includes(role??"");

  async function load(){
    setLoading(true);
    try{
      const s=getSupabaseClient();
      const now=new Date();
      const yesterday=shiftDays(now,-1);
      const weekStart=startOfWeekSunday(now);
      const prevWeekStart=shiftDays(weekStart,-7);
      const prevWeekEnd=shiftDays(weekStart,-1);
      const monthStart=new Date(now.getFullYear(),now.getMonth(),1);
      const prevMonthStart=new Date(now.getFullYear(),now.getMonth()-1,1);
      const prevMonthEnd=new Date(now.getFullYear(),now.getMonth(),0);
      const countRange=async(from:Date,to:Date)=>{const q=await s.from("submissions").select("id",{count:"exact",head:true}).eq("workflow_status","done").is("deleted_at",null).gte("installation_date",dateKey(from)).lte("installation_date",dateKey(to));if(q.error)throw q.error;return q.count??0;};
      const [sumRes,reportRes,todayCount,yesterdayCount,weekCount,prevWeekCount,monthCount,prevMonthCount]=await Promise.all([
        s.rpc("dashboard_summary_v2"),
        s.rpc("report_submissions",{p_search:null,p_branch_code:null,p_branding_status:null,p_limit:500,p_offset:0}),
        countRange(now,now),countRange(yesterday,yesterday),countRange(weekStart,now),countRange(prevWeekStart,prevWeekEnd),countRange(monthStart,now),countRange(prevMonthStart,prevMonthEnd)
      ]);
      if(sumRes.error)throw sumRes.error;if(reportRes.error)throw reportRes.error;
      setSummary({...empty,...(sumRes.data??{})});
      setRows((reportRes.data??[]).filter((r:any)=>r.workflow_status==="done"));
      setPeriodStats({today:todayCount,yesterday:yesterdayCount,week:weekCount,previousWeek:prevWeekCount,month:monthCount,previousMonth:prevMonthCount});
    } catch(e:any){console.error(e);setSummary(empty);setRows([]);}
    finally{setLoading(false);}
  }
  useEffect(()=>{if(!roleLoading&&role)load();},[role,roleLoading]);

  const statusData=useMemo(()=>({labels:["Bisa Dibranding","Tidak Bisa Dibranding"],datasets:[{data:[summary.brandable,summary.not_brandable],backgroundColor:["#22C55E","#EF4444"],borderColor:["#FFFFFF","#FFFFFF"],borderWidth:2}]}),[summary]);
  const storeData=useMemo(()=>({labels:["Warung","Grosir"],datasets:[{data:[summary.warung,summary.grosir],backgroundColor:["#3B82F6","#F59E0B"],borderColor:["#FFFFFF","#FFFFFF"],borderWidth:2}]}),[summary]);
  const branchPalette=["#3B82F6","#22C55E","#F59E0B","#EF4444","#8B5CF6","#06B6D4","#EC4899","#84CC16","#F97316","#6366F1"];
  const branchData=useMemo(()=>({labels:summary.branch_counts.map(x=>x.label),datasets:[{label:role==="pic"?"Visit per Stockpoint":"Visit per Branch",data:summary.branch_counts.map(x=>x.value),backgroundColor:summary.branch_counts.map((_,i)=>branchPalette[i%branchPalette.length]),borderColor:summary.branch_counts.map((_,i)=>branchPalette[i%branchPalette.length]),borderWidth:1,borderRadius:6}]}),[summary,role]);
  const trendData=useMemo(()=>({labels:summary.trend.map(x=>x.label),datasets:[{label:"Visit",data:summary.trend.map(x=>x.value),tension:.35,fill:false,borderColor:"#2563EB",backgroundColor:"#2563EB",pointBackgroundColor:"#2563EB",pointBorderColor:"#FFFFFF",pointBorderWidth:2,pointRadius:4}]}),[summary]);
  const chartOptions:any={responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:"#475569",usePointStyle:true,boxWidth:10}}},scales:{x:{ticks:{color:"#475569"},grid:{color:"rgba(148,163,184,.18)"}},y:{ticks:{color:"#475569"},grid:{color:"rgba(148,163,184,.18)"},beginAtZero:true}}};
  const donutOptions:any={responsive:true,maintainAspectRatio:false,plugins:{legend:{position:"bottom",labels:{color:"#475569",usePointStyle:true,boxWidth:10}}}};
  const picLeaderboard=useMemo(()=>{
    const map=new Map<string,{name:string;code:string;count:number}>();
    rows.forEach((r:any)=>{const key=String(r.pic_code||r.pic_name||r.pic_user_id||"");if(!key)return;const item=map.get(key)||{name:upper(r.pic_name),code:upper(r.pic_code),count:0};item.count+=1;map.set(key,item);});
    return [...map.values()].sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name)).slice(0,10);
  },[rows]);
  const branchLeaderboard=useMemo(()=>{
    const map=new Map<string,{name:string;count:number}>();
    rows.forEach((r:any)=>{const key=String(r.branch_name||r.branch_code||"");if(!key)return;const item=map.get(key)||{name:upper(r.branch_name||r.branch_code),count:0};item.count+=1;map.set(key,item);});
    return [...map.values()].sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name));
  },[rows]);

  const photoCards=[
    ["Foto Toko Before",summary.photo_store_before],["Foto Chiller Before",summary.photo_chiller_before],["Foto Chiller After",summary.photo_chiller_after],
    ["Foto Wobbler",summary.photo_wobbler_after],["Foto Poster",summary.photo_poster_after],["Foto Spanduk",summary.photo_spanduk_after],
  ] as const;

  async function confirmReopen(){
    if(!reopenTarget||!reopenReason.trim()) return notify("warning","Alasan wajib diisi","Tuliskan alasan reopen.");
    setReopening(true);
    try{const s=getSupabaseClient();const {data:{session}}=await s.auth.getSession();const res=await fetch(`${import.meta.env.PUBLIC_SUPABASE_URL}/functions/v1/reopen-submission`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${session?.access_token}`},body:JSON.stringify({submission_id:reopenTarget.id,reason:reopenReason.trim()})});const payload=await res.json().catch(()=>({}));if(!res.ok)throw new Error(payload?.error||"Reopen gagal.");notify("success","Pekerjaan direopen","PIC dapat melanjutkan revisi seperti flow sebelumnya.");setReopenTarget(null);setDetail(null);setReopenReason("");await load();}
    catch(e:any){notify("error","Reopen gagal",e?.message||"Terjadi kesalahan.");}finally{setReopening(false);}
  }

  return <section>
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-2xl font-bold text-[#0B1D3A]">Dashboard</h2><p className="mt-1 text-sm text-slate-500">Ringkasan pekerjaan selesai, kualitas dokumentasi, dan coverage Branding Chiller.</p></div><button onClick={load} className="inline-flex items-center gap-2 rounded-xl border border-[var(--role-border)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--role-accent)]"><RefreshCw size={16} className={loading?"animate-spin":""}/>Perbarui</button></div>

    <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <MetricCard label="Total Visit" value={summary.total_visit} note="Seluruh pekerjaan selesai" icon={MapPinned}/>
      <MetricCard label="Bisa Dibranding" value={summary.brandable} percentage={pct(summary.brandable,summary.total_visit)} note={`${summary.brandable} dari ${summary.total_visit} total visit`} icon={CheckCircle2}/>
      <MetricCard label="Tidak Bisa Dibranding" value={summary.not_brandable} percentage={pct(summary.not_brandable,summary.total_visit)} note={`${summary.not_brandable} dari ${summary.total_visit} total visit`} icon={CircleX}/>
      <MetricCard label="Stockpoint Terjamah" value={summary.stockpoints_touched} percentage={pct(summary.stockpoints_touched,summary.stockpoints_total)} note={`${summary.stockpoints_touched} dari ${summary.stockpoints_total} Stockpoint`} icon={Store}/>
      <MetricCard label="Warung" value={summary.warung} percentage={pct(summary.warung,summary.total_visit)} note={`${summary.warung} dari ${summary.total_visit} total visit`} icon={StoreIcon}/>
      <MetricCard label="Grosir" value={summary.grosir} percentage={pct(summary.grosir,summary.total_visit)} note={`${summary.grosir} dari ${summary.total_visit} total visit`} icon={StoreIcon}/>
      <MetricCard label="Pemasangan Hari Ini" value={periodStats.today} note={comparisonNote(periodStats.today,periodStats.yesterday,"kemarin")} icon={MapPinned}/>
      <MetricCard label="Pemasangan Minggu Ini" value={periodStats.week} note={comparisonNote(periodStats.week,periodStats.previousWeek,"minggu kemarin")} icon={BarChart3}/>
      <MetricCard label="Pemasangan Bulan Ini" value={periodStats.month} note={comparisonNote(periodStats.month,periodStats.previousMonth,"bulan kemarin")} icon={BarChart3}/>
    </div>

    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5"><div><h3 className="font-semibold text-[#0B1D3A]">Kelengkapan Dokumentasi Foto</h3><p className="mt-1 text-xs text-slate-400">Persentase dihitung terhadap pekerjaan selesai yang berstatus bisa dibranding.</p></div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{photoCards.map(([label,value])=><div key={label}><PhotoCard label={label} value={value} total={summary.brandable_photo_denominator}/></div>)}</div></section>

    <div className="mt-6 grid gap-6 xl:grid-cols-2">
      <section className="chart-force-light rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h3 className="font-semibold text-slate-900">Brandable vs Tidak Brandable</h3><div className="mx-auto mt-5 h-72 max-w-md"><Doughnut data={statusData} options={donutOptions} plugins={[percentagePlugin]}/></div></section>
      <section className="chart-force-light rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h3 className="font-semibold text-slate-900">Warung vs Grosir</h3><div className="mx-auto mt-5 h-72 max-w-md"><Doughnut data={storeData} options={donutOptions} plugins={[percentagePlugin]}/></div></section>
      <section className="chart-force-light rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="mb-5 flex items-center gap-2"><BarChart3 size={19} className="text-blue-600"/><h3 className="font-semibold text-slate-900">{role==="pic"?"Visit per Stockpoint":"Visit per Branch"}</h3></div><div className="h-72"><Bar data={branchData} options={{...chartOptions,plugins:{...chartOptions.plugins,legend:{display:false}}}}/></div></section>
      <section className="chart-force-light rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h3 className="font-semibold text-slate-900">Tren Pemasangan</h3><div className="mt-5 h-72"><Line data={trendData} options={chartOptions}/></div></section>
    </div>

    <div className="mt-6 grid gap-6 xl:grid-cols-2">
      <section className="brand-card rounded-2xl p-5"><div><h3 className="font-semibold text-[#0B1D3A]">Top 10 PIC</h3><p className="mt-1 text-xs text-slate-400">Peringkat berdasarkan jumlah pekerjaan selesai.</p></div><div className="mt-4 overflow-hidden rounded-xl border border-slate-100"><table className="w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400"><tr><th className="px-4 py-3">#</th><th className="px-4 py-3">PIC</th><th className="px-4 py-3 text-right">Selesai</th></tr></thead><tbody>{picLeaderboard.length?picLeaderboard.map((item,i)=><tr key={`${item.code}-${i}`} className="border-t border-slate-100"><td className="px-4 py-3 font-bold text-slate-400">{i+1}</td><td className="px-4 py-3"><p className="font-semibold text-[#0B1D3A]">{item.name}</p><p className="text-xs text-slate-400">{item.code}</p></td><td className="px-4 py-3 text-right font-bold text-[var(--role-accent)]">{item.count}</td></tr>):<tr><td colSpan={3} className="px-4 py-8 text-center text-slate-400">Belum ada pekerjaan selesai.</td></tr>}</tbody></table></div></section>
      <section className="brand-card rounded-2xl p-5"><div><h3 className="font-semibold text-[#0B1D3A]">Ranking Branch</h3><p className="mt-1 text-xs text-slate-400">Diurutkan berdasarkan jumlah pekerjaan selesai.</p></div><div className="mt-4 overflow-hidden rounded-xl border border-slate-100"><table className="w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400"><tr><th className="px-4 py-3">#</th><th className="px-4 py-3">Branch</th><th className="px-4 py-3 text-right">Selesai</th></tr></thead><tbody>{branchLeaderboard.length?branchLeaderboard.map((item,i)=><tr key={`${item.name}-${i}`} className="border-t border-slate-100"><td className="px-4 py-3 font-bold text-slate-400">{i+1}</td><td className="px-4 py-3 font-semibold text-[#0B1D3A]">{item.name}</td><td className="px-4 py-3 text-right font-bold text-[var(--role-accent)]">{item.count}</td></tr>):<tr><td colSpan={3} className="px-4 py-8 text-center text-slate-400">Belum ada pekerjaan selesai.</td></tr>}</tbody></table></div></section>
    </div>

    <div className="mt-6 grid gap-5 xl:grid-cols-2"><CompletedSection title="Toko Bisa Dibranding" rows={rows.filter(r=>r.branding_status==="brandable")} onDetail={setDetail}/><CompletedSection title="Toko Tidak Bisa Dibranding" rows={rows.filter(r=>r.branding_status==="not_brandable")} onDetail={setDetail}/></div>

    {detail&&<DetailModal row={detail} canOperate={canOperate} onClose={()=>setDetail(null)} onEdit={()=>{setEditTarget(detail);setDetail(null);}} onReopen={()=>{setReopenTarget(detail);setReopenReason("");setDetail(null);}}/>}
    {editTarget&&<AdminEditDoneModal row={editTarget} onClose={()=>setEditTarget(null)} onSaved={async()=>{await load();}}/>}
    {reopenTarget&&<div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#0B1D3A]/60 p-4 backdrop-blur-sm"><div className="w-full max-w-lg rounded-3xl bg-white p-6"><div className="flex items-start justify-between"><div><h3 className="text-lg font-bold text-[#0B1D3A]">Reopen pekerjaan</h3><p className="mt-1 text-sm text-slate-500">{upper(reopenTarget.store_name)}</p></div><button onClick={()=>setReopenTarget(null)} className="rounded-xl border border-slate-200 p-2"><X size={17}/></button></div><textarea autoFocus value={reopenReason} onChange={e=>setReopenReason(e.target.value)} rows={4} placeholder="Alasan reopen..." className="mt-5 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none"/><div className="mt-5 flex justify-end gap-2"><button onClick={()=>setReopenTarget(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold">Batal</button><button disabled={reopening} onClick={confirmReopen} className="rounded-xl bg-[var(--role-accent)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{reopening?"Memproses...":"Reopen"}</button></div></div></div>}
  </section>;
}
