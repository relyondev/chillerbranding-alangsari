import { useState } from "react";
import { requestPasswordReset } from "../../services/auth.service";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setError("");
    const { error } = await requestPasswordReset(email);
    if (error) setError(error.message);
    else setMessage("Link reset password sudah dikirim jika email terdaftar.");
  }

  return (
    <form className="mt-6 space-y-4" onSubmit={submit}>
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="nama@email.com"
        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[var(--role-accent)] focus:ring-4 focus:ring-[#ffd1d3]/50"
      />
      {message && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>}
      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}
      <button className="w-full rounded-xl bg-[var(--role-accent)] px-4 py-3 text-sm font-semibold text-white">Kirim Link Reset</button>
    </form>
  );
}
