import { Save, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { notify } from "../../components/ui/ToastHost";
import { getSupabaseClient } from "../../lib/supabase/client";
import PhotoUploader from "../submissions/PhotoUploader";

const inputClass="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-[var(--role-accent)] focus:ring-4 focus:ring-[var(--role-border)]";
const upper=(v:string)=>v.toLocaleUpperCase("id-ID");

export default function AdminEditDoneModal({row,onClose,onSaved}:{row:any;onClose:()=>void;onSaved:(updated?:any)=>void}){
  const salesmanParts=String(row.salesman_code??"").split("/");
  const storeParts=String(row.store_code??"").split("/");
  const [suffix,setSuffix]=useState(String(salesmanParts[2]??"S").replace(/^S/i,""));
  const [storeSuffix,setStoreSuffix]=useState(storeParts[2]??"");
  const [salesmen,setSalesmen]=useState<any[]>([]);
  const [storeName,setStoreName]=useState(row.store_name??"");
  const [ownerName,setOwnerName]=useState(row.owner_name??"");
  const [phone,setPhone]=useState(row.owner_phone??"");
  const [address,setAddress]=useState(row.store_address??"");
  const [lat,setLat]=useState(row.latitude==null?"":String(row.latitude));
  const [lng,setLng]=useState(row.longitude==null?"":String(row.longitude));
  const [accuracy,setAccuracy]=useState(row.location_accuracy_meters==null?"":String(row.location_accuracy_meters));
  const [maps,setMaps]=useState(row.google_maps_url??"");
  const [storeType,setStoreType]=useState(row.store_type??"warung");
  const [hasChiller,setHasChiller]=useState(Boolean(row.has_chiller));
  const [brandable,setBrandable]=useState(row.branding_status==="brandable");
  const [reason,setReason]=useState(row.not_brandable_reason??"");
  const [version,setVersion]=useState(Number(row.version??1));
  const [saving,setSaving]=useState(false);
  const sp1=salesmanParts[0]||String(row.stockpoint_code??"").split("/")[0]||"";
  const sp2=salesmanParts[1]||String(row.stockpoint_code??"").split("/")[1]||"";
  const fullSalesman=`${sp1}/${sp2}/S${suffix}`;
  const storeCode=`${sp1}/${sp2}/${storeSuffix}`;
  const selectedSalesman=useMemo(()=>salesmen.find(s=>s.suffix===`S${suffix}`),[salesmen,suffix]);

  useEffect(()=>{
    const onVersion=(event:any)=>{if(event.detail?.version)setVersion(Number(event.detail.version));};
    window.addEventListener("submission-version",onVersion);
    return()=>window.removeEventListener("submission-version",onVersion);
  },[]);

  useEffect(()=>{(async()=>{const s=getSupabaseClient();const {data}=await s.from("salesmen").select("id,suffix,full_code,name").eq("stockpoint_id",row.stockpoint_id).eq("is_active",true).order("name");setSalesmen(data??[]);})()},[row.id,row.stockpoint_id]);

  async function save(){
    if(!/^\d{1,5}$/.test(suffix)) return notify("warning","ID Salesman belum valid","Isi 1–5 angka setelah S.");
    const originalSuffix=String(salesmanParts[2]??"").toUpperCase();
    if(!selectedSalesman && `S${suffix}`!==originalSuffix) return notify("warning","Salesman belum terdaftar","ID Salesman baru harus tersedia di master salesman terlebih dahulu.");
    if(!/^\d{2,6}$/.test(storeSuffix)) return notify("warning","Kode Toko belum valid","Suffix Kode Toko 2–6 digit.");
    if(!/^08\d{7,13}$/.test(phone)) return notify("warning","Nomor HP belum valid","Nomor harus diawali 08.");
    if(address.trim().length<20) return notify("warning","Alamat terlalu pendek","Alamat minimal 20 karakter.");
    if(!brandable&&!reason.trim()) return notify("warning","Alasan wajib diisi","Isi alasan tidak bisa dibranding.");
    const useGeo=lat!==""||lng!==""||accuracy!=="";
    if(useGeo && (lat===""||lng===""||accuracy==="")) return notify("warning","GPS belum lengkap","Latitude, longitude, dan accuracy harus terisi bersama.");
    setSaving(true);
    try{
      const s=getSupabaseClient();
      const {data,error}=await s.rpc("admin_update_done_submission",{
        p_submission_id:row.id,p_expected_version:version,p_salesman_part_3:`S${suffix}`,p_store_code:storeCode,
        p_store_name:upper(storeName),p_owner_name:upper(ownerName),p_owner_phone:phone,p_store_address:address,
        p_latitude:useGeo?Number(lat):null,p_longitude:useGeo?Number(lng):null,p_location_accuracy_meters:useGeo?Number(accuracy):null,
        p_google_maps_url:useGeo?null:(maps.trim()||null),p_store_type:storeType,p_has_chiller:hasChiller,
        p_branding_status:brandable?"brandable":"not_brandable",p_not_brandable_reason:brandable?null:reason,
      });
      if(error) throw error;
      setVersion(Number(data?.version??version+1));
      try{await s.functions.invoke("spreadsheet-sync",{body:{submission_id:row.id}});}catch{}
      notify("success","Pekerjaan diperbarui","Status pekerjaan tetap DONE dan perubahan tercatat di Audit Log.");
      onSaved(data);
    }catch(e:any){notify("error","Edit belum tersimpan",e?.message||"Terjadi kesalahan.");}
    finally{setSaving(false);}
  }

  return <div className="fixed inset-0 z-[120] overflow-y-auto bg-[#0B1D3A]/60 p-4 backdrop-blur-sm"><div className="mx-auto my-4 w-full max-w-5xl rounded-3xl bg-white p-6 shadow-2xl">
    <div className="flex items-start justify-between gap-4"><div><h3 className="text-xl font-bold text-[#0B1D3A]">Edit Pekerjaan Selesai</h3><p className="mt-1 text-sm text-slate-500">{row.store_name} · {row.stockpoint_code} · {row.stockpoint_name}</p><p className="mt-1 text-xs font-semibold text-emerald-600">Status tetap DONE. Semua perubahan dicatat di Audit Log.</p></div><button onClick={onClose} className="rounded-xl border border-slate-200 p-2 text-slate-500"><X size={18}/></button></div>

    <div className="mt-6 grid gap-4 md:grid-cols-2">
      <label className="text-sm font-semibold text-slate-600">ID Salesman<div className="mt-1.5 flex overflow-hidden rounded-xl border border-slate-200"><span className="bg-slate-50 px-3 py-3 text-sm text-slate-500">{sp1}/{sp2}/S</span><input value={suffix} onChange={e=>setSuffix(e.target.value.replace(/\D/g,"").slice(0,5))} className="min-w-0 flex-1 px-3 text-sm outline-none"/></div><span className="mt-1 block text-[11px] font-normal text-slate-400">{selectedSalesman?`Salesman: ${selectedSalesman.name}`:`${fullSalesman} belum ada di master salesman${`S${suffix}`===String(salesmanParts[2]??"").toUpperCase()?" · ID historis tetap boleh disimpan selama tidak diubah":""}`}</span></label>
      <label className="text-sm font-semibold text-slate-600">Kode Toko<div className="mt-1.5 flex overflow-hidden rounded-xl border border-slate-200"><span className="bg-slate-50 px-3 py-3 text-sm text-slate-500">{sp1}/{sp2}/</span><input value={storeSuffix} onChange={e=>setStoreSuffix(e.target.value.replace(/\D/g,"").slice(0,6))} className="min-w-0 flex-1 px-3 text-sm outline-none"/></div></label>
      <label className="text-sm font-semibold text-slate-600">Nama Toko<input value={storeName} onChange={e=>setStoreName(upper(e.target.value))} className={inputClass}/></label>
      <label className="text-sm font-semibold text-slate-600">Nama Pemilik<input value={ownerName} onChange={e=>setOwnerName(upper(e.target.value))} className={inputClass}/></label>
      <label className="text-sm font-semibold text-slate-600">No HP/WA<input value={phone} onChange={e=>setPhone(e.target.value.replace(/\D/g,"").slice(0,15))} className={inputClass}/></label>
      <label className="text-sm font-semibold text-slate-600">Jenis Store<select value={storeType} onChange={e=>setStoreType(e.target.value)} className={inputClass}><option value="warung">WARUNG</option><option value="grosir">GROSIR</option></select></label>
      <label className="text-sm font-semibold text-slate-600 md:col-span-2">Alamat<textarea value={address} onChange={e=>setAddress(e.target.value)} rows={3} className={inputClass}/></label>
      <label className="text-sm font-semibold text-slate-600">Chiller<select value={hasChiller?"yes":"no"} onChange={e=>{const yes=e.target.value==="yes";setHasChiller(yes);if(!yes){setBrandable(false);setReason("Tidak ada chiller");}}} className={inputClass}><option value="yes">ADA</option><option value="no">TIDAK ADA</option></select></label>
      <label className="text-sm font-semibold text-slate-600">Status Branding<select value={brandable?"brandable":"not_brandable"} onChange={e=>setBrandable(e.target.value==="brandable")} disabled={!hasChiller} className={inputClass}><option value="brandable">DIBRANDING</option><option value="not_brandable">TIDAK DIBRANDING</option></select></label>
      {!brandable&&<label className="text-sm font-semibold text-slate-600 md:col-span-2">Alasan<textarea value={reason} onChange={e=>setReason(e.target.value)} rows={2} className={inputClass}/></label>}
    </div>

    <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-sm font-semibold text-slate-600">Lokasi</p><div className="mt-3 grid gap-3 md:grid-cols-3"><input value={lat} onChange={e=>setLat(e.target.value)} placeholder="Latitude" className={inputClass}/><input value={lng} onChange={e=>setLng(e.target.value)} placeholder="Longitude" className={inputClass}/><input value={accuracy} onChange={e=>setAccuracy(e.target.value)} placeholder="Accuracy (m)" className={inputClass}/></div><input value={maps} onChange={e=>setMaps(e.target.value)} disabled={lat!==""||lng!==""} placeholder="Atau link Google Maps manual" className={inputClass}/></div>

    <div className="mt-6 border-t border-slate-100 pt-6"><h4 className="font-semibold text-[#0B1D3A]">Edit / Ganti Foto</h4><p className="mt-1 text-xs text-slate-400">Pilih foto pada slot yang ingin diganti. Foto lama akan dinonaktifkan dan cleanup Drive masuk antrean integrasi.</p><div className="mt-4"><PhotoUploader submissionId={row.id} hasChiller={hasChiller} watermarkMeta={{latitude:lat?Number(lat):null,longitude:lng?Number(lng):null,picCode:row.pic_code,picName:row.pic_name,stockpointCode:row.stockpoint_code,stockpointName:row.stockpoint_name}} /></div></div>

    <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-5"><button onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold">Tutup</button><button disabled={saving} onClick={save} className="inline-flex items-center gap-2 rounded-xl bg-[var(--role-accent)] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><Save size={16}/>{saving?"Menyimpan...":"Simpan Perubahan"}</button></div>
  </div></div>;
}
