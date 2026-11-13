"use client";

import { useState } from "react";
import { hash } from "bcryptjs";

export default function AdminPasswordHashPage() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function generate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setResult("");
    if (password.length < 12) {
      setError("Password minimal 12 karakter.");
      return;
    }
    if (password !== confirmation) {
      setError("Konfirmasi password tidak sama.");
      return;
    }
    setBusy(true);
    try {
      const value = await hash(password, 12);
      setResult(value);
      setPassword("");
      setConfirmation("");
    } catch {
      setError("Gagal membuat hash. Muat ulang halaman dan coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (result && navigator.clipboard) await navigator.clipboard.writeText(result);
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20, background: "#09090b", color: "#fafafa" }}>
      <section style={{ width: "100%", maxWidth: 440, padding: 24, border: "1px solid #333", borderRadius: 18, background: "#18181b" }}>
        <p style={{ color: "#fb7185", fontWeight: 700, letterSpacing: 2 }}>VIDEON ADMIN</p>
        <h1 style={{ fontSize: 24, margin: "8px 0" }}>Buat password hash</h1>
        <p style={{ color: "#a1a1aa", fontSize: 14, lineHeight: 1.6 }}>Halaman ini membuat bcrypt di browser HP kamu. Password tidak dikirim ke server dan tidak disimpan.</p>
        <form onSubmit={generate} style={{ display: "grid", gap: 12 }}>
          <label style={{ fontSize: 14 }}>Password baru (minimal 12 karakter)
            <input type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} required minLength={12} style={{ display: "block", boxSizing: "border-box", width: "100%", marginTop: 6, padding: 12, borderRadius: 9, border: "1px solid #52525b", background: "#09090b", color: "white" }} />
          </label>
          <label style={{ fontSize: 14 }}>Ulangi password
            <input type="password" autoComplete="new-password" value={confirmation} onChange={e => setConfirmation(e.target.value)} required minLength={12} style={{ display: "block", boxSizing: "border-box", width: "100%", marginTop: 6, padding: 12, borderRadius: 9, border: "1px solid #52525b", background: "#09090b", color: "white" }} />
          </label>
          {error && <p style={{ color: "#fca5a5", fontSize: 14 }}>{error}</p>}
          <button disabled={busy} style={{ padding: 13, border: 0, borderRadius: 9, background: "#e11d48", color: "white", fontWeight: 700 }}>{busy ? "Membuat hash..." : "Buat bcrypt hash"}</button>
        </form>
        {result && <div style={{ marginTop: 20 }}>
          <p style={{ color: "#86efac", fontWeight: 700 }}>Hash berhasil dibuat</p>
          <textarea readOnly value={result} rows={4} style={{ boxSizing: "border-box", width: "100%", padding: 10, borderRadius: 8, background: "#09090b", color: "#fafafa", border: "1px solid #52525b", overflowWrap: "anywhere" }} />
          <button onClick={copy} style={{ width: "100%", marginTop: 8, padding: 12, border: 0, borderRadius: 9, background: "#27272a", color: "white" }}>Salin hash</button>
          <p style={{ color: "#a1a1aa", fontSize: 13, lineHeight: 1.5 }}>Tempel hasil ini ke Vercel sebagai ADMIN_PASSWORD_HASH. Saat login, gunakan password asli yang kamu buat, bukan hash ini.</p>
        </div>}
        <a href="/admin" style={{ display: "block", marginTop: 20, color: "#fda4af" }}>Kembali ke Admin Console</a>
      </section>
    </main>
  );
}
