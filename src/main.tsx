import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "@fontsource/syne/700.css";
import "@fontsource/syne/800.css";
import "@fontsource/plus-jakarta-sans/400.css";
import "@fontsource/plus-jakarta-sans/500.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";

// Canonical host redirect: keep everyone on the apex domain so localStorage
// (auth session, gate flags) is shared across visits. The Lovable preview host
// is left alone so the in-editor preview keeps working.
if (typeof window !== "undefined") {
  const host = window.location.hostname;
  const shouldRedirect =
    host === "www.tamyazak.site" ||
    (host.endsWith(".lovable.app") && !host.startsWith("id-preview--"));
  if (shouldRedirect) {
    const url = new URL(window.location.href);
    url.hostname = "tamyazak.site";
    url.protocol = "https:";
    url.port = "";
    window.location.replace(url.toString());
  }
}

createRoot(document.getElementById("root")!).render(<App />);

// PWA: pick the install manifest that matches the phone's language.
if (typeof window !== "undefined") {
  const isArabic = (navigator.languages?.[0] ?? navigator.language ?? "en")
    .toLowerCase()
    .startsWith("ar");
  const link = document.getElementById("app-manifest") as HTMLLinkElement | null;
  const href = isArabic ? "/manifest-ar.webmanifest" : "/manifest-en.webmanifest";
  if (link) link.href = href;
  document.documentElement.setAttribute("lang", isArabic ? "ar" : "en");
}
