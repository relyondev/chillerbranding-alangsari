import { LocateFixed, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

type Geo = { latitude:number; longitude:number; accuracy:number };
type Props = { value:Geo|null; disabled?:boolean; onChange:(geo:Geo|null)=>void };
const haversine=(a:Geo,b:{latitude:number;longitude:number})=>{const R=6371000,toRad=(v:number)=>v*Math.PI/180;const dLat=toRad(b.latitude-a.latitude),dLon=toRad(b.longitude-a.longitude);const x=Math.sin(dLat/2)**2+Math.cos(toRad(a.latitude))*Math.cos(toRad(b.latitude))*Math.sin(dLon/2)**2;return 2*R*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));};
export default function GeoLocationPicker({value,disabled=false,onChange}:Props){
  const mapEl=useRef<HTMLDivElement|null>(null); const mapRef=useRef<any>(null); const markerRef=useRef<any>(null); const rawRef=useRef<Geo|null>(null);
  const [locating,setLocating]=useState(false); const [accuracy,setAccuracy]=useState<number|null>(value?.accuracy??null); const [error,setError]=useState(""); const [adjustment,setAdjustment]=useState(0);
  async function renderMap(raw:Geo, final=raw){
    if(!mapEl.current)return; const L:any=await import("leaflet");
    if(!mapRef.current){ mapRef.current=L.map(mapEl.current,{zoomControl:true,attributionControl:true}).setView([final.latitude,final.longitude],19); L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(mapRef.current); }
    else mapRef.current.setView([final.latitude,final.longitude],19);
    if(markerRef.current) markerRef.current.remove();
    const icon=L.divIcon({className:"",html:'<div style="width:24px;height:24px;border-radius:999px;background:#d71920;border:4px solid white;box-shadow:0 2px 10px rgba(0,0,0,.35)"></div>',iconSize:[24,24],iconAnchor:[12,12]});
    markerRef.current=L.marker([final.latitude,final.longitude],{draggable:!disabled,icon}).addTo(mapRef.current);
    markerRef.current.on("drag",(e:any)=>{const p=e.target.getLatLng(); const d=haversine(raw,{latitude:p.lat,longitude:p.lng}); setAdjustment(d); if(d>3)e.target.setOpacity(.55);else e.target.setOpacity(1);});
    markerRef.current.on("dragend",(e:any)=>{const p=e.target.getLatLng(); const d=haversine(raw,{latitude:p.lat,longitude:p.lng}); if(d>3){e.target.setLatLng([raw.latitude,raw.longitude]);setAdjustment(0);setError("Koreksi lokasi maksimal 3 meter dari titik GPS awal.");onChange(raw);}else{setError("");setAdjustment(d);onChange({latitude:p.lat,longitude:p.lng,accuracy:raw.accuracy});}});
    setTimeout(()=>mapRef.current?.invalidateSize(),50);
  }
  useEffect(()=>{if(value&&rawRef.current&&!mapRef.current)renderMap(rawRef.current,value);},[value]);
  useEffect(()=>()=>{mapRef.current?.remove();mapRef.current=null;},[]);
  function locate(){
    if(disabled||locating)return; if(!navigator.geolocation){setError("Browser tidak mendukung GPS.");return;}
    setLocating(true);setError("");setAdjustment(0);onChange(null); let best:Geo|null=null; let watchId:number; const timer=window.setTimeout(()=>{navigator.geolocation.clearWatch(watchId);setLocating(false);setError(best?`Akurasi terbaik ±${Math.round(best.accuracy)} m. Maksimal yang diterima ±5 m. Pindah ke area lebih terbuka lalu coba lagi.`:"Lokasi tidak berhasil didapat. Pindah ke area lebih terbuka lalu coba lagi.");},20000);
    watchId=navigator.geolocation.watchPosition(async p=>{const g={latitude:p.coords.latitude,longitude:p.coords.longitude,accuracy:p.coords.accuracy}; if(!best||g.accuracy<best.accuracy)best=g;setAccuracy(g.accuracy);if(g.accuracy<=5){window.clearTimeout(timer);navigator.geolocation.clearWatch(watchId);rawRef.current=g;setLocating(false);setError("");onChange(g);await renderMap(g,g);}},e=>{window.clearTimeout(timer);navigator.geolocation.clearWatch(watchId);setLocating(false);setError(e.message||"GPS gagal mengambil lokasi.");},{enableHighAccuracy:true,maximumAge:0,timeout:20000});
  }
  return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
    <div className="flex flex-wrap items-center gap-3"><button type="button" disabled={disabled||locating} onClick={locate} className="inline-flex items-center gap-2 rounded-xl bg-[var(--role-accent)] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{locating?<RefreshCw size={16} className="animate-spin"/>:<LocateFixed size={16}/>} {locating?"Mencari akurasi ≤5 m...":value?"Ambil Ulang Lokasi":"Ambil Lokasi"}</button>{accuracy!==null&&<span className={`rounded-xl px-3 py-2 text-xs font-semibold ${accuracy<=5?"bg-emerald-50 text-emerald-700":"bg-amber-50 text-amber-700"}`}>Akurasi ±{Math.round(accuracy)} m</span>}{value&&<span className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">Koreksi {adjustment.toFixed(1)} / 3 m</span>}</div>
    {locating&&<p className="mt-3 text-xs text-slate-500">Tetap berada di lokasi warung. Sistem menunggu GPS dengan akurasi maksimal ±5 meter.</p>}
    {error&&<p className="mt-3 text-xs font-medium text-rose-600">{error}</p>}
    {value&&<><div ref={mapEl} className="mt-4 h-72 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white"/><div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs"><span className="text-slate-500">Geser pin hanya untuk koreksi kecil, maksimal 3 meter.</span><a className="font-semibold text-[var(--role-accent)]" href={`https://www.google.com/maps?q=${value.latitude},${value.longitude}`} target="_blank" rel="noreferrer">Buka di Google Maps</a></div></>}
  </div>;
}
