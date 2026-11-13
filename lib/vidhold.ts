import { isIP } from "node:net";

const BASE_URL = "https://vidhold.com/api";
type VidholdResponse<T = Record<string, unknown>> = { status?: number; msg?: string; result?: T };
type Rec = Record<string, unknown>;

function getKey() {
  const key = process.env.VIDHOLD_API_KEY;
  if (!key) throw new Error("VIDHOLD_API_KEY belum dikonfigurasi di Vercel.");
  return key;
}

function isPrivateIpv4(host: string) {
  const parts = host.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a, b] = parts;
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) || (a === 198 && (b === 18 || b === 19)) || a >= 224;
}

export function validatePublicVideoUrl(value: string) {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error("URL video tidak valid."); }
  if (url.protocol !== "https:" || url.username || url.password) throw new Error("Gunakan URL HTTPS publik tanpa username atau password.");
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) throw new Error("Host lokal tidak diizinkan.");
  const ipVersion = isIP(host);
  if (ipVersion === 4 && isPrivateIpv4(host)) throw new Error("Alamat IP privat tidak diizinkan.");
  if (ipVersion === 6 && (host === "::1" || host === "::" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80:"))) throw new Error("Alamat IPv6 lokal atau privat tidak diizinkan.");
  return url.toString();
}

async function request<T>(path: string, params: Record<string, string>, method: "GET" | "POST" = "GET") {
  const url = new URL(`${BASE_URL}/${path.replace(/^\/+/, "")}`);
  const key = getKey();
  const headers: Record<string, string> = { Accept: "application/json" };
  const options: RequestInit = { method, cache: "no-store", signal: AbortSignal.timeout(25_000), headers };
  if (method === "GET") {
    url.searchParams.set("key", key);
    for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
  } else {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    options.body = new URLSearchParams({ key, ...params }).toString();
  }
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`VidHold API HTTP ${response.status} pada ${path}.`);
  const data = await response.json() as VidholdResponse<T>;
  if (data.status !== 200) throw new Error(data.msg || `VidHold API menolak permintaan ${path}.`);
  return data;
}

export async function vidholdAccount() { return request("account/info", {}); }
export async function vidholdRemoteImport(sourceUrl: string) { return request<{ filecode?: string }>("upload/url", { url: sourceUrl }, "POST"); }
export async function vidholdFileInfo(fileCode: string) { return request<Rec>("file/info", { file_code: fileCode }); }
export async function vidholdFileDirectLink(fileCode: string) {
  return request<Rec>("file/direct_link", { file_code: fileCode, hls: "1" });
}
export async function vidholdFileList(page = 1, perPage = 100) {
  return request<{ files?: Array<Rec>; results_total?: number; pages?: number; total?: number }>("file/list", { page: String(page), per_page: String(perPage) });
}
export async function vidholdDelete(fileCode: string) { return request("file/delete", { file_code: fileCode }); }

function asRecord(value: unknown): Rec {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Rec : {};
}
function safeHttpUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    // VidHold may return legacy HTTP CDN links; HTTPS avoids mixed-content blocking.
    url.protocol = "https:";
    return url.toString();
  } catch { return null; }
}

/** Extract only player/stream fields. download_url is deliberately excluded:
 * a download endpoint is not necessarily playable in an HTML5 video element. */
export function vidholdExtractPlaybackUrl(...sources: unknown[]): string | null {
  const preferred = ["hls_direct", "hls_url", "stream_url", "direct_url", "mp4_url", "video_url", "versions"];
  const ordinary = ["embed_url", "embed", "player_url", "player", "view_url", "link", "file_url", "url"];
  const visited = new Set<unknown>();
  const find = (value: unknown, depth: number): string | null => {
    if (depth > 5 || value == null || visited.has(value)) return null;
    if (typeof value === "string") return safeHttpUrl(value);
    if (typeof value !== "object") return null;
    visited.add(value);
    if (Array.isArray(value)) {
      for (const item of value) {
        const found = find(item, depth + 1);
        if (found) return found;
      }
      return null;
    }
    const record = value as Rec;
    for (const key of preferred) {
      const candidate = record[key];
      if (key === "versions" && Array.isArray(candidate)) {
        const version = candidate.map(asRecord).find((entry) => safeHttpUrl(entry.url));
        if (version) return safeHttpUrl(version.url);
      } else {
        const found = find(candidate, depth + 1);
        if (found) return found;
      }
    }
    for (const key of ordinary) {
      const found = find(record[key], depth + 1);
      if (found) return found;
    }
    for (const key of ["result", "data", "file", "info"]) {
      const found = find(record[key], depth + 1);
      if (found) return found;
    }
    return null;
  };
  for (const source of sources) {
    const found = find(source, 0);
    if (found) return found;
  }
  return null;
}

export function vidholdPlaybackType(value: string | null): "hls" | "file" | "embed" | "unavailable" {
  if (!value) return "unavailable";
  let pathname = value;
  try { pathname = new URL(value).pathname; } catch {}
  if (/\.m3u8$/i.test(pathname)) return "hls";
  if (/\.(mp4|webm|ogg|m4v)$/i.test(pathname)) return "file";
  return "embed";
}

function listRecords(value: unknown): Rec[] {
  if (Array.isArray(value)) return value.map(asRecord);
  const record = asRecord(value);
  for (const key of ["files", "results", "data", "items"]) {
    if (Array.isArray(record[key])) return (record[key] as unknown[]).map(asRecord);
  }
  return Object.keys(record).length ? [record] : [];
}

export async function vidholdResolvePlayback(fileCode: string) {
  let info: Rec = {};
  let listed: Rec = {};
  let direct: Rec = {};
  let directLinkError: string | null = null;
  try {
    const response = await vidholdFileInfo(fileCode);
    const candidates = listRecords(response.result);
    info = candidates.find((item) => String(item.file_code || item.filecode || item.file_code_id || "") === fileCode) || candidates[0] || {};
  } catch {}
  try {
    const response = await vidholdFileDirectLink(fileCode);
    direct = asRecord(response.result);
  } catch (error) {
    directLinkError = error instanceof Error ? error.message : "Gagal meminta direct link VidHold.";
  }
  try {
    const response = await vidholdFileList(1, 100);
    const candidates = listRecords(response.result);
    listed = candidates.find((item) => String(item.file_code || item.filecode || item.file_code_id || item.code || "") === fileCode) || {};
  } catch {}
  const url = vidholdExtractPlaybackUrl(direct, info, listed);
  return {
    url,
    type: vidholdPlaybackType(url),
    infoFields: Object.keys(info).slice(0, 40),
    directLinkFields: Object.keys(direct).slice(0, 40),
    directLinkError,
    providerStatus: String(info.status ?? info.file_status ?? info.encoding_status ?? listed.status ?? "unknown"),
    info,
    direct,
    listed,
  };
}

export function validFileCode(value: string) {
  if (!/^[a-zA-Z0-9_-]{4,80}$/.test(value)) throw new Error("File code VidHold tidak valid.");
  return value;
}
