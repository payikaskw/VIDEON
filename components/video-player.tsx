"use client";

import { useEffect, useRef, useState } from "react";

type Props = { url: string; title: string; poster?: string | null; type: "hls" | "file" | "embed" };

export default function VideoPlayer({ url, title, poster, type }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const video = videoRef.current;
    if (!video || type !== "hls") return;
    let hls: import("hls.js").default | null = null;
    let disposed = false;
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
      return () => { video.removeAttribute("src"); video.load(); };
    }
    import("hls.js").then(({ default: Hls }) => {
      if (disposed) return;
      if (!Hls.isSupported()) {
        setError("Perangkat ini tidak mendukung pemutaran HLS secara langsung.");
        return;
      }
      hls = new Hls({ enableWorker: true, lowLatencyMode: false, backBufferLength: 30 });
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls?.startLoad();
        else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls?.recoverMediaError();
        else setError("Stream HLS gagal dimuat. Periksa ketersediaan stream dari VidHold.");
      });
    }).catch(() => setError("Modul pemutar HLS gagal dimuat."));
    return () => { disposed = true; hls?.destroy(); };
  }, [url, type]);

  if (type === "embed") return <iframe src={url} title={title} allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" style={{ width: "100%", height: "100%", border: 0 }} />;
  return (
    <div style={{ width: "100%", height: "100%", position: "relative", background: "#000" }}>
      <video ref={videoRef} src={type === "file" ? url : undefined} controls playsInline preload="metadata" poster={poster || undefined} onError={() => setError("Browser tidak dapat memutar alamat video dari VidHold. URL mungkin kedaluwarsa atau format tidak didukung.")} style={{ width: "100%", height: "100%" }} />
      {error && <div role="status" style={{ position: "absolute", inset: "auto 12px 12px", padding: 12, borderRadius: 8, background: "#18181beF", color: "#fff", fontSize: 13 }}>{error}</div>}
    </div>
  );
}
