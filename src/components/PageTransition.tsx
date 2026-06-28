import { ReactNode, Suspense } from "react";

/**
 * Subtle page-level fade/slide transition.
 * Re-mounts on `routeKey` change so the keyframe replays.
 */
const PageTransition = ({ routeKey, children }: { routeKey: string; children: ReactNode }) => {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center">
          <div className="w-9 h-9 rounded-full border-2 border-primary/25 border-t-primary animate-spin" />
        </main>
      }
    >
      <div
        key={routeKey}
        className="animate-fade-in motion-reduce:animate-none will-change-[opacity,transform]"
      >
        {children}
      </div>
    </Suspense>
  );
};

export default PageTransition;