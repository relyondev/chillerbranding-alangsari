import { useEffect, useState } from "react";
import { getSupabaseClient } from "../../lib/supabase/client";

type Role = "super_admin" | "admin" | "pic" | "client";

const rules: Array<{ test:(path:string)=>boolean; roles:Role[] | null }> = [
  { test:(p)=>p==="/app/dashboard" || p==="/app/account" || p==="/app/photos", roles:null },
  { test:(p)=>p==="/app/audit", roles:["super_admin"] },
  { test:(p)=>["/app/jobs","/app/master-data","/app/pics","/app/users","/app/salesmen"].includes(p), roles:["super_admin","admin"] },
  { test:(p)=>p==="/app/my-salesmen", roles:["pic"] },
  { test:(p)=>p==="/app/submissions" || p==="/app/my-work", roles:["pic"] },
  { test:(p)=>p==="/app/reporting", roles:["client"] },
];

export default function AppAccessGuard(){
  const [label,setLabel]=useState("Memeriksa akses...");

  useEffect(()=>{
    let active=true;
    (async()=>{
      const supabase=getSupabaseClient();
      const { data:{ user } }=await supabase.auth.getUser();
      if(!active) return;
      if(!user){ window.location.replace("/login"); return; }

      const {data:profile,error}=await supabase.from("profiles").select("role,is_active").eq("id",user.id).maybeSingle();
      if(!active) return;
      if(error || !profile?.is_active){
        await supabase.auth.signOut();
        window.location.replace("/login");
        return;
      }

      const rawPath=window.location.pathname;
      const path=rawPath.length>1?rawPath.replace(/\/+$/,""):rawPath;
      const rule=rules.find((item)=>item.test(path));
      const allowed=!rule || rule.roles===null || rule.roles.includes(profile.role as Role);
      if(!allowed){ window.location.replace("/app/dashboard"); return; }

      const shell=document.getElementById("app-protected-shell");
      const gate=document.getElementById("app-access-gate");
      if(shell) shell.classList.remove("hidden");
      if(gate) gate.classList.add("hidden");
    })().catch(()=>{
      if(active){ setLabel("Akses tidak dapat diverifikasi. Mengarahkan ke login..."); setTimeout(()=>window.location.replace("/login"),700); }
    });
    return()=>{active=false;};
  },[]);

  return <div id="app-access-gate" className="flex min-h-[55vh] items-center justify-center px-6 text-center text-sm text-slate-500">{label}</div>;
}
