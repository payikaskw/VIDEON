const DEFAULT_BASE = "https://doodapi.co/api";

function apiUrl(path: string, params: Record<string, string> = {}) {
  const key = process.env.DOODSTREAM_API_KEY;
  if (!key) throw new Error("DOODSTREAM_API_KEY belum dikonfigurasi.");
  const base = (process.env.DOODSTREAM_API_BASE_URL || DEFAULT_BASE).replace(/\/+$/, "");
  const url = new URL(`${base}/${path.replace(/^\/+/, "")}`);
  url.searchParams.set("key", key);
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
  return url;
}

export async function doodGet(path: string, params: Record<string, string> = {}) {
  const response = await fetch(apiUrl(path, params), { method: "GET", cache: "no-store", signal: AbortSignal.timeout(25_000) });
  if (!response.ok) throw new Error(`DoodStream API HTTP ${response.status}`);
  const data = await response.json();
  if (data.status !== 200) throw new Error(data.msg || "DoodStream API gagal.");
  return data;
}

export function getDoodEmbed(fileCode: string) {
  if (!/^[a-zA-Z0-9_-]{4,40}$/.test(fileCode)) throw new Error("File code DoodStream tidak valid.");
  return `https://dood.to/e/${encodeURIComponent(fileCode)}`;
}
