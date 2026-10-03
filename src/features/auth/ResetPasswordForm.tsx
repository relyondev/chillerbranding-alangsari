import { useState } from "react";
import { updatePassword } from "../../services/auth.service";

export default function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setError("");
    if (password.length < 8) return setError("Password minimal 8 karakter.");
    if (password !== confirm) return setError("Konfirmasi password tidak sama.");
    const { error } = await updatePassword(password);
    if (error) setError(error.message);
    else setMessage("Password berhasil diperbarui. Silakan login kembali.");
  }

  return (
    <form className="mt-6 space-y-4" onSubmit={submit}>
      <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password baru" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
      <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Ulangi password baru" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
      {message && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>}
      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}
      <button className="w-full rounded-xl bg-[var(--role-accent)] px-4 py-3 text-sm font-semibold text-white">Simpan Password Baru</button>
    </form>
  );
}
