import { BarChart3, BriefcaseBusiness, CheckCircle2, CircleX, Database, FileClock, RefreshCw, Store, UsersRound } from "lucide-react";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement,
  Tooltip, Legend
} from "chart.js";
import { useEffect, useMemo, useState } from "react";
import { useAppRole } from "../../hooks/useAppRole";
import { getSupabaseClient } from "../../lib/supabase/client";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Tooltip, Legend);

type Summary = {
  total: number; brandable: number; not_brandable: number; drafts: number;
  pic_active: number; stockpoints: number;
  branch_counts: Array<{ label: string; value: number }>;
  trend: Array<{ label: string; value: number }>;
  recent: any[];
};

const empty: Summary = { total:0, brandable:0, not_brandable:0, drafts:0, pic_active:0, stockpoints:0, branch_counts:[], trend:[], recent:[] };

function Card({ label, value, icon: Icon, accent }: any) {
  return <article className="brand-card rounded-2xl p-5">
    <div className="flex items-start justify-between">
      <div><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-3 text-3xl font-bold text-[#0B1D3A]">{value}</p></div>
      <span className="rounded-xl p-3" style={{background: accent+"18", color: accent}}><Icon size={21}/></span>
    </div>
  </article>
}


function RecentSplitSection({title,rows}:{title:string;rows:any[]}) {
  const [page,setPage]=useState(1);
  const pageSize=10;
  const totalPages=Math.max(1,Math.ceil(rows.length/pageSize));
  const pageRows=rows.slice((page-1)*pageSize,page*pageSize);
  useEffect(()=>{ if(page>totalPages) setPage(totalPages); },[page,totalPages]);

  return (
    <div className="brand-card rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-[#0B1D3A]">{title}</h3>
        <span className="text-xs text-slate-400">{rows.length} data</span>
      </div>
      <div className="mt-4 space-y-2">
        {pageRows.length ? pageRows.map((row)=>(
          <div key={row.id} className="rounded-xl border border-slate-100 px-3 py-3">
            <p className="font-semibold text-[#0B1D3A]">{row.store_name}</p>
            <p className="mt-1 text-xs text-slate-500">{row.stockpoint_name} · {row.pic_name}</p>
          </div>
        )):<div className="py-8 text-center text-sm text-slate-400">Belum ada data.</div>}
      </div>
      {totalPages>1 && <div className="mt-4 flex items-center justify-end gap-2">
        <button disabled={page===1} onClick={()=>setPage(v=>Math.max(1,v-1))} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold disabled:opacity-40">Sebelumnya</button>
        <span className="text-xs text-slate-400">{page}/{totalPages}</span>
        <button disabled={page===totalPages} onClick={()=>setPage(v=>Math.min(totalPages,v+1))} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold disabled:opacity-40">Berikutnya</button>
      </div>}
    </div>
  );
}

export default function DashboardPage() {
  const { role, loading: roleLoading } = useAppRole();
  const [summary, setSummary] = useState<Summary>(empty);
  const [loading, setLoading] = useState(false);
  const [detailRows,setDetailRows] = useState<any[]>([]);

  async function load() {
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const [{ data, error }, { data: reportRows, error: reportError }] = await Promise.all([
        supabase.rpc("dashboard_summary"),
        supabase.rpc("report_submissions",{p_search:null,p_branch_code:null,p_branding_status:null,p_limit:500,p_offset:0}),
      ]);
      if (error) throw error;
      if (reportError) throw reportError;
      setDetailRows(reportRows ?? []);

      if (data) {
        const raw = data as Partial<Summary>;
        setSummary({
          total: Number(raw.total ?? 0),
          brandable: Number(raw.brandable ?? 0),
          not_brandable: Number(raw.not_brandable ?? 0),
          drafts: Number(raw.drafts ?? 0),
          pic_active: Number(raw.pic_active ?? 0),
          stockpoints: Number(raw.stockpoints ?? 0),
          branch_counts: Array.isArray(raw.branch_counts) ? raw.branch_counts : [],
          trend: Array.isArray(raw.trend) ? raw.trend : [],
          recent: Array.isArray(raw.recent) ? raw.recent : [],
        });
      }
    } catch {
      setSummary(empty);
    } finally { setLoading(false); }
  }

  useEffect(()=>{
    if (!roleLoading && role) load();
  }, [role, roleLoading]);

  const cards = role === "pic"
    ? [
        ["Total Pekerjaan Saya", summary.total, BriefcaseBusiness, "#0B1D3A"],
        ["Draft Saya", summary.drafts, FileClock, "#FFC107"],
        ["Pekerjaan Selesai", summary.total-summary.drafts, CheckCircle2, "#1565EF"],
        ["Stockpoint Saya", summary.stockpoints, Store, "#4DB6FF"],
      ]
    : role === "client"
    ? [
        ["Total Pekerjaan", summary.total, Database, "#0B1D3A"],
        ["Bisa Dibranding", summary.brandable, CheckCircle2, "#1565EF"],
        ["Tidak Bisa Dibranding", summary.not_brandable, CircleX, "#4DB6FF"],
        ["Total Stockpoint", summary.stockpoints, Store, "#FFC107"],
      ]
    : [
        ["Total Pekerjaan", summary.total, Database, "#0B1D3A"],
        ["Bisa Dibranding", summary.brandable, CheckCircle2, "#1565EF"],
        ["Tidak Bisa Dibranding", summary.not_brandable, CircleX, "#4DB6FF"],
        ["PIC Aktif", summary.pic_active, UsersRound, "#FFC107"],
      ];

  const branchData = useMemo(()=>({
    labels: (summary.branch_counts ?? []).map(x=>x.label),
    datasets: [{ label: role==="pic" ? "Pekerjaan per Stockpoint" : "Pekerjaan per Branch", data: (summary.branch_counts ?? []).map(x=>x.value), backgroundColor: "#1565EF" }]
  }),[summary,role]);

  const statusData = {
    labels:["Bisa Dibranding","Tidak Bisa Dibranding"],
    datasets:[{data:[summary.brandable,summary.not_brandable],backgroundColor:["#1565EF","#FFC107"],borderWidth:0}]
  };
  const trendData = {
    labels: (summary.trend ?? []).map(x=>x.label),
    datasets:[{label:"Pekerjaan",data:(summary.trend ?? []).map(x=>x.value),borderColor:"#1565EF",backgroundColor:"#BEE6FF",tension:.35}]
  };

  return <section>
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div><h2 className="text-2xl font-bold text-[#0B1D3A]">Dashboard</h2><p className="mt-1 text-sm text-slate-500">{role==="pic"?"Hanya menampilkan pekerjaan dan Stockpoint yang menjadi assignment Anda.":"Ringkasan operasional branding warung."}</p></div>
      <button onClick={load} className="inline-flex items-center gap-2 rounded-xl border border-[#BEE6FF] bg-white px-4 py-2.5 text-sm font-semibold text-[#1565EF]"><RefreshCw size={16} className={loading?"animate-spin":""}/>Perbarui</button>
    </div>
    
    <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([l,v,i,a]:any)=><Card key={l} label={l} value={v} icon={i} accent={a}/>)}</div>

    <div className="mt-6 grid gap-6 xl:grid-cols-2">
      <section className="brand-card rounded-2xl p-6">
        <div className="mb-5 flex items-center gap-2"><BarChart3 size={19} className="text-[#1565EF]"/><h3 className="font-semibold text-[#0B1D3A]">{role==="pic"?"Pekerjaan per Stockpoint":"Pekerjaan per Branch"}</h3></div>
        <div className="h-72"><Bar data={branchData} options={{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}}}}/></div>
      </section>
      <section className="brand-card rounded-2xl p-6">
        <h3 className="font-semibold text-[#0B1D3A]">Brandable vs Not Brandable</h3>
        <div className="mx-auto mt-5 h-72 max-w-md"><Doughnut data={statusData} options={{responsive:true,maintainAspectRatio:false}}/></div>
      </section>
    </div>

    <section className="brand-card mt-6 rounded-2xl p-6">
      <h3 className="font-semibold text-[#0B1D3A]">Tren Pemasangan</h3>
      <div className="mt-5 h-72"><Line data={trendData} options={{responsive:true,maintainAspectRatio:false}}/></div>
    </section>

    <div className="mt-6 grid gap-5 xl:grid-cols-2">
        <RecentSplitSection
          title="Warung / Toko Bisa Dibranding"
          rows={detailRows.filter((row:any)=>row.branding_status==="brandable")}
        />
        <RecentSplitSection
          title="Warung / Toko Tidak Bisa Dibranding"
          rows={detailRows.filter((row:any)=>row.branding_status==="not_brandable")}
        />
      </div>
</section>
}
