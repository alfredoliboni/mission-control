import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl" aria-hidden="true">
              &#x1F9ED;
            </span>
            <span className="font-heading font-bold text-lg text-foreground">
              The Companion
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/demo"
              className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              See Demo
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-2xl text-center space-y-6">
          <h1 className="font-heading text-4xl sm:text-5xl font-bold text-foreground leading-tight">
            Mission Control for
            <br />
            <span className="text-primary">Your Family&apos;s Journey</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            An AI-powered dashboard that navigates Ontario&apos;s autism
            services for you. Track your pathway, discover programs, and never
            miss a deadline.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/demo"
              className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-base font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Try the Demo
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-lg border border-border px-6 py-3 text-base font-medium text-foreground hover:bg-warm-100 transition-colors"
            >
              Sign In
            </Link>
          </div>

          <div className="grid sm:grid-cols-3 gap-6 pt-12 text-left">
            <div className="space-y-2">
              <p className="text-2xl" aria-hidden="true">
                &#x1F5FA;&#xFE0F;
              </p>
              <h3 className="font-heading font-semibold text-foreground">
                Visual Pathway
              </h3>
              <p className="text-sm text-muted-foreground">
                See exactly where you are in the journey, what&apos;s next, and
                what&apos;s blocked.
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-2xl" aria-hidden="true">
                &#x1F3F7;&#xFE0F;
              </p>
              <h3 className="font-heading font-semibold text-foreground">
                Gap Fillers
              </h3>
              <p className="text-sm text-muted-foreground">
                Free programs and resources to use while waiting for funded
                services.
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-2xl" aria-hidden="true">
                &#x1F6A8;
              </p>
              <h3 className="font-heading font-semibold text-foreground">
                Proactive Alerts
              </h3>
              <p className="text-sm text-muted-foreground">
                Your AI agent monitors deadlines, discovers programs, and flags
                what needs attention.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
