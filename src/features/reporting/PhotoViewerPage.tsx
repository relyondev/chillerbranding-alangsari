import { Image as ImageIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { getSupabaseClient } from "../../lib/supabase/client";

const labels: Record<string,string> = {
  store_before: "Foto Toko Before",
  chiller_before: "Foto Chiller Before",
  chiller_after: "Foto Chiller After",
  wobbler_after: "Foto Wobbler",
  poster_after: "Foto Poster",
  spanduk_after: "Foto Spanduk",
};

export default function PhotoViewerPage(){
  const [photos,setPhotos]=useState<any[]>([]);
  const [urls,setUrls]=useState<Record<string,string>>({});
  const [storeName,setStoreName]=useState("Dokumentasi Foto");
  const submission=typeof window!=="undefined"?new URLSearchParams(window.location.search).get("submission"):null;

  useEffect(()=>{
    let active=true;
    const created:string[]=[];
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
        setPhotos(photoRows??[]);
        setStoreName(submissionRow?.store_name || "Dokumentasi Foto");
        const next:Record<string,string>={};
        for(const photo of photoRows??[]){
          const res=await fetch(`${import.meta.env.PUBLIC_SUPABASE_URL}/functions/v1/photo-view?photo_id=${photo.id}`,{
            headers:{Authorization:`Bearer ${session?.access_token}`}
          });
          if(res.ok){
            const url=URL.createObjectURL(await res.blob());
            created.push(url);
            next[photo.id]=url;
          }
        }
        if(active)setUrls(next);
      }catch(error){
        console.error("photo_view_failed",error);
      }
    })();
    return()=>{active=false;created.forEach(URL.revokeObjectURL)};
  },[submission]);

  return <section>
    <h2 className="text-2xl font-bold text-[#0B1D3A]">{storeName}</h2>
    <p className="mt-1 text-sm text-slate-500">Dokumentasi foto pekerjaan.</p>
    <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {photos.map(photo=><article key={photo.id} className="brand-card overflow-hidden rounded-2xl">
        <div className="flex aspect-[4/3] items-center justify-center bg-slate-50">
          {urls[photo.id]?<img className="h-full w-full object-cover" src={urls[photo.id]} alt={labels[photo.photo_type]}/>:<span className="text-sm text-slate-400">Memuat...</span>}
        </div>
        <div className="p-4"><p className="font-semibold text-[#0B1D3A]">{labels[photo.photo_type]??photo.photo_type}</p><p className="mt-1 truncate text-xs text-slate-400">{photo.file_name}</p></div>
      </article>)}
      {!photos.length&&<div className="brand-card rounded-2xl p-10 text-center text-slate-400"><ImageIcon className="mx-auto mb-3"/>Belum ada foto.</div>}
    </div>
  </section>;
}
