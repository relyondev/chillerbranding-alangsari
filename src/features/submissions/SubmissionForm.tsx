import { notify } from "../../components/ui/ToastHost";
import { CheckCircle2, LocateFixed, Save, Send, Store, MapPinned, ExternalLink, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "../../lib/supabase/client";
import { buildSalesmanCode, buildStoreCode } from "../../lib/validation/codes";
import PhotoUploader from "./PhotoUploader";

type Geo = { latitude:number; longitude:number; accuracy:number } | null;

const inputClass =
  "mt-2 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#0B1D3A] outline-none transition placeholder:text-slate-400 focus:border-[#1565EF] focus:ring-4 focus:ring-[#BEE6FF]/45 disabled:bg-slate-50 disabled:text-slate-400";

function isGoogleMapsUrl(value:string) {
  try {
    const url = new URL(value.trim());
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const isGoogleHost = host === "google.com" || host.includes(".google.") || host.startsWith("google.");
    const isMapsGoogleHost = host.startsWith("maps.google.");
    const isShortMapsHost = host === "maps.app.goo.gl" || host === "goo.gl";
    return (
      (isGoogleHost && (url.pathname.includes("/maps") || isMapsGoogleHost)) ||
      (isShortMapsHost && (host === "maps.app.goo.gl" || url.pathname.startsWith("/maps")))
    );
  } catch {
    return false;
  }
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
        className="w-full min-w-0 rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none transition focus:border-[#1565EF] focus:ring-4 focus:ring-[#BEE6FF]/35 disabled:bg-slate-50 disabled:text-slate-400"
      />
      <span className="mt-1.5 block min-h-[16px] text-[11px] leading-4 text-slate-400">{helper}</span>
    </div>
  );
}

export default function SubmissionForm() {
  const [stockpoints,setStockpoints] = useState<any[]>([]);
  const [stockpointId,setStockpointId] = useState("");
  const [p1,setP1] = useState("");
  const [p2,setP2] = useState("");
  const [p3,setP3] = useState("");
  const [storeP1,setStoreP1] = useState("");
  const [storeP2,setStoreP2] = useState("");
  const [storeP3,setStoreP3] = useState("");
  const [storeName,setStoreName] = useState("");
  const [ownerName,setOwnerName] = useState("");
  const [phone,setPhone] = useState("");
  const [address,setAddress] = useState("");
  const [storeType,setStoreType] = useState("warung");
  const [hasChiller,setHasChiller] = useState(true);
  const [brandable,setBrandable] = useState(true);
  const [reason,setReason] = useState("");
  const [geo,setGeo] = useState<Geo>(null);
  const [geoAttempts,setGeoAttempts] = useState(0);
  const [geoError,setGeoError] = useState("");
  const [locating,setLocating] = useState(false);
  const [manualMapsUrl,setManualMapsUrl] = useState("");
  const [submission,setSubmission] = useState<any>(null);
  const [photosComplete,setPhotosComplete] = useState(false);
  const [busy,setBusy] = useState(false);
  const [loadingDraft,setLoadingDraft] = useState(false);

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

        const { data } = await s
          .from("pic_stockpoint_assignments")
          .select("stockpoint_id,stockpoints(id,code,name)")
          .eq("pic_user_id",user.id)
          .eq("is_active",true);

        setStockpoints((data ?? []).map((x:any)=>x.stockpoints).filter(Boolean));

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
            setStoreType(draft.store_type ?? "warung");
            setHasChiller(Boolean(draft.has_chiller));
            setBrandable(draft.branding_status === "brandable");
            setReason(draft.not_brandable_reason ?? "");

            if (draft.latitude !== null && draft.longitude !== null) {
              setGeo({
                latitude: Number(draft.latitude),
                longitude: Number(draft.longitude),
                accuracy: Number(draft.location_accuracy_meters ?? 0),
              });
            } else if (draft.google_maps_url) {
              setManualMapsUrl(draft.google_maps_url);
              setGeoAttempts(3);
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
  const manualMapsValid = manualMapsUrl.trim() ? isGoogleMapsUrl(manualMapsUrl) : false;
  const manualAllowed = geoAttempts >= 3 && !geo;

  function locate() {
    if (submission || locating || geo) return;

    if (!navigator.geolocation) {
      setGeoAttempts(3);
      setGeoError("Browser ini tidak mendukung geolocation. Gunakan link Google Maps manual.");
      return;
    }

    setLocating(true);
    setGeoError("");

    navigator.geolocation.getCurrentPosition(
      p => {
        setGeo({
          latitude:p.coords.latitude,
          longitude:p.coords.longitude,
          accuracy:p.coords.accuracy,
        });
        setManualMapsUrl("");
        setGeoAttempts(0);
        setGeoError("");
        setLocating(false);
        notify("success","Lokasi ditemukan","Koordinat perangkat berhasil disimpan.");
      },
      e => {
        setGeoAttempts((old)=>Math.min(3, old + 1));
        setGeoError(e.message || "Browser gagal mengambil lokasi.");
        setLocating(false);
      },
      { enableHighAccuracy:true, timeout:15000, maximumAge:0 },
    );
  }

  async function saveDraft() {
    if (!stockpointId) return notify("error","Periksa kembali","Pilih Stockpoint.");
    if (!geo && !manualMapsValid) {
      return notify(
        "error",
        "Lokasi belum tersedia",
        manualAllowed
          ? "Masukkan link Google Maps yang valid atau coba geolocation lagi."
          : "Coba ambil lokasi perangkat terlebih dahulu."
      );
    }
    if (!brandable && !reason.trim()) return notify("error","Periksa kembali","Alasan toko tidak di branding wajib diisi.");

    if (!/^08\d{7,13}$/.test(phone)) {
      notify("error","Nomor HP tidak valid","Nomor HP wajib diawali 08 dan minimal 9 angka.");
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
        p_store_name:storeName,
        p_owner_name:ownerName,
        p_owner_phone:phone,
        p_store_address:address,
        p_latitude:geo?.latitude ?? null,
        p_longitude:geo?.longitude ?? null,
        p_location_accuracy_meters:geo?.accuracy ?? null,
        p_google_maps_url:geo ? null : manualMapsUrl.trim(),
        p_store_type:storeType,
        p_has_chiller:hasChiller,
        p_branding_status:brandable ? "brandable" : "not_brandable",
        p_not_brandable_reason:brandable ? null : reason,
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
    if (brandable && !photosComplete) return notify("error","Periksa kembali","Foto wajib belum lengkap.");

    setBusy(true);
    try {
      const s = getSupabaseClient();
      const { error } = await s.rpc("submit_submission",{
        p_submission_id:submission.id,
        p_expected_version:submission.version,
      });

      if (error) throw error;
      notify("success","Pekerjaan selesai","Data berhasil disubmit dan masuk ke Pekerjaan Selesai.");
      window.location.href="/app/my-work?status=done";
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
        <div className="rounded-2xl border border-[#BEE6FF] bg-[#F5F9FF] px-5 py-4">
          <p className="font-semibold text-[#0B1D3A]">Melanjutkan draft: {submission.store_name}</p>
          <p className="mt-1 text-xs text-slate-500">Data utama draft dikunci. Lanjutkan foto yang belum lengkap lalu Submit & Selesaikan.</p>
        </div>
      )}

      <section className="brand-card rounded-2xl p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-[#EEF6FF] p-2.5 text-[#1565EF]"><Store size={19}/></span>
          <div>
            <h3 className="font-semibold text-[#0B1D3A]">Data Toko</h3>
            <p className="mt-0.5 text-xs text-slate-400">Lengkapi identitas toko dan salesman.</p>
          </div>
        </div>

        <div className="mt-5 space-y-5">
          <label className="block min-w-0 text-sm font-semibold text-slate-600">
            Stockpoint
            <select value={stockpointId} onChange={e=>setStockpointId(e.target.value)} disabled={!!submission} className={inputClass}>
              <option value="">Pilih Stockpoint</option>
              {stockpoints.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>

          <div className="grid gap-5 xl:grid-cols-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-600">Kode Toko</p>
              <div className="mt-2 grid min-w-0 grid-cols-[minmax(0,1fr)_18px_minmax(0,1fr)_18px_minmax(0,1fr)] items-start gap-2">
                <CodeField value={storeP1} onChange={setStoreP1} placeholder="1234" helper="4 digit numeric" disabled={!!submission} maxLength={4}/>
                <span className="pt-3 text-center font-bold text-[#0B1D3A]">/</span>
                <CodeField value={storeP2} onChange={setStoreP2} placeholder="123" helper="3 digit numeric" disabled={!!submission} maxLength={3}/>
                <span className="pt-3 text-center font-bold text-[#0B1D3A]">/</span>
                <CodeField value={storeP3} onChange={setStoreP3} placeholder="1234" helper="3–4 digit numeric" disabled={!!submission} maxLength={4}/>
              </div>
              <div className="mt-2 rounded-lg bg-[#F5F9FF] px-3 py-2 text-xs font-semibold text-[#1565EF]">Preview: {storeCode || "//"}</div>
            </div>

            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-600">ID Salesman</p>
              <div className="mt-2 grid min-w-0 grid-cols-[minmax(0,1fr)_18px_minmax(0,1fr)_18px_minmax(0,1fr)] items-start gap-2">
                <CodeField value={p1} onChange={setP1} placeholder="1234" helper="4 digit numeric" disabled={!!submission} maxLength={4}/>
                <span className="pt-3 text-center font-bold text-[#0B1D3A]">/</span>
                <CodeField value={p2} onChange={setP2} placeholder="123" helper="3 digit numeric" disabled={!!submission} maxLength={3}/>
                <span className="pt-3 text-center font-bold text-[#0B1D3A]">/</span>
                <CodeField value={p3} onChange={setP3} placeholder="A123" helper="3–4 karakter, diawali huruf" disabled={!!submission} alphaNumeric maxLength={4}/>
              </div>
              <div className="mt-2 rounded-lg bg-[#F5F9FF] px-3 py-2 text-xs font-semibold text-[#1565EF]">Preview: {salesman || "//"}</div>
            </div>
          </div>

          <div className="grid items-start gap-x-6 gap-y-5 lg:grid-cols-2">
            <label className="min-w-0 text-sm font-semibold text-slate-600">
              Nama Toko
              <span className="mt-1 block min-h-[16px] text-[11px] font-normal leading-4 text-transparent">Keterangan</span>
              <input value={storeName} onChange={e=>setStoreName(e.target.value)} placeholder="Nama warung / toko" disabled={!!submission} className={inputClass}/>
            </label>

            <label className="min-w-0 text-sm font-semibold text-slate-600">
              Nama Pemilik
              <span className="mt-1 block min-h-[16px] text-[11px] font-normal leading-4 text-slate-400">Tidak menggunakan panggilan seperti Bapak/Ibu/Mas/Mbak/Kak.</span>
              <input value={ownerName} onChange={e=>setOwnerName(e.target.value)} placeholder="Nama pemilik toko" disabled={!!submission} className={inputClass}/>
            </label>

            <label className="min-w-0 text-sm font-semibold text-slate-600">
              Nomor HP / WA
              <span className="mt-1 block min-h-[16px] text-[11px] font-normal leading-4 text-slate-400">Wajib diawali 08 dan minimal 9 angka.</span>
              <input value={phone} onChange={e=>setPhone(e.target.value.replace(/\D/g,"").slice(0,15))} inputMode="numeric" minLength={9} pattern="08[0-9]{7,13}" placeholder="08xxxxxxxxxx" disabled={!!submission} className={inputClass}/>
            </label>

            <label className="min-w-0 text-sm font-semibold text-slate-600">
              Jenis Store
              <span className="mt-1 block min-h-[16px] text-[11px] font-normal leading-4 text-transparent">Keterangan</span>
              <select value={storeType} onChange={e=>setStoreType(e.target.value)} disabled={!!submission} className={inputClass}>
                <option value="warung">Warung</option><option value="grosir">Grosir</option>
              </select>
            </label>

            <label className="min-w-0 text-sm font-semibold text-slate-600">
              Chiller
              <span className="mt-1 block min-h-[16px] text-[11px] font-normal leading-4 text-transparent">Keterangan</span>
              <select value={hasChiller?"yes":"no"} onChange={e=>setHasChiller(e.target.value==="yes")} disabled={!!submission} className={inputClass}>
                <option value="yes">Ya</option><option value="no">Tidak</option>
              </select>
            </label>
          </div>

          <label className="block min-w-0 text-sm font-semibold text-slate-600">
            Alamat Lengkap Toko
            <span className="mt-1 block min-h-[16px] text-[11px] font-normal leading-4 text-slate-400">Minimal 20 karakter agar alamat cukup jelas.</span>
            <textarea value={address} onChange={e=>setAddress(e.target.value)} minLength={20} placeholder="Alamat lengkap toko" disabled={!!submission} className={inputClass} rows={3}/>
          </label>
        </div>
      </section>

      <section className="brand-card rounded-2xl p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-[#EEF6FF] p-2.5 text-[#1565EF]"><MapPinned size={19}/></span>
          <div>
            <h3 className="font-semibold text-[#0B1D3A]">Lokasi & Status Branding</h3>
            <p className="mt-0.5 text-xs text-slate-400">Gunakan lokasi perangkat. Jika gagal 3 kali, masukkan link Google Maps secara manual.</p>
          </div>
        </div>

        <div className="mt-5">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={locate}
              disabled={!!submission || locating || !!geo}
              className="inline-flex items-center gap-2 rounded-xl bg-[#1565EF] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {locating ? <RefreshCw size={17} className="animate-spin"/> : <LocateFixed size={17}/>}
              {locating ? "Mengambil Lokasi..." : geoAttempts > 0 ? `Coba Lagi (${geoAttempts}/3)` : "Ambil Lokasi Saat Ini"}
            </button>

            {geo && (
              <span className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">✓ {geo.latitude.toFixed(6)}, {geo.longitude.toFixed(6)} · ±{Math.round(geo.accuracy)} m</span>
            )}
          </div>

          {!geo && geoError && (
            <p className="mt-3 text-xs text-amber-700">Lokasi belum berhasil: {geoError} {geoAttempts < 3 ? `(${geoAttempts}/3 percobaan)` : ""}</p>
          )}

          {manualAllowed && (
            <div className="mt-4 rounded-2xl border border-dashed border-[#BEE6FF] bg-[#F8FBFF] p-4">
              <label className="block text-sm font-semibold text-slate-600">
                Link Google Maps Manual
                <span className="mt-1 block text-[11px] font-normal leading-4 text-slate-400">Buka Google Maps → pilih lokasi toko → Bagikan → Salin link. Contoh: https://maps.app.goo.gl/AbCdEf123</span>
                <input
                  value={manualMapsUrl}
                  onChange={(e)=>setManualMapsUrl(e.target.value)}
                  disabled={!!submission}
                  placeholder="https://maps.app.goo.gl/AbCdEf123"
                  className={`${inputClass} ${manualMapsUrl && !manualMapsValid ? "border-red-300 focus:border-red-400 focus:ring-red-100" : ""}`}
                />
              </label>
              {manualMapsUrl && !manualMapsValid && <p className="mt-2 text-xs text-red-500">Link belum dikenali sebagai link Google Maps.</p>}
              {manualMapsValid && <a href={manualMapsUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#1565EF]"><ExternalLink size={13}/>Cek link Google Maps</a>}
            </div>
          )}
        </div>

        <div className="mt-6">
          <p className="text-sm font-semibold text-slate-600">Bisa Dibranding?</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" disabled={!!submission} onClick={()=>setBrandable(true)} className={`rounded-xl px-4 py-3 text-sm font-semibold ${brandable ? "bg-[#1565EF] text-white" : "border border-slate-200 bg-white text-slate-600"}`}>Ya</button>
            <button type="button" disabled={!!submission} onClick={()=>setBrandable(false)} className={`rounded-xl px-4 py-3 text-sm font-semibold ${!brandable ? "bg-[#0B1D3A] text-white" : "border border-slate-200 bg-white text-slate-600"}`}>Tidak</button>
          </div>

          {!brandable && <textarea value={reason} onChange={e=>setReason(e.target.value)} disabled={!!submission} placeholder="Alasan toko tidak di branding" className={inputClass} rows={3}/>}        
        </div>
      </section>

      {!submission ? (
        <button disabled={busy} onClick={saveDraft} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1565EF] px-5 py-4 font-semibold text-white disabled:opacity-50">
          <Save size={18}/>Simpan Draft & Lanjut Upload
        </button>
      ) : (
        <>
          <section className="brand-card rounded-2xl p-5 sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <CheckCircle2 size={20} className="text-emerald-500"/>
              <div>
                <h3 className="font-semibold text-[#0B1D3A]">Dokumentasi Foto</h3>
                <p className="text-xs text-slate-400">Upload satu per satu. {brandable ? (hasChiller ? "6 foto wajib." : "4 foto wajib.") : "Tidak perlu foto."}</p>
              </div>
            </div>

            {brandable ? <PhotoUploader submissionId={submission.id} hasChiller={hasChiller} onComplete={setPhotosComplete}/> : <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Toko tidak bisa dibranding. Tidak ada foto yang wajib diupload.</p>}
          </section>

          <button disabled={busy || (brandable && !photosComplete)} onClick={submit} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0B1D3A] px-5 py-4 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">
            <Send size={18}/>Submit & Selesaikan
          </button>
        </>
      )}
    </div>
  );
}
