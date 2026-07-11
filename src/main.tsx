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
// (auth session, gate flags) is shared across visits.
if (typeof window !== "undefined" && window.location.hostname === "www.tamyazak.site") {
  const url = new URL(window.location.href);
  url.hostname = "tamyazak.site";
  window.location.replace(url.toString());
}

createRoot(document.getElementById("root")!).render(<App />);
