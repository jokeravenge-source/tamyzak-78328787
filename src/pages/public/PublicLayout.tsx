import { ReactNode } from "react";

export function PublicLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-white/10 bg-secondary/40 backdrop-blur">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="font-bold text-lg gradient-text">Tamayzak</a>
          <nav className="flex gap-4 text-sm text-muted-foreground">
            <a href="/pricing" className="hover:text-foreground">Pricing</a>
            <a href="/" className="hover:text-foreground">Sign in</a>
          </nav>
        </div>
      </header>
      <article className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold mb-8 gradient-text">{title}</h1>
        <div className="prose prose-invert max-w-none space-y-4 text-foreground/90 leading-relaxed">
          {children}
        </div>
      </article>
      <PublicFooter />
    </main>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-white/10 mt-16 py-8 text-sm text-muted-foreground">
      <div className="max-w-4xl mx-auto px-6 flex flex-wrap gap-6 justify-between">
        <div>© {new Date().getFullYear()} Tamayzak. All rights reserved.</div>
        <nav className="flex flex-wrap gap-4">
          <a href="/pricing" className="hover:text-foreground">Pricing</a>
          <a href="/terms" className="hover:text-foreground">Terms</a>
          <a href="/privacy" className="hover:text-foreground">Privacy</a>
          <a href="/refund" className="hover:text-foreground">Refund Policy</a>
        </nav>
      </div>
    </footer>
  );
}