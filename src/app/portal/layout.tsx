export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      {/* Portal Header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl" aria-hidden="true">
              🧭
            </span>
            <div>
              <h1 className="font-heading text-lg font-bold text-foreground leading-tight">
                The Companion
              </h1>
              <p className="text-xs text-muted-foreground">Provider Portal</p>
            </div>
          </div>
        </div>
      </header>

      {/* Portal Content */}
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">{children}</main>

      {/* Portal Footer */}
      <footer className="border-t border-border bg-card mt-auto">
        <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6">
          <p className="text-xs text-muted-foreground text-center">
            The Companion &mdash; Navigating Ontario&apos;s autism services
            together
          </p>
        </div>
      </footer>
    </div>
  );
}
