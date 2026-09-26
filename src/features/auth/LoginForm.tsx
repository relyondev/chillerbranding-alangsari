import { Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { useState } from "react";
import { signIn } from "../../services/auth.service";
import { getSupabaseClient } from "../../lib/supabase/client";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inactiveLogout = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("reason") === "inactive";

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data, error } = await signIn(email, password);
      if (error) throw error;

      const userId = data.user?.id;
      if (!userId) throw new Error("Sesi login tidak ditemukan.");

      const supabase = getSupabaseClient();
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role,is_active")
        .eq("id", userId)
        .single();

      if (profileError || !profile?.is_active) {
        await supabase.auth.signOut();
        throw new Error("Akun tidak aktif atau profile tidak ditemukan.");
      }

      window.location.href =
        profile.role === "pic"
          ? "/app/submissions"
          : "/app/dashboard";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login gagal.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="mt-7 space-y-7" onSubmit={onSubmit}>
      {inactiveLogout && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">Sesi berakhir otomatis karena tidak ada aktivitas selama 2 jam. Silakan login kembali.</div>}
      <div>
        <label htmlFor="email" className="block text-[16px] font-semibold text-[#0B1D3A]">Email</label>
        <div className="relative mt-3">
          <Mail size={21} className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-[#9AAAC0]" />
          <input id="email" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="nama@email.com" autoComplete="email" required className="h-[64px] w-full rounded-2xl border border-[#C8D5E7] bg-[#F9FBFE] pl-14 pr-5 text-[17px] text-[#0B1D3A] outline-none transition placeholder:text-[#9CA8BB] focus:border-[#1565EF] focus:bg-white focus:ring-4 focus:ring-[#BEE6FF]/55" />
        </div>
      </div>

      <div>
        <label htmlFor="password" className="block text-[16px] font-semibold text-[#0B1D3A]">Password</label>
        <div className="relative mt-3">
          <LockKeyhole size={21} className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-[#9AAAC0]" />
          <input id="password" type={show ? "text" : "password"} value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Masukkan password" autoComplete="current-password" required className="h-[64px] w-full rounded-2xl border border-[#C8D5E7] bg-[#F9FBFE] pl-14 pr-14 text-[17px] text-[#0B1D3A] outline-none transition placeholder:text-[#9CA8BB] focus:border-[#1565EF] focus:bg-white focus:ring-4 focus:ring-[#BEE6FF]/55" />
          <button type="button" onClick={()=>setShow(v=>!v)} className="absolute inset-y-0 right-0 flex w-14 items-center justify-center text-[#9AAAC0] transition hover:text-[#1565EF]" aria-label={show ? "Sembunyikan password" : "Tampilkan password"}>
            {show ? <EyeOff size={22} /> : <Eye size={22} />}
          </button>
        </div>
        <div className="mt-5 flex justify-end"><a href="/forgot-password" className="text-[15px] font-semibold text-[#1565EF] hover:text-[#0B1D3A]">Lupa password?</a></div>
      </div>

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}
      <button disabled={loading} className="h-[62px] w-full rounded-2xl bg-[linear-gradient(90deg,#1565EF_0%,#4B5FF0_100%)] text-[18px] font-semibold text-white shadow-[0_14px_28px_rgba(21,101,239,.20)] disabled:opacity-60">
        {loading ? "Memproses..." : "Masuk ke Sistem"}
      </button>
    </form>
  );
}
