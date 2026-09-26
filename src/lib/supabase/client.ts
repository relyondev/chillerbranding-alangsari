import { createClient } from "@supabase/supabase-js";
let client: ReturnType<typeof createClient>|null=null;
export function getSupabaseClient(){if(client)return client;const u=import.meta.env.PUBLIC_SUPABASE_URL;const k=import.meta.env.PUBLIC_SUPABASE_ANON_KEY;if(!u||!k)throw new Error("Supabase environment variables belum dikonfigurasi.");client=createClient(u,k);return client;}
