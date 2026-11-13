"use client";

type Props = { url: string; title: string };

export default function VideoPlayer({ url, title }: Props) {
  return <iframe src={url} title={title} allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" style={{ width: "100%", height: "100%", border: 0 }} />;
}
