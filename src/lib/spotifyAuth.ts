// Spotify Authorization Code with PKCE — fully client-side, no server secret.
// Stores: client_id, code_verifier (transient), access_token, refresh_token, expires_at.

const LS = {
  clientId: "spotify:client_id",
  verifier: "spotify:pkce_verifier",
  redirect: "spotify:redirect_uri",
  access: "spotify:access_token",
  refresh: "spotify:refresh_token",
  expires: "spotify:expires_at",
  returnTo: "spotify:return_to",
};

export const SPOTIFY_SCOPES = [
  "streaming",
  "user-read-email",
  "user-read-private",
  "user-modify-playback-state",
  "user-read-playback-state",
].join(" ");

export function getClientId(): string | null {
  try { return localStorage.getItem(LS.clientId); } catch { return null; }
}
export function setClientId(id: string) {
  try { localStorage.setItem(LS.clientId, id.trim()); } catch {}
}
export function clearClientId() {
  try { localStorage.removeItem(LS.clientId); } catch {}
}

export function getRedirectUri(): string {
  // Spotify requires an exact registered redirect URI. Use the page origin + /sessions.
  return `${window.location.origin}/`;
}

function base64UrlEncode(bytes: ArrayBuffer): string {
  const arr = new Uint8Array(bytes);
  let s = "";
  for (let i = 0; i < arr.length; i++) s += String.fromCharCode(arr[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sha256(input: string): Promise<ArrayBuffer> {
  return await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
}

function randomString(len = 64): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((n) => chars[n % chars.length]).join("");
}

export async function beginLogin(): Promise<void> {
  const clientId = getClientId();
  if (!clientId) throw new Error("Spotify Client ID missing");
  const verifier = randomString(64);
  const challenge = base64UrlEncode(await sha256(verifier));
  const redirect = getRedirectUri();
  try {
    localStorage.setItem(LS.verifier, verifier);
    localStorage.setItem(LS.redirect, redirect);
    localStorage.setItem(LS.returnTo, window.location.pathname + window.location.search);
  } catch {}
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: SPOTIFY_SCOPES,
    redirect_uri: redirect,
    code_challenge_method: "S256",
    code_challenge: challenge,
    state: "spotify",
  });
  window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

type TokenResp = { access_token: string; refresh_token?: string; expires_in: number; token_type: string };

async function exchangeCode(code: string): Promise<TokenResp> {
  const clientId = getClientId();
  const verifier = localStorage.getItem(LS.verifier) || "";
  const redirect = localStorage.getItem(LS.redirect) || getRedirectUri();
  if (!clientId) throw new Error("Spotify Client ID missing");
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirect,
    client_id: clientId,
    code_verifier: verifier,
  });
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`Token exchange failed (${res.status})`);
  return (await res.json()) as TokenResp;
}

function persistTokens(t: TokenResp) {
  try {
    localStorage.setItem(LS.access, t.access_token);
    if (t.refresh_token) localStorage.setItem(LS.refresh, t.refresh_token);
    localStorage.setItem(LS.expires, String(Date.now() + (t.expires_in - 30) * 1000));
    localStorage.removeItem(LS.verifier);
  } catch {}
}

export async function handleRedirectCallback(): Promise<boolean> {
  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || state !== "spotify") return false;
  try {
    const tokens = await exchangeCode(code);
    persistTokens(tokens);
    // Clean URL
    url.searchParams.delete("code");
    url.searchParams.delete("state");
    const returnTo = localStorage.getItem(LS.returnTo) || url.pathname;
    localStorage.removeItem(LS.returnTo);
    window.history.replaceState({}, "", returnTo);
    return true;
  } catch (e) {
    console.error("[spotify] exchange failed", e);
    return false;
  }
}

async function refreshTokens(): Promise<string | null> {
  const clientId = getClientId();
  const refresh = localStorage.getItem(LS.refresh);
  if (!clientId || !refresh) return null;
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refresh,
    client_id: clientId,
  });
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) return null;
  const t = (await res.json()) as TokenResp;
  persistTokens(t);
  return t.access_token;
}

export async function getAccessToken(): Promise<string | null> {
  try {
    const access = localStorage.getItem(LS.access);
    const expires = Number(localStorage.getItem(LS.expires) || 0);
    if (access && Date.now() < expires) return access;
    return await refreshTokens();
  } catch {
    return null;
  }
}

export function isConnected(): boolean {
  try { return !!localStorage.getItem(LS.refresh); } catch { return false; }
}

export function logout() {
  try {
    localStorage.removeItem(LS.access);
    localStorage.removeItem(LS.refresh);
    localStorage.removeItem(LS.expires);
    localStorage.removeItem(LS.verifier);
  } catch {}
}

export function parsePlaylistUri(input: string): string | null {
  const t = input.trim();
  if (!t) return null;
  const uri = t.match(/^spotify:(playlist|album|track|artist):([A-Za-z0-9]+)/i);
  if (uri) return `spotify:${uri[1].toLowerCase()}:${uri[2]}`;
  try {
    const u = new URL(t);
    if (!u.hostname.includes("spotify.com")) return null;
    const parts = u.pathname.split("/").filter(Boolean);
    const idx = parts.findIndex((p) => ["playlist", "album", "track", "artist"].includes(p));
    if (idx === -1 || !parts[idx + 1]) return null;
    return `spotify:${parts[idx]}:${parts[idx + 1]}`;
  } catch { return null; }
}