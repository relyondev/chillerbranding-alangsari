import { CheckCircle2, LocateFixed, LockKeyhole, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

type Geo = { latitude:number; longitude:number; accuracy:number };
type Props = {
  value:Geo|null;
  disabled?:boolean;
  onChange:(geo:Geo|null)=>void;
  onLockedChange?:(locked:boolean)=>void;
};

const MAX_INITIAL_ACCURACY_METERS = 50;
const MAX_ADJUSTMENT_METERS = 20;

const haversine=(a:Geo,b:{latitude:number;longitude:number})=>{
  const R=6371000,toRad=(v:number)=>v*Math.PI/180;
  const dLat=toRad(b.latitude-a.latitude),dLon=toRad(b.longitude-a.longitude);
  const x=Math.sin(dLat/2)**2+Math.cos(toRad(a.latitude))*Math.cos(toRad(b.latitude))*Math.sin(dLon/2)**2;
  return 2*R*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
};

export default function GeoLocationPicker({value,disabled=false,onChange,onLockedChange}:Props){
  const mapEl=useRef<HTMLDivElement|null>(null);
  const mapRef=useRef<any>(null);
  const markerRef=useRef<any>(null);
  const rawRef=useRef<Geo|null>(null);
  const lastValidRef=useRef<Geo|null>(null);
  const [locating,setLocating]=useState(false);
  const [error,setError]=useState("");
  const [adjustment,setAdjustment]=useState(0);
  const [locked,setLocked]=useState(Boolean(disabled && value));

  function setLockState(next:boolean){
    setLocked(next);
    onLockedChange?.(next);
  }

  async function renderMap(raw:Geo, final=raw){
    if(!mapEl.current)return;
    const L:any=await import("leaflet");
    if(!mapRef.current){
      mapRef.current=L.map(mapEl.current,{zoomControl:true,attributionControl:true}).setView([final.latitude,final.longitude],19);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{
        maxZoom:19,
        attribution:'&copy; OpenStreetMap contributors'
      }).addTo(mapRef.current);
    } else {
      mapRef.current.setView([final.latitude,final.longitude],19);
    }
    if(markerRef.current) markerRef.current.remove();
    const icon=L.divIcon({className:"",html:'<div style="width:24px;height:24px;border-radius:999px;background:#d71920;border:4px solid white;box-shadow:0 2px 10px rgba(0,0,0,.35)"></div>',iconSize:[24,24],iconAnchor:[12,12]});
    markerRef.current=L.marker([final.latitude,final.longitude],{draggable:!disabled&&!locked,icon}).addTo(mapRef.current);
    lastValidRef.current=final;

    markerRef.current.on("drag",(e:any)=>{
      if(locked) return;
      const p=e.target.getLatLng();
      const d=haversine(raw,{latitude:p.lat,longitude:p.lng});
      setAdjustment(d);
      e.target.setOpacity(d>MAX_ADJUSTMENT_METERS?.55:1);
    });

    markerRef.current.on("dragend",(e:any)=>{
      if(locked) return;
      const p=e.target.getLatLng();
      const d=haversine(raw,{latitude:p.lat,longitude:p.lng});
      if(d>MAX_ADJUSTMENT_METERS){
        const fallback=lastValidRef.current??raw;
        e.target.setLatLng([fallback.latitude,fallback.longitude]);
        setAdjustment(haversine(raw,fallback));
        setError("Titik tidak boleh digeser lebih dari 20 m. Silakan geser kembali, atau ambil ulang lokasi.");
        return;
      }
      const next={latitude:p.lat,longitude:p.lng,accuracy:raw.accuracy};
      lastValidRef.current=next;
      setError("");
      setAdjustment(d);
      onChange(next);
    });
    setTimeout(()=>mapRef.current?.invalidateSize(),50);
  }

  useEffect(()=>{
    if(value&&rawRef.current&&!mapRef.current) renderMap(rawRef.current,value);
  },[value]);

  useEffect(()=>()=>{resetMap();},[]);

  function resetMap(){
    if(markerRef.current){markerRef.current.remove();markerRef.current=null;}
    if(mapRef.current){mapRef.current.remove();mapRef.current=null;}
    rawRef.current=null;
    lastValidRef.current=null;
  }

  function locate(){
    if(disabled||locating)return;
    if(!navigator.geolocation){setError("Browser tidak mendukung GPS.");return;}
    resetMap();
    setLockState(false);
    setLocating(true);
    setError("");
    setAdjustment(0);
    onChange(null);
    let best:Geo|null=null;
    let watchId:number;
    const timer=window.setTimeout(()=>{
      navigator.geolocation.clearWatch(watchId);
      setLocating(false);
      setError(best
        ? "Akurasi maps rendah. Silakan cari tempat yang lebih baik (di luar gedung / ruangan) atau coba lagi."
        : "Lokasi belum berhasil ditemukan. Silakan coba lagi di area yang lebih terbuka."
      );
    },20000);

    watchId=navigator.geolocation.watchPosition(async p=>{
      const g={latitude:p.coords.latitude,longitude:p.coords.longitude,accuracy:p.coords.accuracy};
      if(!best||g.accuracy<best.accuracy) best=g;
      if(g.accuracy<=MAX_INITIAL_ACCURACY_METERS){
        window.clearTimeout(timer);
        navigator.geolocation.clearWatch(watchId);
        rawRef.current=g;
        lastValidRef.current=g;
        setLocating(false);
        setError("");
        onChange(g);
        await renderMap(g,g);
      }
    },()=>{
      window.clearTimeout(timer);
      navigator.geolocation.clearWatch(watchId);
      setLocating(false);
      setError("Lokasi belum berhasil ditemukan. Pastikan izin lokasi aktif lalu coba lagi.");
    },{enableHighAccuracy:true,maximumAge:0,timeout:20000});
  }

  function lockLocation(){
    if(!value||!rawRef.current) return;
    setLockState(true);
    setError("");
    if(markerRef.current) markerRef.current.dragging?.disable?.();
  }

  return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" disabled={disabled||locating} onClick={locate} className="inline-flex items-center gap-2 rounded-xl bg-[var(--role-accent)] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">
        {locating?<RefreshCw size={16} className="animate-spin"/>:<LocateFixed size={16}/>} {locating?"Mencari lokasi...":value?"Ambil Ulang Lokasi":"Ambil Lokasi"}
      </button>
      {!locating&&value&&!locked&&<span className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">Lokasi ditemukan</span>}
      {value&&!locked&&<span className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">Koreksi {adjustment.toFixed(1)} / 20 m</span>}
      {value&&locked&&<span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700"><CheckCircle2 size={14}/>Lokasi terkunci</span>}
    </div>

    {error&&<p className="mt-3 text-xs font-medium text-rose-600">{error}</p>}
    {value&&<>
      <div ref={mapEl} className="mt-4 h-72 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white"/>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-xs text-slate-500">{locked?"Lokasi sudah dikunci. Ambil ulang lokasi jika ingin mengubah titik.":"Geser pin bila perlu. Koreksi maksimal 20 meter dari titik awal."}</span>
        <div className="flex flex-wrap gap-2">
          {!locked&&!disabled&&<button type="button" onClick={lockLocation} className="inline-flex items-center gap-2 rounded-xl bg-[#0B1D3A] px-4 py-2.5 text-xs font-semibold text-white"><LockKeyhole size={15}/>Kunci Lokasi</button>}
          <a className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-[var(--role-accent)]" href={`https://www.google.com/maps?q=${value.latitude},${value.longitude}`} target="_blank" rel="noreferrer">Buka di Google Maps</a>
        </div>
      </div>
    </>}
  </div>;
}
