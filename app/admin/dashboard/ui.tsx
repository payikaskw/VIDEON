"use client";
import { useEffect,useState } from "react";
import { LogOut,UploadCloud,RefreshCw,Film,Cloud,Link2 } from "lucide-react";
type Video={id:string;title:string;status:string;type:string;provider:string;provider_file_code:string|null;created_at:string};
export default function AdminDashboard({username}:{username:string}){
 const [title,setTitle]=useState(""); const [url,setUrl]=useState(""); const [type,setType]=useState("video");
 const [busy,setBusy]=useState(false); const [message,setMessage]=useState(""); const [error,setError]=useState("");
 const [videos,setVideos]=useState<Video[]>([]); const [account,setAccount]=useState<Record<string,unknown>|null>(null);
 async function load(){
  const [v,a]=await Promise.all([fetch("/api/admin/videos",{cache:"no-store"}),fetch("/api/admin/vidhold/account",{cache:"no-store"})]);
  if(v.ok){const d=await v.json();setVideos(d.videos||[])}
  if(a.ok){const d=await a.json();setAccount(d.account||null)}
 }
 useEffect(()=>{void load()},[]);
 async function addRemote(e:React.FormEvent){
  e.preventDefault();setBusy(true);setMessage("");setError("");
  try{const r=await fetch("/api/admin/vidhold/remote-upload",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url,title,type})});
   const d=await r.json();if(!r.ok)throw new Error(d.error||"Import gagal");
   setMessage("URL berhasil dikirim ke Vidhold. Proses berjalan di background. File code: "+d.fileCode);
   setTitle("");setUrl("");setType("video");await load();
  }catch(e){setError(e instanceof Error?e.message:"Gagal mengirim URL")}finally{setBusy(false)}
 }
 async function refresh(){
  setBusy(true);setError("");setMessage("");
  try{const pending=videos.filter(v=>v.provider==="vidhold"&&v.provider_file_code&&v.status==="processing");
   const results=await Promise.all(pending.map(async v=>{const r=await fetch("/api/admin/vidhold/status",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({fileCode:v.provider_file_code})});const d=await r.json();return {ok:r.ok,error:d.error}}));
   const failed=results.find(x=>!x.ok);if(failed?.error)setError(failed.error);else setMessage("Status Vidhold sudah diperbarui.");await load();
  }catch(e){setError(e instanceof Error?e.message:"Gagal memperbarui status")}finally{setBusy(false)}
 }
 async function logout(){await fetch("/api/admin/logout",{method:"POST"});window.location.href="/"}
 return <main className="content" style={{minHeight:"100vh",maxWidth:1200,margin:"auto"}}>
  <header style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,marginBottom:30}}>
   <div><div className="brand"><span className="brand-mark"><Film size={17}/></span>VIDEON <span className="muted" style={{fontSize:12,fontWeight:500}}>ADMIN</span></div><p className="muted">Masuk sebagai {username}</p></div>
   <button className="pill" onClick={logout}><LogOut size={15} style={{display:"inline",marginRight:7}}/>Keluar</button>
  </header>
  <div className="section-head"><div><div className="eyebrow">Control center</div><h2>Dashboard</h2></div><button className="secondary-btn" style={{margin:0}} onClick={refresh} disabled={busy}><RefreshCw size={15}/>Perbarui status</button></div>
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:14,marginBottom:28}}>
   <div className="admin-card"><Cloud color="#fb7185"/><p className="muted">Vidhold storage</p><strong>{String(account?.storage_used??"—")}</strong></div>
   <div className="admin-card"><Film color="#fb7185"/><p className="muted">Total konten VIDEON</p><strong>{videos.length}</strong></div>
   <div className="admin-card"><UploadCloud color="#fb7185"/><p className="muted">Sedang diproses</p><strong>{videos.filter(v=>v.status==="processing").length}</strong></div>
  </div>
  <div className="admin-card" style={{width:"100%",marginBottom:26}}>
   <h2 style={{font:"700 20px Manrope",marginTop:0}}>Tambah video melalui URL</h2>
   <p className="muted">Masukkan URL video publik yang dapat diakses Vidhold. Vidhold mengambil dan memproses video di server mereka. VIDEON tidak menerima upload file lokal.</p>
   <form onSubmit={addRemote}>
    <div className="field"><label>Judul video</label><input value={title} onChange={e=>setTitle(e.target.value)} required maxLength={180} placeholder="Contoh: Film pilihan"/></div>
    <div className="field"><label>Jenis konten</label><select value={type} onChange={e=>setType(e.target.value)}><option value="video">Video biasa</option><option value="film">Film</option><option value="serial">Serial</option><option value="anime">Anime</option><option value="documenter">Dokumenter</option><option value="hiburan">Hiburan</option></select></div>
    <div className="field"><label>Direct video URL (HTTPS)</label><input type="url" value={url} onChange={e=>setUrl(e.target.value)} required placeholder="https://server.com/video.mp4"/></div>
    {message&&<p style={{color:"#86efac",fontSize:13}}>{message}</p>}{error&&<p className="error">{error}</p>}
    <button className="primary-btn" disabled={busy||!title.trim()||!url.trim()}><Link2 size={16}/>{busy?"Mengirim ke Vidhold...":"Import URL ke Vidhold"}</button>
   </form>
  </div>
  <div className="section-head"><h2>Konten video</h2><span className="muted">{videos.length} item</span></div>
  <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
   <thead><tr style={{textAlign:"left",color:"#a1a1aa"}}>{["Judul","Tipe","Hosting","Status","File code"].map(x=><th key={x} style={{padding:12,borderBottom:"1px solid #303038"}}>{x}</th>)}</tr></thead>
   <tbody>{videos.map(v=><tr key={v.id}><td style={{padding:12,borderBottom:"1px solid #27272a"}}>{v.title}</td><td style={{padding:12,borderBottom:"1px solid #27272a"}}>{v.type}</td><td style={{padding:12,borderBottom:"1px solid #27272a"}}>{v.provider||"—"}</td><td style={{padding:12,borderBottom:"1px solid #27272a"}}>{v.status}</td><td style={{padding:12,borderBottom:"1px solid #27272a"}}>{v.provider_file_code||"—"}</td></tr>)}</tbody>
  </table>{videos.length===0&&<div className="empty">Belum ada video. Tambahkan video melalui URL di atas.</div>}</div>
  <p className="muted" style={{marginTop:28}}>Hanya URL HTTPS publik yang diizinkan. Status diperbarui melalui API Vidhold.</p>
 </main>
}