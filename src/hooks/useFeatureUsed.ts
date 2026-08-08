import { useEffect } from "react";
import { trackFeature } from "@/lib/analytics";

/** Fires a `feature_used` analytics event once when the feature screen opens. */
export function useFeatureUsed(feature: string, metadata: Record<string, unknown> = {}) {
  useEffect(() => {
    trackFeature(feature, metadata);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feature]);
}
