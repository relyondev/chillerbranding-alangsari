import { ArrowDown, ArrowUp, ArrowUpDown, Copy, Edit3, Plus, RefreshCw, Search, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { notify } from "../../components/ui/ToastHost";
import { getSupabaseClient } from "../../lib/supabase/client";

type Salesman = any;
type SortDir = "asc" | "desc";

const inputClass="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition focus:border-[var(--role-accent)] focus:ring-4 focus:ring-[var(--role-border)] disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400";
const norm=(value:any)=>String(value??"").trim().toUpperCase();

export default function SalesmanManagementPage(){
  const [branches,setBranches]=useState<any[]>([]);
  const [stockpoints,setStockpoints]=useState<any[]>([]);
  const [rows,setRows]=useState<Salesman[]>([]);
  const [branch,setBranch]=useState("");
  const [stockpoint,setStockpoint]=useState("");
  const [search,setSearch]=useState("");
  const [loading,setLoading]=useState(false);
  const [modal,setModal]=useState<Salesman|null|undefined>(undefined);
  const [formBranch,setFormBranch]=useState("");
  const [formStockpoint,setFormStockpoint]=useState("");
  const [suffixDigits,setSuffixDigits]=useState("");
  const [name,setName]=useState("");
  const [saving,setSaving]=useState(false);
  const [sortKey,setSortKey]=useState("branch");
  const [sortDir,setSortDir]=useState<SortDir>("asc");
  const [pageSize,setPageSize]=useState("10");
  const [page,setPage]=useState(1);

  async function loadBase(){
    const s=getSupabaseClient();
    const [{data:b},{data:sp}]=await Promise.all([
      s.from("branches").select("id,code,name").eq("is_active",true).order("code"),
      s.from("stockpoints").select("id,branch_id,code,name").eq("is_active",true).order("code"),
    ]);
    setBranches(b??[]); setStockpoints(sp??[]);
  }
  async function load(){
    setLoading(true);
    try{
      const s=getSupabaseClient();
      const {data,error}=await s.from("salesmen").select("id,stockpoint_id,suffix,full_code,name,is_active,created_at,updated_at,stockpoints(id,branch_id,code,name,branches(code,name))").eq("is_active",true).order("created_at",{ascending:false});
      if(error) throw error;
      setRows(data??[]);
    }catch(e:any){notify("error","Data salesman gagal dimuat",e?.message||"Terjadi kesalahan.");}
    finally{setLoading(false);}
  }
  useEffect(()=>{loadBase();load();},[]);
  useEffect(()=>setPage(1),[branch,stockpoint,search,pageSize,sortKey,sortDir]);

  const filtered=useMemo(()=>rows.filter((r:any)=>{
    const sp=r.stockpoints;
    if(branch && sp?.branch_id!==branch) return false;
    if(stockpoint && r.stockpoint_id!==stockpoint) return false;
    const q=search.trim().toLowerCase();
    if(q && !`${r.full_code} ${r.name} ${sp?.name??""} ${sp?.code??""} ${sp?.branches?.code??""}`.toLowerCase().includes(q)) return false;
    return true;
  }),[rows,branch,stockpoint,search]);

  const sorted=useMemo(()=>[...filtered].sort((a:any,b:any)=>{
    const value=(row:any)=>{
      if(sortKey==="branch") return `${row.stockpoints?.branches?.code??""} ${row.stockpoints?.branches?.name??""}`;
      if(sortKey==="stockpoint") return `${row.stockpoints?.code??""} ${row.stockpoints?.name??""}`;
      if(sortKey==="full_code") return row.full_code??"";
      if(sortKey==="name") return row.name??"";
      return row?.[sortKey]??"";
    };
    const aa=String(value(a)).toLowerCase(); const bb=String(value(b)).toLowerCase();
    const cmp=aa<bb?-1:aa>bb?1:0; return sortDir==="asc"?cmp:-cmp;
  }),[filtered,sortKey,sortDir]);

  const size=Number(pageSize);
  const totalPages=Math.max(1,Math.ceil(sorted.length/size));
  const safePage=Math.min(page,totalPages);
  const pageRows=sorted.slice((safePage-1)*size,safePage*size);
  const stockpointsForFilter=useMemo(()=>stockpoints.filter(sp=>!branch||sp.branch_id===branch),[stockpoints,branch]);
  const stockpointsForForm=useMemo(()=>stockpoints.filter(sp=>!formBranch||sp.branch_id===formBranch),[stockpoints,formBranch]);
  const selectedFormSp=stockpoints.find(sp=>sp.id===formStockpoint);
  const prefix=selectedFormSp?.code??"";
  const suffix=`S${suffixDigits}`;
  const preview=prefix&&suffixDigits?`${prefix}/${suffix}`:"—";

  function toggleSort(key:string){ if(sortKey===key)setSortDir(v=>v==="asc"?"desc":"asc");else{setSortKey(key);setSortDir("asc");} }
  function SortIcon({column}:{column:string}){return sortKey!==column?<ArrowUpDown size={14}/>:sortDir==="asc"?<ArrowUp size={14}/>:<ArrowDown size={14}/>;}
  async function copyCode(code:string){try{await navigator.clipboard.writeText(code);notify("success","ID Salesman disalin",code);}catch{notify("warning","Tidak dapat menyalin otomatis","Silakan salin ID Salesman secara manual.");}}
  function openCreate(){setModal(null);setFormBranch("");setFormStockpoint("");setSuffixDigits("");setName("");}
  function openEdit(row:any){setModal(row);setFormBranch(row.stockpoints?.branch_id??"");setFormStockpoint(row.stockpoint_id);setSuffixDigits(String(row.suffix??"").replace(/^S/i,""));setName(row.name??"");}

  async function save(){
    if(!formStockpoint) return notify("warning","Stockpoint wajib dipilih","Pilih Branch dan Stockpoint terlebih dahulu.");
    if(!/^\d{1,5}$/.test(suffixDigits)) return notify("warning","ID Salesman belum valid","Isi 1–5 angka setelah huruf S.");
    const cleanName=norm(name);
    if(cleanName.length<2) return notify("warning","Nama Salesman wajib diisi","Isi nama salesman minimal 2 karakter.");
    const codeExists=rows.some((r:any)=>r.stockpoint_id===formStockpoint&&norm(r.suffix)===norm(suffix)&&r.id!==modal?.id);
    if(codeExists) return notify("error","ID Salesman sudah digunakan","ID yang sama tidak dapat digunakan dua kali pada Stockpoint yang sama.");
    const sameName=rows.filter((r:any)=>r.stockpoint_id===formStockpoint&&norm(r.name)===cleanName&&r.id!==modal?.id);
    if(sameName.length && !window.confirm(`Nama salesman ${cleanName} sudah ada pada Stockpoint ini dengan ID ${sameName.map((x:any)=>x.full_code).join(", ")}. Tetap simpan dengan ID berbeda?`)) return;
    setSaving(true);
    try{
      const s=getSupabaseClient();
      const {error}=await s.rpc("admin_save_salesman",{p_salesman_id:modal?.id??null,p_stockpoint_id:formStockpoint,p_suffix:suffix,p_name:cleanName});
      if(error) throw error;
      notify("success",modal?"Salesman diperbarui":"Salesman ditambahkan",preview);
      setModal(undefined); await load();
    }catch(e:any){notify("error","Salesman belum tersimpan",e?.message==="salesman_code_already_exists"?"Kode salesman sudah digunakan pada Stockpoint tersebut.":e?.message||"Terjadi kesalahan.");}
    finally{setSaving(false);}
  }

  async function remove(row:any){
    if(!window.confirm(`Hapus salesman ${row.full_code} · ${row.name}? Salesman yang sudah memiliki pekerjaan tidak dapat dihapus.`)) return;
    try{const s=getSupabaseClient();const {error}=await s.rpc("admin_delete_salesman",{p_salesman_id:row.id});if(error)throw error;notify("success","Salesman dihapus","Data dinonaktifkan dari master salesman.");await load();}
    catch(e:any){notify("error","Salesman tidak dapat dihapus",e?.message==="salesman_has_work"?"Salesman sudah memiliki pekerjaan. Nama/kode masih dapat diedit, tetapi tidak dapat dihapus.":e?.message||"Terjadi kesalahan.");}
  }

  const header=(label:string,key:string)=><button type="button" onClick={()=>toggleSort(key)} className="inline-flex items-center gap-1.5 font-semibold hover:text-[var(--role-accent)]">{label}<SortIcon column={key}/></button>;

  return <section>
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div><h2 className="text-2xl font-bold text-[#0B1D3A]">Data Salesman</h2><p className="mt-1 text-sm text-slate-500">Salesman melekat ke Stockpoint. PIC dapat menambahkan salesman saat input, tetapi penghapusan hanya oleh Admin/Super Admin.</p></div>
      <div className="flex gap-2"><button onClick={load} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600"><RefreshCw size={16} className={loading?"animate-spin":""}/>Perbarui</button><button onClick={openCreate} className="inline-flex items-center gap-2 rounded-xl bg-[var(--role-accent)] px-4 py-2.5 text-sm font-semibold text-white"><Plus size={17}/>Tambah Salesman</button></div>
    </div>

    <div className="brand-card mt-6 rounded-2xl p-5"><div className="grid gap-3 lg:grid-cols-[1.3fr_1fr_1.4fr_auto]">
      <select value={branch} onChange={e=>{setBranch(e.target.value);setStockpoint("");}} className={inputClass}><option value="">Semua Branch</option>{branches.map(b=><option key={b.id} value={b.id}>{b.code} · {b.name}</option>)}</select>
      <select value={stockpoint} onChange={e=>setStockpoint(e.target.value)} disabled={!branch} className={inputClass}><option value="">{branch?"Semua Stockpoint":"Pilih Branch terlebih dahulu"}</option>{stockpointsForFilter.map(sp=><option key={sp.id} value={sp.id}>{sp.code} · {sp.name}</option>)}</select>
      <label className="relative"><Search size={17} className="absolute left-3 top-3.5 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari ID / nama salesman..." className={`${inputClass} pl-10`}/></label>
      <button onClick={()=>{setBranch("");setStockpoint("");setSearch("");}} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600">Reset</button>
    </div></div>

    <div className="brand-card mt-6 overflow-hidden rounded-2xl">
      <div className="overflow-x-auto"><table className="min-w-[980px] w-full text-sm"><thead className="bg-[var(--role-pale)]"><tr><th className="px-4 py-3 text-left">{header("Branch","branch")}</th><th className="px-4 py-3 text-left">{header("Stockpoint","stockpoint")}</th><th className="px-4 py-3 text-left">{header("ID Salesman","full_code")}</th><th className="px-4 py-3 text-left">{header("Nama Salesman","name")}</th><th className="px-4 py-3 text-left">Aksi</th></tr></thead><tbody>{pageRows.length?pageRows.map((r:any)=><tr key={r.id} className="border-t border-slate-100"><td className="px-4 py-3">{r.stockpoints?.branches?.code??"—"}</td><td className="px-4 py-3"><span className="font-medium">{r.stockpoints?.code}</span> · {r.stockpoints?.name}</td><td className="px-4 py-3 font-semibold text-[#0B1D3A]">{r.full_code}</td><td className="px-4 py-3">{r.name}</td><td className="px-4 py-3"><div className="flex gap-2"><button onClick={()=>copyCode(r.full_code)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold"><Copy size={14}/>Copy ID</button><button onClick={()=>openEdit(r)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold"><Edit3 size={14}/>Edit</button><button onClick={()=>remove(r)} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600"><Trash2 size={14}/>Hapus</button></div></td></tr>):<tr><td colSpan={5} className="px-5 py-12 text-center text-slate-400">Belum ada data salesman.</td></tr>}</tbody></table></div>
      <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2 text-sm text-slate-500"><span>Tampilkan</span><select value={pageSize} onChange={e=>setPageSize(e.target.value)} className="rounded-lg border border-slate-200 px-2 py-1.5"><option>10</option><option>25</option><option>50</option><option>100</option><option>250</option></select><span>dari {sorted.length} data</span></div><div className="flex items-center gap-2"><button disabled={safePage<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold disabled:opacity-40">Sebelumnya</button><span className="text-sm text-slate-500">Halaman {safePage} / {totalPages}</span><button disabled={safePage>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold disabled:opacity-40">Berikutnya</button></div></div>
    </div>

    {modal!==undefined&&<div className="fixed inset-0 z-[110] flex items-center justify-center bg-[#0B1D3A]/55 p-4 backdrop-blur-sm"><div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><h3 className="text-lg font-bold text-[#0B1D3A]">{modal?"Edit Salesman":"Tambah Salesman"}</h3><p className="mt-1 text-sm text-slate-500">Pilih Branch → Stockpoint → isi bagian terakhir ID Salesman.</p></div><button onClick={()=>setModal(undefined)} className="rounded-xl border border-slate-200 p-2"><X size={17}/></button></div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold text-slate-600">Branch<select value={formBranch} onChange={e=>{setFormBranch(e.target.value);setFormStockpoint("");}} disabled={!!modal} className={`mt-2 ${inputClass}`}><option value="">Pilih Branch</option>{branches.map(b=><option key={b.id} value={b.id}>{b.code} · {b.name}</option>)}</select></label><label className="text-sm font-semibold text-slate-600">Stockpoint<select value={formStockpoint} onChange={e=>setFormStockpoint(e.target.value)} disabled={!formBranch || !!modal} className={`mt-2 ${inputClass}`}><option value="">{formBranch?"Pilih Stockpoint":"Pilih Branch terlebih dahulu"}</option>{stockpointsForForm.map(sp=><option key={sp.id} value={sp.id}>{sp.code} · {sp.name}</option>)}</select></label></div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold text-slate-600">Digit ID Salesman<div className="mt-2 flex items-center rounded-xl border border-slate-200 bg-white"><span className="px-4 font-bold text-slate-500">S</span><input value={suffixDigits} onChange={e=>setSuffixDigits(e.target.value.replace(/\D/g,"").slice(0,5))} inputMode="numeric" placeholder="12345" className="min-w-0 flex-1 rounded-r-xl px-3 py-3 text-sm outline-none"/></div><span className="mt-1 block text-[11px] font-normal text-slate-400">Maksimum total ID: S + 5 angka = 6 karakter.</span></label><label className="text-sm font-semibold text-slate-600">Nama Salesman<input value={name} onChange={e=>setName(e.target.value.toUpperCase())} placeholder="NAMA SALESMAN" className={`mt-2 ${inputClass}`}/></label></div>
      <div className="mt-4 rounded-xl bg-[var(--role-pale)] px-4 py-3 text-sm font-semibold text-[var(--role-accent)]">Preview: {preview}</div>
      <div className="mt-6 flex justify-end gap-2"><button onClick={()=>setModal(undefined)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold">Batal</button><button disabled={saving} onClick={save} className="rounded-xl bg-[var(--role-accent)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving?"Menyimpan...":"Simpan Salesman"}</button></div>
    </div></div>}
  </section>;
}
