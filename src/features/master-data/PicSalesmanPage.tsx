import { ArrowDown, ArrowUp, ArrowUpDown, Copy, Plus, RefreshCw, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { notify } from "../../components/ui/ToastHost";
import { getSupabaseClient } from "../../lib/supabase/client";

type SortDir = "asc" | "desc";
const inputClass="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition focus:border-[var(--role-accent)] focus:ring-4 focus:ring-[var(--role-border)] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400";
const norm=(v:any)=>String(v??"").trim().toUpperCase();

export default function PicSalesmanPage(){
  const [stockpoints,setStockpoints]=useState<any[]>([]);
  const [rows,setRows]=useState<any[]>([]);
  const [stockpoint,setStockpoint]=useState("");
  const [search,setSearch]=useState("");
  const [loading,setLoading]=useState(false);
  const [pageSize,setPageSize]=useState("10");
  const [page,setPage]=useState(1);
  const [sortKey,setSortKey]=useState("stockpoint");
  const [sortDir,setSortDir]=useState<SortDir>("asc");
  const [showAdd,setShowAdd]=useState(false);
  const [formStockpoint,setFormStockpoint]=useState("");
  const [suffixDigits,setSuffixDigits]=useState("");
  const [name,setName]=useState("");
  const [saving,setSaving]=useState(false);

  async function load(){
    setLoading(true);
    try{
      const s=getSupabaseClient();
      const {data:{user}}=await s.auth.getUser();
      if(!user) throw new Error("Sesi login tidak ditemukan.");
      const [{data:assign,error:assignError},{data:sales,error:salesError}]=await Promise.all([
        s.from("pic_stockpoint_assignments").select("stockpoint_id,stockpoints(id,branch_id,code,name,branches(code,name))").eq("pic_user_id",user.id).eq("is_active",true),
        s.from("salesmen").select("id,stockpoint_id,suffix,full_code,name,created_at,updated_at,stockpoints(id,branch_id,code,name,branches(code,name))").eq("is_active",true),
      ]);
      if(assignError) throw assignError;
      if(salesError) throw salesError;
      setStockpoints((assign??[]).map((x:any)=>x.stockpoints).filter(Boolean));
      setRows(sales??[]);
    }catch(e:any){notify("error","Data salesman gagal dimuat",e?.message||"Terjadi kesalahan.");}
    finally{setLoading(false);}
  }
  useEffect(()=>{load();},[]);
  useEffect(()=>setPage(1),[stockpoint,search,pageSize,sortKey,sortDir]);

  const filtered=useMemo(()=>rows.filter((r:any)=>{
    if(stockpoint&&r.stockpoint_id!==stockpoint) return false;
    const q=search.trim().toLowerCase();
    return !q||`${r.full_code} ${r.suffix} ${r.name} ${r.stockpoints?.code??""} ${r.stockpoints?.name??""}`.toLowerCase().includes(q);
  }),[rows,stockpoint,search]);
  const sorted=useMemo(()=>[...filtered].sort((a:any,b:any)=>{
    const val=(r:any)=>sortKey==="stockpoint"?`${r.stockpoints?.code??""} ${r.stockpoints?.name??""}`:sortKey==="name"?r.name:sortKey==="suffix"?r.suffix:r.full_code;
    const aa=String(val(a)??"").toLowerCase(),bb=String(val(b)??"").toLowerCase();
    const cmp=aa<bb?-1:aa>bb?1:0; return sortDir==="asc"?cmp:-cmp;
  }),[filtered,sortKey,sortDir]);
  const size=Number(pageSize),pages=Math.max(1,Math.ceil(sorted.length/size)),safePage=Math.min(page,pages);
  const pageRows=sorted.slice((safePage-1)*size,safePage*size);
  const selectedSp=stockpoints.find((sp:any)=>sp.id===formStockpoint);
  const preview=selectedSp&&suffixDigits?`${selectedSp.code}/S${suffixDigits}`:"—";
  function toggleSort(key:string){if(sortKey===key)setSortDir(v=>v==="asc"?"desc":"asc");else{setSortKey(key);setSortDir("asc");}}
  function SortIcon({column}:{column:string}){return sortKey!==column?<ArrowUpDown size={14}/>:sortDir==="asc"?<ArrowUp size={14}/>:<ArrowDown size={14}/>;}
  const header=(label:string,key:string)=><button type="button" onClick={()=>toggleSort(key)} className="inline-flex items-center gap-1.5 font-semibold hover:text-[var(--role-accent)]">{label}<SortIcon column={key}/></button>;
  async function copyDigits(suffix:string){const digits=String(suffix??"").replace(/^S/i,"");try{await navigator.clipboard.writeText(digits);notify("success","ID Salesman disalin",digits);}catch{notify("warning","Tidak dapat menyalin otomatis",`Salin angka ini: ${digits}`);}}
  function openAdd(){setFormStockpoint(stockpoint||stockpoints[0]?.id||"");setSuffixDigits("");setName("");setShowAdd(true);}
  async function save(){
    if(!formStockpoint) return notify("warning","Stockpoint wajib dipilih","Pilih Stockpoint terlebih dahulu.");
    if(!/^\d{1,5}$/.test(suffixDigits)) return notify("warning","ID Salesman belum valid","Isi 1–5 angka setelah huruf S.");
    const cleanName=norm(name); if(cleanName.length<2) return notify("warning","Nama Salesman wajib diisi","Minimal 2 karakter.");
    const suffix=`S${suffixDigits}`;
    if(rows.some((r:any)=>r.stockpoint_id===formStockpoint&&norm(r.suffix)===suffix)) return notify("error","ID Salesman sudah digunakan","ID yang sama pada Stockpoint ini tidak dapat ditambahkan lagi.");
    const dupNames=rows.filter((r:any)=>r.stockpoint_id===formStockpoint&&norm(r.name)===cleanName);
    if(dupNames.length&&!window.confirm(`Nama ${cleanName} sudah ada pada Stockpoint ini dengan ID ${dupNames.map((r:any)=>r.suffix).join(", ")}. Tetap tambahkan dengan ID baru?`)) return;
    setSaving(true);
    try{
      const s=getSupabaseClient();const {error}=await s.rpc("pic_create_salesman",{p_stockpoint_id:formStockpoint,p_suffix:suffix,p_name:cleanName});
      if(error) throw error;notify("success","Salesman ditambahkan",preview);setShowAdd(false);await load();
    }catch(e:any){notify("error","Salesman belum tersimpan",e?.message==="salesman_code_already_exists"?"ID Salesman sudah digunakan pada Stockpoint tersebut.":e?.message||"Terjadi kesalahan.");}
    finally{setSaving(false);}
  }

  return <section>
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-2xl font-bold text-[#0B1D3A]">Data Salesman</h2><p className="mt-1 text-sm text-slate-500">Daftar salesman hanya dari Stockpoint yang ditugaskan kepada Anda.</p></div><div className="flex gap-2"><button onClick={load} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600"><RefreshCw size={16} className={loading?"animate-spin":""}/>Perbarui</button><button onClick={openAdd} className="inline-flex items-center gap-2 rounded-xl bg-[var(--role-accent)] px-4 py-2.5 text-sm font-semibold text-white"><Plus size={17}/>Tambah Salesman</button></div></div>

    <div className="brand-card mt-6 rounded-2xl p-5"><div className="grid gap-3 md:grid-cols-[1fr_1.5fr_auto]">
      <select value={stockpoint} onChange={e=>setStockpoint(e.target.value)} className={inputClass}><option value="">Semua Stockpoint</option>{stockpoints.map((sp:any)=><option key={sp.id} value={sp.id}>{sp.name} - {sp.code}</option>)}</select>
      <label className="relative"><Search size={17} className="absolute left-3 top-3.5 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari ID / nama salesman..." className={`${inputClass} pl-10`}/></label>
      <button onClick={()=>{setStockpoint("");setSearch("");}} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600">Reset</button>
    </div></div>

    <div className="brand-card mt-6 overflow-hidden rounded-2xl"><div className="overflow-x-auto"><table className="min-w-[820px] w-full text-sm"><thead className="bg-[var(--role-pale)]"><tr><th className="px-4 py-3 text-left">Branch</th><th className="px-4 py-3 text-left">{header("Stockpoint","stockpoint")}</th><th className="px-4 py-3 text-left">{header("ID Salesman","suffix")}</th><th className="px-4 py-3 text-left">{header("Nama Salesman","name")}</th><th className="px-4 py-3 text-left">Aksi</th></tr></thead><tbody>{pageRows.length?pageRows.map((r:any)=><tr key={r.id} className="border-t border-slate-100"><td className="px-4 py-3">{r.stockpoints?.branches?.code??"—"}</td><td className="px-4 py-3">{r.stockpoints?.name} - {r.stockpoints?.code}</td><td className="px-4 py-3 font-bold text-[#0B1D3A]">{r.full_code ?? `${r.stockpoints?.code ?? ""}/${r.suffix ?? ""}`}</td><td className="px-4 py-3">{r.name}</td><td className="px-4 py-3"><button onClick={()=>copyDigits(r.suffix)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 font-semibold"><Copy size={14}/>Copy ID</button></td></tr>):<tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">Belum ada data salesman.</td></tr>}</tbody></table></div>
      <div className="flex flex-col gap-3 border-t border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between"><label className="text-xs text-slate-500">Show <select value={pageSize} onChange={e=>setPageSize(e.target.value)} className="ml-2 rounded-lg border border-slate-200 px-2 py-1.5">{[10,25,50,100,250].map(n=><option key={n}>{n}</option>)}</select></label><div className="flex items-center gap-2"><button disabled={safePage<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs disabled:opacity-40">Sebelumnya</button><span className="text-xs text-slate-500">{safePage}/{pages}</span><button disabled={safePage>=pages} onClick={()=>setPage(p=>Math.min(pages,p+1))} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs disabled:opacity-40">Berikutnya</button></div></div>
    </div>

    {showAdd&&<div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#0B1D3A]/55 p-4 backdrop-blur-sm"><div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><h3 className="text-lg font-bold text-[#0B1D3A]">Tambah Salesman</h3><p className="mt-1 text-sm text-slate-500">Salesman akan melekat pada Stockpoint yang dipilih.</p></div><button onClick={()=>setShowAdd(false)} className="rounded-xl border border-slate-200 p-2"><X size={17}/></button></div>
      <label className="mt-5 block text-sm font-semibold text-slate-600">Stockpoint<select value={formStockpoint} onChange={e=>setFormStockpoint(e.target.value)} className={`${inputClass} mt-2`}>{stockpoints.map((sp:any)=><option key={sp.id} value={sp.id}>{sp.name} - {sp.code}</option>)}</select></label>
      <label className="mt-4 block text-sm font-semibold text-slate-600">ID Salesman<div className="mt-2 flex overflow-hidden rounded-xl border border-slate-200"><span className="flex items-center bg-[var(--role-pale)] px-3 font-bold text-[var(--role-accent)]">S</span><input value={suffixDigits} onChange={e=>setSuffixDigits(e.target.value.replace(/\D/g,"").slice(0,5))} inputMode="numeric" placeholder="12345" className="min-w-0 flex-1 px-3 py-3 outline-none"/></div></label>
      <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">Preview: {preview}</p>
      <label className="mt-4 block text-sm font-semibold text-slate-600">Nama Salesman<input value={name} onChange={e=>setName(norm(e.target.value))} placeholder="NAMA SALESMAN" className={`${inputClass} mt-2`}/></label>
      <p className="mt-2 text-xs text-amber-600">ID duplicate akan ditolak. Nama duplicate akan mendapat peringatan sebelum disimpan.</p>
      <div className="mt-5 flex justify-end gap-2"><button onClick={()=>setShowAdd(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold">Batal</button><button disabled={saving} onClick={save} className="rounded-xl bg-[var(--role-accent)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40">{saving?"Menyimpan...":"Simpan Salesman"}</button></div>
    </div></div>}
  </section>;
}
