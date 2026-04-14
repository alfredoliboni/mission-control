import Link from "next/link";
import { Shield, ChevronRight, Heart } from "lucide-react";

const FAQ = [
  {
    q: "How much does it cost for families?",
    a: "Free. The Companion is funded through government bulk licenses and provider subscriptions — families never pay.",
  },
  {
    q: "How does the AI navigator work?",
    a: "Your navigator is a personal AI agent that runs continuously. It searches for services, monitors deadlines, checks waitlists, and writes recommendations to your dashboard. You review and decide — the agent never acts without your approval.",
  },
  {
    q: "Is my family's data safe?",
    a: "Yes. All data is encrypted at rest and in transit, protected by row-level security policies, and compliant with PIPEDA (Canada's privacy law). Your data is never shared between families or with third parties.",
  },
  {
    q: "Who can see my child's information?",
    a: "Only you and the care team members you explicitly invite (doctors, therapists, schools). Each member sees only what you choose to share, and you can revoke access anytime.",
  },
  {
    q: "What if we're newly diagnosed?",
    a: "The Companion is especially valuable for newly diagnosed families. Your navigator immediately starts building your pathway — what benefits to apply for, which providers to contact, what programs are available while you wait.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl" aria-hidden="true">
              🧭
            </span>
            <span className="font-heading font-bold text-lg text-foreground">
              The Companion
            </span>
          </div>
          <Link
            href="/login"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign In
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* ── Hero ──────────────────────────────────────────── */}
        <section className="px-4 sm:px-6 pt-16 sm:pt-24 pb-16 sm:pb-20">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight tracking-tight">
              Your Family&apos;s AI Navigator
              <br />
              <span className="text-primary">for Autism Services</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Every child with autism deserves a dedicated guide through
              Ontario&apos;s complex service system. The Companion gives your
              family a personal AI navigator that works 24/7 — finding
              providers, tracking deadlines, and preparing recommendations
              while you focus on what matters most.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link
                href="/onboarding"
                className="inline-flex items-center justify-center rounded-lg bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground hover:bg-primary/90 transition-colors w-full sm:w-auto"
              >
                Get Started
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-lg border-2 border-border px-8 py-3.5 text-base font-semibold text-foreground hover:bg-warm-100 transition-colors w-full sm:w-auto"
              >
                Sign In
              </Link>
            </div>
          </div>
        </section>

        {/* ── How It Works ─────────────────────────────────── */}
        <section className="px-4 sm:px-6 py-16 sm:py-20 bg-warm-100/50">
          <div className="max-w-5xl mx-auto">
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-foreground text-center mb-12">
              How It Works
            </h2>
            <div className="grid sm:grid-cols-3 gap-8 sm:gap-10">
              <div className="text-center space-y-3">
                <div className="text-4xl mb-2">🧒</div>
                <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  1
                </div>
                <h3 className="font-heading font-semibold text-lg text-foreground">
                  Tell Us About Your Child
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Complete a simple onboarding to share your child&apos;s needs,
                  interests, and where you are in the journey.
                </p>
              </div>
              <div className="text-center space-y-3">
                <div className="text-4xl mb-2">🤖</div>
                <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  2
                </div>
                <h3 className="font-heading font-semibold text-lg text-foreground">
                  Your Navigator Gets to Work
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Your personal AI agent researches providers, monitors
                  deadlines, identifies benefits, and prepares recommendations
                  specific to your family.
                </p>
              </div>
              <div className="text-center space-y-3">
                <div className="text-4xl mb-2">📊</div>
                <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  3
                </div>
                <h3 className="font-heading font-semibold text-lg text-foreground">
                  See Everything in One Place
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Your Mission Control dashboard shows everything your navigator
                  found — providers matched to your child, upcoming deadlines,
                  available programs, and financial supports.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Feature Cards ────────────────────────────────── */}
        <section className="px-4 sm:px-6 py-16 sm:py-20">
          <div className="max-w-5xl mx-auto">
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-foreground text-center mb-12">
              What Your Navigator Does
            </h2>
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="bg-card rounded-xl border border-border p-6 sm:p-8 space-y-3">
                <div className="text-3xl">🏥</div>
                <h3 className="font-heading font-semibold text-lg text-foreground">
                  Provider Matching
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Your navigator searches for therapists, clinics, and
                  specialists near you. It ranks them by fit — considering your
                  child&apos;s needs, waitlists, OAP funding, and location.
                </p>
              </div>
              <div className="bg-card rounded-xl border border-border p-6 sm:p-8 space-y-3">
                <div className="text-3xl">🚨</div>
                <h3 className="font-heading font-semibold text-lg text-foreground">
                  Proactive Alerts
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Never miss a deadline. Your navigator monitors OAP timelines,
                  benefit renewals, assessment dates, and program registrations.
                </p>
              </div>
              <div className="bg-card rounded-xl border border-border p-6 sm:p-8 space-y-3">
                <div className="text-3xl">💰</div>
                <h3 className="font-heading font-semibold text-lg text-foreground">
                  Benefits Tracking
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  DTC, CDB, OAP, RDSP, ACSD — your navigator knows every
                  financial support available and tracks your application status.
                </p>
              </div>
              <div className="bg-card rounded-xl border border-border p-6 sm:p-8 space-y-3">
                <div className="text-3xl">🗺️</div>
                <h3 className="font-heading font-semibold text-lg text-foreground">
                  Journey Pathway
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  See exactly where your family is in the autism services journey
                  and what comes next. Clear stages with actionable next steps.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Who It's For ─────────────────────────────────── */}
        <section className="px-4 sm:px-6 py-16 sm:py-20 bg-warm-100/50">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">
              Built for Ontario Families
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              For families navigating the Ontario autism services system —
              whether you&apos;re newly diagnosed or transitioning to adult
              services.
            </p>
          </div>
        </section>

        {/* ── For Providers ───────────────────────────────── */}
        <section className="px-4 sm:px-6 py-16 sm:py-20">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">
              Are you a Service Provider?
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Therapists, clinics, and community organizations can register
              to be matched with families who need your services.
            </p>
            <Link
              href="/portal/register"
              className="inline-flex items-center justify-center rounded-lg border-2 border-primary px-8 py-3 text-base font-semibold text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              Register as a Provider
            </Link>
          </div>
        </section>

        {/* ── For Universities ───────────────────────────── */}
        <section className="px-4 sm:px-6 py-16 sm:py-20 bg-warm-100/50">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">
              🎓 Universities
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Register your institution to be matched with neurodiverse students
              seeking accommodations and support programs.
            </p>
            <Link
              href="/portal/university"
              className="inline-flex items-center justify-center rounded-lg border-2 border-primary px-8 py-3 text-base font-semibold text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              Register as a University
            </Link>
          </div>
        </section>

        {/* ── Testimonial ─────────────────────────────────── */}
        <section className="px-4 sm:px-6 py-16 sm:py-20">
          <div className="max-w-3xl mx-auto text-center">
            <div className="text-4xl mb-4">&ldquo;</div>
            <blockquote className="text-lg sm:text-xl font-heading font-medium text-foreground leading-relaxed mb-6">
              I was drowning in paperwork — OAP forms, DTC applications, waitlists for
              three different therapists. The Companion organized everything into one
              dashboard and even found a free sensory play program we didn&apos;t know existed.
              For the first time since the diagnosis, I feel like someone has our back.
            </blockquote>
            <div className="flex items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Heart className="h-4 w-4 text-primary" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-foreground">Maria S.</p>
                <p className="text-xs text-muted-foreground">
                  Mother of Alex, age 4 — London, Ontario
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Security & Privacy ──────────────────────────── */}
        <section className="px-4 sm:px-6 py-16 sm:py-20 bg-foreground text-background">
          <div className="max-w-5xl mx-auto">
            <div className="grid sm:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-background/10">
                  <Shield className="h-6 w-6" />
                </div>
                <h2 className="font-heading text-2xl sm:text-3xl font-bold">
                  Your family&apos;s data is sacred
                </h2>
                <p className="text-background/70 leading-relaxed">
                  We handle sensitive information about children with autism.
                  That responsibility shapes every technical decision we make.
                </p>
              </div>
              <div className="space-y-4">
                {[
                  "End-to-end encryption at rest and in transit",
                  "Row-level security — each family's data is isolated",
                  "PIPEDA-compliant (Canadian privacy law)",
                  "You control who sees what — revoke access anytime",
                  "No data shared between families or with third parties",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <div className="mt-1 w-5 h-5 rounded-full bg-status-success/20 flex items-center justify-center shrink-0">
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-status-success" />
                      </svg>
                    </div>
                    <span className="text-sm text-background/80">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ ─────────────────────────────────────────── */}
        <section className="px-4 sm:px-6 py-16 sm:py-20 bg-warm-100/50">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-foreground text-center mb-10">
              Frequently Asked Questions
            </h2>
            <div className="space-y-3">
              {FAQ.map((faq) => (
                <details
                  key={faq.q}
                  className="group bg-card border border-border rounded-xl overflow-hidden"
                >
                  <summary className="px-6 py-4 cursor-pointer flex items-center justify-between text-[15px] font-semibold text-foreground hover:text-primary transition-colors list-none">
                    {faq.q}
                    <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90 shrink-0 ml-4" />
                  </summary>
                  <div className="px-6 pb-5 text-sm text-muted-foreground leading-relaxed">
                    {faq.a}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── Final CTA ────────────────────────────────────── */}
        <section className="px-4 sm:px-6 py-20 sm:py-28">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-foreground">
              Ready to see your Mission Control?
            </h2>
            <Link
              href="/onboarding"
              className="inline-flex items-center justify-center rounded-lg bg-primary px-10 py-4 text-lg font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Get Started Free
            </Link>
          </div>
        </section>
      </main>

      {/* ── Footer ───────────────────────────────────────── */}
      <footer className="border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-sm text-muted-foreground">
            The Companion — Made with ❤️ for Ontario families
          </p>
        </div>
      </footer>
    </div>
  );
}
