import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
export function adminClient(){return createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false}})}
export async function userFromRequest(req:Request){
  const token=(req.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"");
  if(!token) throw new Error("unauthorized");
  const admin=adminClient();const {data,error}=await admin.auth.getUser(token);
  if(error||!data.user) throw new Error("unauthorized");
  return {user:data.user,admin};
}
