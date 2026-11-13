"use client";
import { useState } from "react";
import { Play, ShieldCheck } from "lucide-react";

export default function AdminLogin(){
 const [username,setUsername]=useState(""); const [password,setPassword]=useState(""); const [error,setError]=useState(""); const [busy,setBusy]=useState(false);
 async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setError("");try{const r=await fetch("/api/admin/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username,password})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Login gagal");window.location.href="/admin/dashboard";}catch(err){setError(err instanceof Error?err.message:"Login gagal");}finally{setBusy(false)}}
 return <main className="admin-wrap"><form className="admin-card" onSubmit={submit}><div className="brand" style={{marginBottom:26}}><span className="brand-mark"><Play size={17} fill="white"/></span>VIRALINDO</div><div style={{display:"flex",gap:10,alignItems:"center",marginBottom:8}}><ShieldCheck color="#fb7185"/><h1>Admin Console</h1></div><p className="muted">Masuk untuk mengelola platform VIRALINDO.</p><div className="field"><label>Username</label><input autoComplete="username" value={username} onChange={e=>setUsername(e.target.value)} required/></div><div className="field"><label>Password</label><input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required/></div>{error&&<p className="error">{error}</p>}<button className="primary-btn" disabled={busy} style={{width:"100%",justifyContent:"center"}}>{busy?"Memeriksa...":"Masuk Admin"}</button><a className="muted" href="/" style={{display:"block",textAlign:"center",marginTop:20}}>← Kembali ke VIRALINDO</a></form></main>
}
