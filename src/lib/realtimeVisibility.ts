import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Keeps a realtime channel subscribed ONLY while the tab is visible.
 * Cost control: hidden tabs drop their socket instead of idling on it.
 *
 * `factory` must create + subscribe a fresh channel each time it is called.
 * `onVisible` (optional) runs one fresh fetch whenever visibility is regained.
 */
export function useVisibilityGatedChannel(
  factory: (() => RealtimeChannel | null) | null,
  deps: unknown[],
  onVisible?: () => void,
) {
  useEffect(() => {
    if (!factory) return;
    let ch: RealtimeChannel | null = null;

    const open = () => {
      if (ch) return;
      ch = factory();
    };
    const close = () => {
      if (ch) { supabase.removeChannel(ch); ch = null; }
    };
    const onVisibility = () => {
      if (document.hidden) close();
      else { open(); onVisible?.(); }
    };

    if (!document.hidden) open();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
