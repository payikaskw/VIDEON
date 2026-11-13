import { isIP } from "node:net";

const BASE_URL = "https://vidhold.com/api";

type VidholdResponse<T = Record<string, unknown>> = {
  status?: number;
  msg?: string;
  result?: T;
};

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
    (a === 100 && b >= 64 && b <= 127) || (a === 198 && (b === 18 || b === 19)) ||
    a >= 224;
}

export function validatePublicVideoUrl(value: string) {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error("URL video tidak valid."); }
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new Error("Gunakan URL HTTPS publik tanpa username atau password.");
  }
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) {
    throw new Error("Host lokal tidak diizinkan.");
  }
  const ipVersion = isIP(host);
  if (ipVersion === 4 && isPrivateIpv4(host)) throw new Error("Alamat IP privat tidak diizinkan.");
  if (ipVersion === 6 && (host === "::1" || host === "::" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80:"))) {
    throw new Error("Alamat IPv6 lokal atau privat tidak diizinkan.");
  }
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
    const body = new URLSearchParams({ key, ...params });
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    options.body = body.toString();
  }
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`Vidhold API HTTP ${response.status}.`);
  const data = await response.json() as VidholdResponse<T>;
  if (data.status !== 200) throw new Error(data.msg || "Vidhold API menolak permintaan.");
  return data;
}

export async function vidholdAccount() {
  return request("account/info", {});
}

export async function vidholdRemoteImport(sourceUrl: string) {
  return request<{ filecode?: string }>("upload/url", { url: sourceUrl }, "POST");
}

export async function vidholdFileInfo(fileCode: string) {
  return request<Record<string, unknown>>("file/info", { file_code: fileCode });
}

export async function vidholdDelete(fileCode: string) {
  return request("file/delete", { file_code: fileCode });
}

export function validFileCode(value: string) {
  if (!/^[a-zA-Z0-9_-]{4,80}$/.test(value)) throw new Error("File code Vidhold tidak valid.");
  return value;
}
