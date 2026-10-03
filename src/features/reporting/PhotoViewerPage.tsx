import { ArrowLeft, ChevronLeft, ChevronRight, Image as ImageIcon, X, ZoomIn } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "../../lib/supabase/client";

const labels: Record<string,string> = {
  store_before: "Foto Toko Before", chiller_before: "Foto Chiller Before", chiller_after: "Foto Chiller After",
  wobbler_after: "Foto Wobbler", poster_after: "Foto Poster", spanduk_after: "Foto Spanduk",
};

export default function PhotoViewerPage(){
  const [photos,setPhotos]=useState<any[]>([]);
  const [urls,setUrls]=useState<Record<string,string>>({});
  const [storeName,setStoreName]=useState("Dokumentasi Foto");
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const submission=typeof window!=="undefined"?new URLSearchParams(window.location.search).get("submission"):null;

  useEffect(()=>{
    let active=true; const created:string[]=[];
    (async()=>{
      if(!submission) return;
      try{
        const s=getSupabaseClient();
        const [{data:photoRows},{data:submissionRow},{data:{session}}]=await Promise.all([
          s.from("submission_photos").select("id,photo_type,file_name").eq("submission_id",submission).eq("is_active",true).order("uploaded_at"),
          s.from("submissions").select("store_name").eq("id",submission).single(),
          s.auth.getSession(),
        ]);
        if(!active) return;
        setPhotos(photoRows??[]); setStoreName(submissionRow?.store_name || "Dokumentasi Foto");
        const next:Record<string,string>={};
        for(const photo of photoRows??[]){
          const res=await fetch(`${import.meta.env.PUBLIC_SUPABASE_URL}/functions/v1/photo-view?photo_id=${photo.id}`,{headers:{Authorization:`Bearer ${session?.access_token}`}});
          if(res.ok){const url=URL.createObjectURL(await res.blob());created.push(url);next[photo.id]=url;}
        }
        if(active)setUrls(next);
      }catch(error){console.error("photo_view_failed",error);}
    })();
    return()=>{active=false;created.forEach(URL.revokeObjectURL)};
  },[submission]);

  const selectedIndex = useMemo(()=>selectedId ? photos.findIndex(photo=>photo.id===selectedId) : -1,[photos,selectedId]);
  const selected = selectedIndex >= 0 ? photos[selectedIndex] : null;

  function previous(){
    if(!photos.length) return;
    const nextIndex = selectedIndex <= 0 ? photos.length - 1 : selectedIndex - 1;
    setSelectedId(photos[nextIndex].id);
  }

  function next(){
    if(!photos.length) return;
    const nextIndex = selectedIndex >= photos.length - 1 ? 0 : selectedIndex + 1;
    setSelectedId(photos[nextIndex].id);
  }

  useEffect(()=>{
    if(!selectedId) return;
    const onKey=(event:KeyboardEvent)=>{
      if(event.key==="Escape") setSelectedId(null);
      if(event.key==="ArrowLeft") previous();
      if(event.key==="ArrowRight") next();
    };
    window.addEventListener("keydown",onKey);
    return()=>window.removeEventListener("keydown",onKey);
  },[selectedId,selectedIndex,photos]);

  return <section>
    <button type="button" onClick={()=>window.history.back()} className="mb-5 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-[var(--role-border)] hover:text-[var(--role-accent)]">
      <ArrowLeft size={17}/>Kembali
    </button>

    <h2 className="text-2xl font-bold text-[#0B1D3A]">{storeName}</h2>
    <p className="mt-1 text-sm text-slate-500">Dokumentasi foto pekerjaan. Klik foto untuk memperbesar.</p>

    <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {photos.map(photo=><button type="button" onClick={()=>urls[photo.id]&&setSelectedId(photo.id)} key={photo.id} className="brand-card group overflow-hidden rounded-2xl text-left">
        <div className="relative flex aspect-[4/3] items-center justify-center bg-slate-50">
          {urls[photo.id]?<img className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.02]" src={urls[photo.id]} alt={labels[photo.photo_type]}/>:<span className="text-sm text-slate-400">Memuat...</span>}
          {urls[photo.id]&&<span className="absolute right-3 top-3 rounded-full bg-black/60 p-2 text-white opacity-0 transition group-hover:opacity-100"><ZoomIn size={16}/></span>}
        </div>
        <div className="p-4"><p className="font-semibold text-[#0B1D3A]">{labels[photo.photo_type]??photo.photo_type}</p><p className="mt-1 truncate text-xs text-slate-400">{photo.file_name}</p></div>
      </button>)}
      {!photos.length&&<div className="brand-card rounded-2xl p-10 text-center text-slate-400"><ImageIcon className="mx-auto mb-3"/>Belum ada foto.</div>}
    </div>

    {selected&&urls[selected.id]&&<div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 p-3 backdrop-blur-sm sm:p-6" onClick={()=>setSelectedId(null)}>
      <div className="relative flex max-h-[95vh] w-full max-w-6xl flex-col" onClick={e=>e.stopPropagation()}>
        <div className="relative flex min-h-0 flex-1 items-center justify-center">
          <button type="button" onClick={previous} className="absolute left-2 z-20 rounded-full bg-black/65 p-3 text-white transition hover:bg-black/85 sm:left-4" aria-label="Foto sebelumnya"><ChevronLeft size={26}/></button>
          <button type="button" onClick={()=>setSelectedId(null)} className="absolute right-3 top-3 z-20 rounded-full bg-black/65 p-2.5 text-white" aria-label="Tutup"><X size={20}/></button>
          <button type="button" onClick={next} className="absolute right-2 z-20 rounded-full bg-black/65 p-3 text-white transition hover:bg-black/85 sm:right-4" aria-label="Foto berikutnya"><ChevronRight size={26}/></button>
          <img src={urls[selected.id]} alt={labels[selected.photo_type]} className="max-h-[72vh] w-full rounded-2xl bg-black object-contain"/>
        </div>

        <div className="mt-3 rounded-2xl bg-white p-3 shadow-xl sm:p-4">
          <div className="flex items-start justify-between gap-4">
            <div><p className="font-semibold text-[#0B1D3A]">{labels[selected.photo_type]??selected.photo_type}</p><p className="mt-1 text-xs text-slate-500">{selected.file_name}</p></div>
            <span className="shrink-0 text-xs font-semibold text-slate-400">{selectedIndex+1} / {photos.length}</span>
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {photos.map((photo,index)=><button key={photo.id} type="button" onClick={()=>setSelectedId(photo.id)} className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition ${photo.id===selected.id?"border-[var(--role-accent)]":"border-transparent opacity-65 hover:opacity-100"}`} aria-label={`Buka foto ${index+1}`}>
              {urls[photo.id]?<img src={urls[photo.id]} alt="" className="h-full w-full object-cover"/>:<span className="flex h-full items-center justify-center bg-slate-100 text-[10px] text-slate-400">...</span>}
            </button>)}
          </div>
        </div>
      </div>
    </div>}
  </section>;
}
