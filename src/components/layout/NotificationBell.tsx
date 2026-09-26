import { Bell, Check, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getSupabaseClient } from "../../lib/supabase/client";

export default function NotificationBell() {
  const [rows,setRows] = useState<any[]>([]);
  const [open,setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement|null>(null);

  async function load() {
    const supabase=getSupabaseClient();
    const {data}=await supabase
      .from("user_notifications")
      .select("*")
      .order("created_at",{ascending:false})
      .limit(20);
    setRows(data??[]);
  }

  useEffect(()=>{ load(); const timer=window.setInterval(load,30000); return ()=>window.clearInterval(timer); },[]);
  useEffect(()=>{
    const close=(e:MouseEvent)=>{ if(!wrapper.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown",close);
    return ()=>document.removeEventListener("mousedown",close);
  },[]);

  const unread=rows.filter((x)=>!x.is_read).length;

  async function markRead(id:string){
    const supabase=getSupabaseClient();
    await supabase.from("user_notifications").update({is_read:true}).eq("id",id);
    await load();
  }

  return (
    <div ref={wrapper} className="relative">
      <button type="button" onClick={()=>setOpen(v=>!v)}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-[#F5F9FF]">
        <Bell size={19}/>
        {unread>0 && <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{unread>9?"9+":unread}</span>}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-[min(92vw,360px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,42,82,.16)]">
          <div className="border-b border-slate-100 px-4 py-3"><p className="font-semibold text-[#0B1D3A]">Notifikasi</p></div>
          <div className="max-h-96 overflow-y-auto p-2">
            {rows.length ? rows.map((row)=>(
              <div key={row.id} className={`rounded-xl p-3 ${row.is_read?"bg-white":"bg-[#F5F9FF]"}`}>
                <div className="flex gap-3">
                  <span className="mt-0.5 text-[#1565EF]"><RotateCcw size={17}/></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#0B1D3A]">{row.title}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{row.message}</p>
                    {row.entity_id && <a href={`/app/submissions?draft=${row.entity_id}`} className="mt-2 inline-block text-xs font-semibold text-[#1565EF]">Buka pekerjaan</a>}
                  </div>
                  {!row.is_read && <button type="button" onClick={()=>markRead(row.id)} className="rounded-lg p-1 text-slate-400 hover:bg-white"><Check size={15}/></button>}
                </div>
              </div>
            )) : <div className="px-4 py-10 text-center text-sm text-slate-400">Belum ada notifikasi.</div>}
          </div>
        </div>
      )}
    </div>
  );
}
