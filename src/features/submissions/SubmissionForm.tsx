import { notify } from "../../components/ui/ToastHost";
import { CheckCircle2, Save, Search, Send, Store, MapPinned, UserRound, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "../../lib/supabase/client";
import { buildSalesmanCode, buildStoreCode } from "../../lib/validation/codes";
import PhotoUploader from "./PhotoUploader";
import GeoLocationPicker from "./GeoLocationPicker";

type Geo = { latitude:number; longitude:number; accuracy:number } | null;

const inputClass =
  "mt-2 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#0B1D3A] outline-none transition placeholder:text-slate-400 focus:border-[var(--role-accent)] focus:ring-4 focus:ring-[var(--role-border)] disabled:bg-slate-50 disabled:text-slate-400";

function uppercaseValue(value:string) {
  return value.toLocaleUpperCase("id-ID");
}

function CodeField({
  value,
  onChange,
  placeholder,
  helper,
  disabled,
  alphaNumeric = false,
  maxLength,
}: {
  value:string;
  onChange:(value:string)=>void;
  placeholder:string;
  helper:string;
  disabled:boolean;
  alphaNumeric?:boolean;
  maxLength:number;
}) {
  return (
    <div className="min-w-0">
      <input
        value={value}
        onChange={(e)=>onChange(
          alphaNumeric
            ? e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,maxLength)
            : e.target.value.replace(/\D/g,"").slice(0,maxLength)
        )}
        placeholder={placeholder}
        inputMode={alphaNumeric ? undefined : "numeric"}
        disabled={disabled}
        className="w-full min-w-0 rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none transition focus:border-[var(--role-accent)] focus:ring-4 focus:ring-[var(--role-border)] disabled:bg-slate-50 disabled:text-slate-400"
      />
      {helper && <span className="mt-1.5 block text-[11px] leading-4 text-slate-400">{helper}</span>}
    </div>
  );
}

export default function SubmissionForm() {
  const [stockpoints,setStockpoints] = useState<any[]>([]);
  const [stockpointId,setStockpointId] = useState("");
  const [p1,setP1] = useState("");
  const [p2,setP2] = useState("");
  const [p3,setP3] = useState("");
  const [salesmen,setSalesmen] = useState<any[]>([]);
  const [storeP1,setStoreP1] = useState("");
  const [storeP2,setStoreP2] = useState("");
  const [storeP3,setStoreP3] = useState("");
  const [storeName,setStoreName] = useState("");
  const [ownerName,setOwnerName] = useState("");
  const [phone,setPhone] = useState("");
  const [address,setAddress] = useState("");
  const [storeType,setStoreType] = useState("");
  const [hasChiller,setHasChiller] = useState<boolean | null>(null);
  const [brandable,setBrandable] = useState<boolean | null>(null);
  const [reasonCategory,setReasonCategory] = useState("");
  const [reason,setReason] = useState("");
  const [geo,setGeo] = useState<Geo>(null);
  const [picCode,setPicCode] = useState("");
  const [picName,setPicName] = useState("");
  const [submission,setSubmission] = useState<any>(null);
  const [photosComplete,setPhotosComplete] = useState(false);
  const [busy,setBusy] = useState(false);
  const [loadingDraft,setLoadingDraft] = useState(false);
  const [submitSuccess,setSubmitSuccess] = useState<{count:number}|null>(null);
  const [geoLocked,setGeoLocked] = useState(false);
  const [showSalesmanLookup,setShowSalesmanLookup] = useState(false);
  const [lookupStockpoint,setLookupStockpoint] = useState("");
  const [lookupSearch,setLookupSearch] = useState("");
  const [lookupRows,setLookupRows] = useState<any[]>([]);
  const [lookupLoading,setLookupLoading] = useState(false);

  useEffect(() => {
    const onVersion = (e:any) => {
      if (e.detail?.version) {
        setSubmission((old:any) => old ? { ...old, version:e.detail.version } : old);
      }
    };

    window.addEventListener("submission-version",onVersion);

    (async () => {
      try {
        const s = getSupabaseClient();
        const { data:{user} } = await s.auth.getUser();
        if (!user) return;

        const [{ data }, { data: profile }, { data: picProfile }] = await Promise.all([
          s
            .from("pic_stockpoint_assignments")
            .select("stockpoint_id,stockpoints(id,code,name,branches(code,name))")
            .eq("pic_user_id",user.id)
            .eq("is_active",true),
          s.from("profiles").select("full_name").eq("id",user.id).maybeSingle(),
          s.from("pic_profiles").select("pic_code").eq("user_id",user.id).maybeSingle(),
        ]);

        setStockpoints((data ?? []).map((x:any)=>x.stockpoints).filter(Boolean));
        setPicName(profile?.full_name ?? "");
        setPicCode(picProfile?.pic_code ?? "");

        const draftId = new URLSearchParams(window.location.search).get("draft");

        if (draftId) {
          setLoadingDraft(true);

          const { data: draft, error: draftError } = await s
            .from("submissions")
            .select("*")
            .eq("id", draftId)
            .eq("pic_user_id", user.id)
            .eq("workflow_status", "draft")
            .is("deleted_at", null)
            .single();

          if (draftError || !draft) {
            notify("error","Periksa kembali","Draft tidak ditemukan atau bukan milik akun PIC ini.");
          } else {
            setSubmission(draft);
            setStockpointId(draft.stockpoint_id ?? "");

            const salesmanParts = String(draft.salesman_code ?? "").split("/");
            setP1(salesmanParts[0] ?? "");
            setP2(salesmanParts[1] ?? "");
            setP3(salesmanParts[2] ?? "");

            const storeParts = String(draft.store_code ?? "").split("/");
            setStoreP1(storeParts[0] ?? "");
            setStoreP2(storeParts[1] ?? "");
            setStoreP3(storeParts[2] ?? "");

            setStoreName(draft.store_name ?? "");
            setOwnerName(draft.owner_name ?? "");
            setPhone(draft.owner_phone ?? "");
            setAddress(draft.store_address ?? "");
            setStoreType(draft.store_type ?? "");
            setHasChiller(Boolean(draft.has_chiller));
            setBrandable(draft.branding_status === "brandable");
            const draftReason = String(draft.not_brandable_reason ?? "");
            const reasonMatch = draftReason.match(/^\[(TUTUP PERMANEN|PINDAH LOKASI|PERBAIKAN)\]\s*(.*)$/i);
            setReasonCategory(reasonMatch?.[1]?.toUpperCase() ?? "");
            setReason(reasonMatch?.[2] ?? draftReason);

            if (draft.latitude !== null && draft.longitude !== null) {
              setGeo({
                latitude: Number(draft.latitude),
                longitude: Number(draft.longitude),
                accuracy: Number(draft.location_accuracy_meters ?? 0),
              });
            }
          }

          setLoadingDraft(false);
        }
      } catch {}
    })();

    return () => window.removeEventListener("submission-version",onVersion);
  },[]);

  const salesman = useMemo(() => buildSalesmanCode(p1,p2,p3),[p1,p2,p3]);
  const storeCode = useMemo(() => buildStoreCode(storeP1,storeP2,storeP3),[storeP1,storeP2,storeP3]);
  const selectedStockpoint = useMemo(() => stockpoints.find((item:any) => item.id === stockpointId) ?? null,[stockpoints,stockpointId]);
  const selectedSalesman = useMemo(() => salesmen.find((item:any)=>String(item.suffix).toUpperCase()===p3.toUpperCase()) ?? null,[salesmen,p3]);
  const detailsLocked = !stockpointId || !!submission;


  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      if(!stockpointId){ setSalesmen([]); return; }
      const s=getSupabaseClient();
      const {data}=await s.from("salesmen").select("id,stockpoint_id,suffix,full_code,name").eq("stockpoint_id",stockpointId).eq("is_active",true).order("name");
      if(!cancelled) setSalesmen(data??[]);
    })();
    return()=>{cancelled=true;};
  },[stockpointId]);

  async function loadSalesmanLookup(spId:string){
    if(!spId){ setLookupRows([]); return; }
    setLookupLoading(true);
    try{
      const s=getSupabaseClient();
      const {data,error}=await s.from("salesmen").select("id,stockpoint_id,suffix,full_code,name").eq("stockpoint_id",spId).eq("is_active",true).order("name");
      if(error) throw error;
      setLookupRows(data??[]);
    } catch { setLookupRows([]); }
    finally{ setLookupLoading(false); }
  }

  function openSalesmanLookup(){
    if (!stockpointId) return notify("warning","Pilih Stockpoint","Pilih Stockpoint terlebih dahulu sebelum membuka data Salesman.");
    const initial=stockpointId;
    setLookupStockpoint(initial);
    setLookupSearch("");
    setShowSalesmanLookup(true);
    void loadSalesmanLookup(initial);
  }

  function useSalesmanSuffix(suffix:string){
    if (detailsLocked) return;
    const digits=String(suffix??"").replace(/^S/i,"").replace(/\D/g,"").slice(0,5);
    setP3(`S${digits}`);
    setShowSalesmanLookup(false);
    notify("success","ID Salesman digunakan",`ID ${digits} sudah dimasukkan ke form.`);
  }

  function selectStockpoint(value:string) {
    setStockpointId(value);
    
    if (submission) return;
    const selected = stockpoints.find((item:any)=>item.id === value);
    const [first = "", second = ""] = String(selected?.code ?? "").split("/");
    setStoreP1(first);
    setStoreP2(second);
    setP1(first);
    setP2(second);
    setP3(value ? "S" : "");
    setGeoLocked(false);
  }

  function changeSalesmanSuffix(value:string) {
    const digits = value.replace(/\D/g, "").slice(0,5);
    setP3(`S${digits}`);
  }


  function changeChiller(value:string) {
    if (!value) { setHasChiller(null); setBrandable(null); setReasonCategory(""); setReason(""); return; }
    const exists = value === "yes";
    setHasChiller(exists);
    if (!exists) {
      setBrandable(false);
      setReasonCategory("");
      setReason("Tidak ada chiller");
    } else if (reason === "Tidak ada chiller") {
      setBrandable(null);
      setReasonCategory("");
      setReason("");
    }
  }

  function changeBrandingStatus(value:string) {
    if (!value) { setBrandable(null); setReasonCategory(""); setReason(""); return; }
    const next = value === "brandable";
    setBrandable(next);
    if (next) { setReasonCategory(""); setReason(""); }
  }


  async function saveDraft() {
    if (!stockpointId) return notify("error","Periksa kembali","Pilih Stockpoint.");
    if (!storeType) return notify("error","Periksa kembali","Pilih Jenis Store.");
    if (hasChiller === null) return notify("error","Periksa kembali","Pilih kondisi Chiller.");
    if (brandable === null) return notify("error","Periksa kembali","Pilih Status Branding.");
    if (!/^S\d{1,5}$/.test(p3)) return notify("error","ID Salesman belum lengkap","Isi 1–5 angka setelah huruf S.");
    if (!selectedSalesman) return notify("error","Salesman belum terdaftar","Pilih salesman dari autocomplete atau tambahkan nama salesman terlebih dahulu.");
    if (!/^\d{2,6}$/.test(storeP3)) return notify("error","Kode Toko belum valid","Bagian terakhir Kode Toko wajib 2–6 digit angka.");
    if (!geo) return notify("error","Lokasi wajib diambil","Ambil titik lokasi terlebih dahulu sebelum menyimpan draft.");
    if (!geoLocked) return notify("error","Kunci lokasi terlebih dahulu","Pastikan titik sudah sesuai lalu tekan Kunci Lokasi sebelum menyimpan draft.");
    if (brandable === false && hasChiller !== false && !reasonCategory) return notify("error","Periksa kembali","Pilih kategori alasan Tidak Dibranding.");
    if (brandable === false && !reason.trim()) return notify("error","Periksa kembali","Alasan tidak dibranding wajib diisi.");

    if (!/^08\d{8,11}$/.test(phone)) {
      notify("error","Nomor HP tidak valid","Nomor HP wajib diawali 08, minimal 10 digit, dan maksimal 13 digit.");
      return;
    }

    if (address.trim().length < 20) {
      notify("error","Alamat terlalu pendek","Alamat lengkap toko minimal 20 karakter.");
      return;
    }

    setBusy(true);
    try {
      const s = getSupabaseClient();
      const { data,error } = await s.rpc("create_submission_draft",{
        p_stockpoint_id:stockpointId,
        p_salesman_part_1:p1,
        p_salesman_part_2:p2,
        p_salesman_part_3:p3.toUpperCase(),
        p_salesman_code:salesman,
        p_store_code:storeCode,
        p_store_name:uppercaseValue(storeName),
        p_owner_name:uppercaseValue(ownerName),
        p_owner_phone:phone,
        p_store_address:address,
        p_latitude:geo?.latitude ?? null,
        p_longitude:geo?.longitude ?? null,
        p_location_accuracy_meters:geo?.accuracy ?? null,
        p_google_maps_url:null,
        p_store_type:storeType,
        p_has_chiller:hasChiller === true,
        p_branding_status:brandable ? "brandable" : "not_brandable",
        p_not_brandable_reason:brandable ? null : (hasChiller === false ? reason : `[${reasonCategory}] ${reason.trim()}`),
      });

      if (error) throw error;
      setSubmission(data);
    } catch(e:any) {
      notify("error","Periksa kembali",
        e?.message === "duplicate_submission_detected"
          ? "Data terindikasi duplikat (minimal 3 dari 4 field sama)."
          : e?.message || "Gagal menyimpan draft."
      );
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!submission) return;
    if (brandable === true && !photosComplete) return notify("error","Periksa kembali","Foto wajib belum lengkap.");

    setBusy(true);
    try {
      const s = getSupabaseClient();
      const { error } = await s.rpc("submit_submission",{
        p_submission_id:submission.id,
        p_expected_version:submission.version,
      });

      if (error) throw error;

      const { data:{ user } } = await s.auth.getUser();
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
      let totalToday = 1;
      if (user) {
        const { count } = await s
          .from("submissions")
          .select("id",{ count:"exact", head:true })
          .eq("pic_user_id",user.id)
          .eq("workflow_status","done")
          .gte("submitted_at",start.toISOString())
          .lt("submitted_at",end.toISOString())
          .is("deleted_at",null);
        totalToday = Math.max(1, count ?? 0);
      }
      setSubmitSuccess({ count:totalToday });
    } catch(e:any) {
      notify("error","Periksa kembali",e?.message || "Submit gagal.");
    } finally {
      setBusy(false);
    }
  }

  if (loadingDraft) {
    return (
      <div className="brand-card rounded-2xl p-6 text-sm text-slate-500">
        Membuka draft pekerjaan...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {submission && (
        <div className="rounded-2xl border border-[var(--role-border)] bg-[var(--role-pale)] px-5 py-4">
          <p className="font-semibold text-[#0B1D3A]">Melanjutkan draft: {submission.store_name}</p>
          <p className="mt-1 text-xs text-slate-500">Data utama draft dikunci. Lanjutkan foto yang belum lengkap lalu Submit & Selesaikan.</p>
        </div>
      )}

      <section className="brand-card rounded-2xl p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-[var(--role-pale)] p-2.5 text-[var(--role-accent)]"><Store size={19}/></span>
          <div>
            <h3 className="font-semibold text-[#0B1D3A]">Input Branding Toko Chiller</h3>
            <p className="mt-0.5 text-xs text-slate-400">Lengkapi data sesuai urutan. Setelah draft tersimpan, lanjutkan upload foto pada bagian yang sama.</p>
          </div>
        </div>

        <div className="mt-5 space-y-5">
          <label className="block min-w-0 text-sm font-semibold text-slate-600">
            Stockpoint
            <select value={stockpointId} onChange={e=>selectStockpoint(e.target.value)} disabled={!!submission} className={inputClass}>
              <option value="">Pilih Stockpoint</option>
              {stockpoints.map(s=><option key={s.id} value={s.id}>{String(s.name??"").replace(/^SP\s+/i,"")} - {s.code}</option>)}
            </select>
          </label>

          {!stockpointId && !submission && (
            <div className="rounded-xl border border-[var(--role-border)] bg-[var(--role-pale)] px-4 py-3 text-xs font-medium text-slate-600">
              Pilih Stockpoint terlebih dahulu. Kolom lainnya akan aktif setelah Stockpoint dipilih.
            </div>
          )}

          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-600">ID Salesman</p>
            <div className="mt-2 grid min-w-0 grid-cols-[minmax(0,1fr)_18px_minmax(0,1fr)_18px_minmax(0,1fr)] items-start gap-2">
              <CodeField value={p1} onChange={setP1} placeholder="5219" helper="" disabled={true} maxLength={4}/>
              <span className="pt-3 text-center font-bold text-[#0B1D3A]">/</span>
              <CodeField value={p2} onChange={setP2} placeholder="129" helper="" disabled={true} maxLength={3}/>
              <span className="pt-3 text-center font-bold text-[#0B1D3A]">/</span>
              <div className="min-w-0">
                <div className="flex min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:border-[var(--role-accent)] focus-within:ring-4 focus-within:ring-[var(--role-border)]">
                  <span className={`flex items-center border-r border-slate-200 px-3 text-sm font-bold ${detailsLocked ? "bg-slate-50 text-slate-400" : "bg-[var(--role-pale)] text-[var(--role-accent)]"}`}>S</span>
                  <input value={p3.replace(/^S/, "")} onChange={e=>changeSalesmanSuffix(e.target.value)} placeholder="12345" disabled={detailsLocked} inputMode="numeric" className="w-full min-w-0 border-0 bg-transparent px-3 py-3 text-sm outline-none disabled:bg-slate-50 disabled:text-slate-400"/>
                </div>
                
              </div>
            </div>
            <div className="mt-2 rounded-lg bg-[var(--role-pale)] px-3 py-2 text-xs font-semibold text-[var(--role-accent)]">Preview: {stockpointId ? (salesman || "//") : "Pilih Stockpoint terlebih dahulu"}</div>
            {stockpointId && !submission && (
              <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex items-start gap-2">
                  <UserRound size={16} className="mt-0.5 text-[var(--role-accent)]"/>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-600">
                      {selectedSalesman ? `Nama Salesman: ${selectedSalesman.name}` : p3 ? "ID Salesman belum ditemukan pada Stockpoint ini." : "Masukkan ID Salesman."}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Lupa kode salesman? <button type="button" onClick={openSalesmanLookup} className="font-semibold text-[var(--role-accent)] underline underline-offset-2">Cek di sini</button>.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-600">Kode Toko</p>
            <div className="mt-2 grid min-w-0 grid-cols-[minmax(0,1fr)_18px_minmax(0,1fr)_18px_minmax(0,1fr)] items-start gap-2">
              <CodeField value={storeP1} onChange={setStoreP1} placeholder="5219" helper="" disabled={true} maxLength={4}/>
              <span className="pt-3 text-center font-bold text-[#0B1D3A]">/</span>
              <CodeField value={storeP2} onChange={setStoreP2} placeholder="129" helper="" disabled={true} maxLength={3}/>
              <span className="pt-3 text-center font-bold text-[#0B1D3A]">/</span>
              <CodeField value={storeP3} onChange={setStoreP3} placeholder="123456" helper="" disabled={detailsLocked} maxLength={6}/>
            </div>
            <div className="mt-2 rounded-lg bg-[var(--role-pale)] px-3 py-2 text-xs font-semibold text-[var(--role-accent)]">Preview: {stockpointId ? (storeCode || "//") : "Pilih Stockpoint terlebih dahulu"}</div>
          </div>

          <div className="grid items-start gap-x-6 gap-y-5 lg:grid-cols-2">
            <label className="min-w-0 text-sm font-semibold text-slate-600">
              Nama Toko
              <span className="mt-1 block min-h-[16px] text-[11px] font-normal leading-4 text-slate-400">Input dengan nama toko yang terupdate.</span>
              <input value={storeName} onChange={e=>setStoreName(uppercaseValue(e.target.value))} placeholder="NAMA TOKO" disabled={detailsLocked} className={inputClass}/>
            </label>

            <label className="min-w-0 text-sm font-semibold text-slate-600">
              Nama Pemilik
              <span className="mt-1 block min-h-[16px] text-[11px] font-normal leading-4 text-slate-400">Tanpa panggilan Bapak/Ibu/Mas/Mbak/Kak.</span>
              <input value={ownerName} onChange={e=>setOwnerName(uppercaseValue(e.target.value))} placeholder="NAMA PEMILIK TOKO" disabled={detailsLocked} className={inputClass}/>
            </label>

            <label className="min-w-0 text-sm font-semibold text-slate-600 lg:col-span-2">
              No HP / WA Aktif
              <span className="mt-1 block min-h-[16px] text-[11px] font-normal leading-4 text-slate-400">Wajib diawali 08 · minimal 10 digit · maksimal 13 digit.</span>
              <input value={phone} onChange={e=>setPhone(e.target.value.replace(/\D/g,"").slice(0,13))} inputMode="numeric" minLength={10} maxLength={13} pattern="08[0-9]{8,11}" placeholder="Contoh: 081234567890" disabled={detailsLocked} className={inputClass}/>
            </label>
          </div>

          <label className="block min-w-0 text-sm font-semibold text-slate-600">
            Alamat Lengkap Toko
            <span className="mt-1 block min-h-[16px] text-[11px] font-normal leading-4 text-slate-400">Isi berikut kelurahan dan kecamatan dengan minimal 20 karakter.</span>
            <textarea value={address} onChange={e=>setAddress(e.target.value)} minLength={20} placeholder="Alamat lengkap toko" disabled={detailsLocked} className={inputClass} rows={3}/>
          </label>

          <div>
            <div className="mb-2 flex items-center gap-2">
              <MapPinned size={17} className="text-[var(--role-accent)]"/>
              <p className="text-sm font-semibold text-slate-600">Titik GPS</p>
            </div>
            <GeoLocationPicker value={geo} disabled={detailsLocked} onChange={(next)=>{setGeo(next); if(!next)setGeoLocked(false);}} onLockedChange={setGeoLocked}/>
          </div>

          <div className="grid items-start gap-x-6 gap-y-5 lg:grid-cols-2">
            <label className="min-w-0 text-sm font-semibold text-slate-600">
              Jenis Store
              <select value={storeType} onChange={e=>setStoreType(e.target.value)} disabled={detailsLocked} className={inputClass}>
                <option value="">PILIH JENIS STORE</option><option value="warung">WARUNG</option><option value="grosir">GROSIR</option>
              </select>
            </label>

            <label className="min-w-0 text-sm font-semibold text-slate-600">
              Chiller
              <select value={hasChiller===null?"":hasChiller?"yes":"no"} onChange={e=>changeChiller(e.target.value)} disabled={detailsLocked} className={inputClass}>
                <option value="">PILIH CHILLER</option><option value="yes">ADA</option><option value="no">TIDAK ADA</option>
              </select>
            </label>
          </div>

          <label className="block min-w-0 text-sm font-semibold text-slate-600">
            Status Branding
            <select value={brandable===null?"":brandable?"brandable":"not_brandable"} onChange={e=>changeBrandingStatus(e.target.value)} disabled={detailsLocked || hasChiller === false} className={inputClass}>
              <option value="">PILIH STATUS BRANDING</option>
              <option value="brandable">DIBRANDING</option>
              <option value="not_brandable">TIDAK DIBRANDING</option>
            </select>
          </label>

          {brandable === false && (
            <div className="space-y-4">
              {hasChiller !== false && (
                <label className="block min-w-0 text-sm font-semibold text-slate-600">
                  Kategori Alasan Tidak Dibranding
                  <select value={reasonCategory} onChange={e=>setReasonCategory(e.target.value)} disabled={detailsLocked} className={inputClass}>
                    <option value="">PILIH KATEGORI ALASAN</option>
                    <option value="TUTUP PERMANEN">TUTUP PERMANEN</option>
                    <option value="PINDAH LOKASI">PINDAH LOKASI</option>
                    <option value="PERBAIKAN">PERBAIKAN</option>
                  </select>
                </label>
              )}
              <label className="block min-w-0 text-sm font-semibold text-slate-600">
                Alasan
                {hasChiller === false ? (
                  <div className="mt-2 rounded-xl bg-[var(--role-pale)] px-4 py-3 text-sm font-normal text-slate-600">Tidak ada chiller</div>
                ) : (
                  <textarea value={reason} onChange={e=>setReason(e.target.value)} disabled={detailsLocked} placeholder="Jelaskan alasan tidak dibranding" className={inputClass} rows={3}/>
                )}
              </label>
            </div>
          )}

          <div className="border-t border-slate-100 pt-5">
            <div className="mb-4 flex items-center gap-3">
              <CheckCircle2 size={20} className="text-emerald-500"/>
              <div>
                <h3 className="font-semibold text-[#0B1D3A]">Dokumentasi Foto</h3>
                <p className="text-xs text-slate-400">Foto otomatis diperkecil dan diberi watermark sebelum upload untuk dokumentasi lapangan.</p>
              </div>
            </div>
            {!submission ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">Simpan draft terlebih dahulu untuk mengaktifkan upload foto.</div>
            ) : brandable === true ? (
              <PhotoUploader
                submissionId={submission.id}
                hasChiller={hasChiller === true}
                watermarkMeta={{
                  latitude: geo?.latitude ?? null,
                  longitude: geo?.longitude ?? null,
                  picCode,
                  picName,
                  stockpointCode: selectedStockpoint?.code ?? "",
                  stockpointName: selectedStockpoint?.name ?? "",
                }}
                onComplete={setPhotosComplete}
              />
            ) : (
              <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Branding Toko Chiller berstatus Tidak Dibranding. Tidak ada foto yang wajib diupload.</p>
            )}
          </div>
        </div>
      </section>

      {!submission ? (
        <button disabled={busy} onClick={saveDraft} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--role-accent)] px-5 py-4 font-semibold text-white disabled:opacity-50">
          <Save size={18}/>Simpan Draft & Lanjut Upload
        </button>
      ) : (
        <button disabled={busy || (brandable === true && !photosComplete)} onClick={submit} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0B1D3A] px-5 py-4 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">
          <Send size={18}/>Submit & Selesaikan
        </button>
      )}

      {showSalesmanLookup && (
        <div className="fixed inset-0 z-[145] flex items-center justify-center bg-[#0B1D3A]/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
              <div><h3 className="text-lg font-bold text-[#0B1D3A]">Cek ID Salesman</h3><p className="mt-1 text-xs text-slate-500">Stockpoint mengikuti pilihan pada form. Cari nama / ID lalu gunakan ID yang diperlukan.</p></div>
              <button type="button" onClick={()=>setShowSalesmanLookup(false)} className="rounded-xl border border-slate-200 p-2 text-slate-500"><X size={18}/></button>
            </div>
            <div className="grid gap-3 p-5 sm:grid-cols-[1fr_1.2fr]">
              <select value={lookupStockpoint} disabled className={`${inputClass} cursor-not-allowed bg-slate-50`}>
                <option value="">Pilih Stockpoint pada form</option>
                {stockpoints.map((sp:any)=><option key={sp.id} value={sp.id}>{String(sp.name??"").replace(/^SP\s+/i,"")} - {sp.code}</option>)}
              </select>
              <label className="relative block">
                <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                <input value={lookupSearch} onChange={e=>setLookupSearch(e.target.value)} placeholder="Cari ID / nama salesman..." className={`${inputClass} mt-0 pl-10`}/>
              </label>
            </div>
            <div className="max-h-[52vh] overflow-y-auto border-t border-slate-100">
              {lookupLoading ? <div className="p-8 text-center text-sm text-slate-400">Memuat data salesman...</div> : lookupRows.filter((r:any)=>{const q=lookupSearch.trim().toLowerCase();return !q||`${r.full_code??""} ${r.suffix??""} ${r.name??""}`.toLowerCase().includes(q);}).map((r:any)=><div key={r.id} className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0"><p className="font-semibold text-[#0B1D3A]">{r.name}</p><p className="mt-1 break-all text-sm font-bold text-[var(--role-accent)]">{r.full_code}</p></div>
                <button type="button" onClick={()=>useSalesmanSuffix(r.suffix)} disabled={detailsLocked} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#0B1D3A] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"><CheckCircle2 size={15}/>Gunakan ID</button>
              </div>)}
              {!lookupLoading && lookupRows.length===0 && <div className="p-8 text-center text-sm text-slate-400">Belum ada data salesman pada Stockpoint ini.</div>}
            </div>
          </div>
        </div>
      )}

      {submitSuccess && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-[#0B1D3A]/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-2xl font-bold text-emerald-600">✓</div>
            <h3 className="mt-4 text-xl font-bold text-[#0B1D3A]">Pekerjaan Selesai</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">Terima kasih sudah menyelesaikan pekerjaan, Kak <span className="font-semibold text-[#0B1D3A]">{picName || "PIC"}</span>.</p>
            <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Total input hari ini</p>
              <p className="mt-1 text-3xl font-bold text-emerald-700">{submitSuccess.count}</p>
              <p className="mt-1 text-xs text-emerald-700/70">Periode 00.00 – 23.59</p>
            </div>
            <button type="button" onClick={()=>{ window.location.href="/app/my-work?status=done"; }} className="mt-5 w-full rounded-xl bg-[#0B1D3A] px-4 py-3 text-sm font-semibold text-white">Lihat Pekerjaan Selesai</button>
          </div>
        </div>
      )}
    </div>
  );
}
