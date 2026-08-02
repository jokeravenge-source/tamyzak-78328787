import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/supabase/vite";

const CSP_PROD = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "script-src 'self' https://cdn.jsdelivr.net https://sdk.scdn.co https://cdn.paddle.com https://open.spotify.com",
  "script-src-attr 'none'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: data: https:",
  "connect-src 'self' blob: data: https://*.supabase.co wss://*.supabase.co https://fonts.googleapis.com https://fonts.gstatic.com https://api.spotify.com https://accounts.spotify.com https://storage.googleapis.com https://i.ytimg.com",
  "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://youtube.com https://open.spotify.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

// Dev/HMR needs inline + eval scripts and websocket connections to the dev server.
const CSP_DEV = CSP_PROD.replace(
  "script-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
)
  .replace("connect-src 'self'", "connect-src 'self' ws: wss: http://localhost:* http://127.0.0.1:*")
  .replace("frame-ancestors 'self'", "frame-ancestors *")
  .replace("; upgrade-insecure-requests", "");

const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy":
    "geolocation=(), microphone=(), camera=(), payment=(), usb=(), interest-cohort=()",
  "Cross-Origin-Opener-Policy": "same-origin",
  "X-XSS-Protection": "0",
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    headers: { ...securityHeaders, "Content-Security-Policy": CSP_DEV },
    hmr: {
      overlay: false,
    },
  },
  preview: {
    headers: { ...securityHeaders, "Content-Security-Policy": CSP_PROD },
  },
  plugins: [react(), mcpPlugin(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
