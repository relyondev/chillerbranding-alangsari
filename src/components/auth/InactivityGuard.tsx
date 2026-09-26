import { useEffect } from "react";
import { getSupabaseClient } from "../../lib/supabase/client";

const TIMEOUT_MS = 2 * 60 * 60 * 1000;
const STORAGE_KEY = "branding_ops_last_activity";
const ACTIVITY_THROTTLE_MS = 30 * 1000;

export default function InactivityGuard(){
  useEffect(()=>{
    let timer:number|undefined;
    let lastWrite=0;
    let loggingOut=false;

    async function logoutForInactivity(){
      if(loggingOut) return;
      loggingOut=true;
      try{ await getSupabaseClient().auth.signOut(); }catch{}
      localStorage.removeItem(STORAGE_KEY);
      window.location.href="/login?reason=inactive";
    }

    function schedule(){
      if(timer) window.clearTimeout(timer);
      const last=Number(localStorage.getItem(STORAGE_KEY)||Date.now());
      const remaining=TIMEOUT_MS-(Date.now()-last);
      if(remaining<=0){ void logoutForInactivity(); return; }
      timer=window.setTimeout(()=>void logoutForInactivity(),remaining);
    }

    function markActivity(){
      const now=Date.now();
      if(now-lastWrite<ACTIVITY_THROTTLE_MS) return;
      lastWrite=now;
      localStorage.setItem(STORAGE_KEY,String(now));
      schedule();
    }

    const existing=Number(localStorage.getItem(STORAGE_KEY)||0);
    if(!existing || Date.now()-existing>TIMEOUT_MS) localStorage.setItem(STORAGE_KEY,String(Date.now()));
    schedule();
    const events=["mousemove","mousedown","keydown","scroll","touchstart","pointerdown"] as const;
    events.forEach(event=>window.addEventListener(event,markActivity,{passive:true}));
    function onStorage(e:StorageEvent){if(e.key===STORAGE_KEY)schedule();}
    window.addEventListener("storage",onStorage);
    return()=>{if(timer)window.clearTimeout(timer);events.forEach(event=>window.removeEventListener(event,markActivity));window.removeEventListener("storage",onStorage);};
  },[]);
  return null;
}
