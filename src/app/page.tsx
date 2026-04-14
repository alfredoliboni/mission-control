import Link from "next/link";
import {
  Search,
  Bell,
  Shield,
  Clock,
  MapPin,
  FileText,
  MessageSquare,
  ChevronRight,
  Heart,
  Users,
  Bot,
  ArrowRight,
} from "lucide-react";

const STATS = [
  { value: "24/7", label: "Your navigator never sleeps" },
  { value: "50+", label: "Ontario programs tracked" },
  { value: "6", label: "Benefits monitored per family" },
  { value: "<2min", label: "Average alert response time" },
];

const FEATURES = [
  {
    icon: Search,
    title: "Provider Matching",
    description:
      "Searches therapists, clinics, and specialists near you. Ranks by fit — considering your child's needs, waitlists, OAP funding, and location.",
    accent: "bg-primary/8 text-primary",
  },
  {
    icon: Bell,
    title: "Proactive Alerts",
    description:
      "Never miss a deadline. Monitors OAP timelines, benefit renewals, assessment dates, and program registrations — alerts you before it's too late.",
    accent: "bg-status-caution/10 text-status-caution",
  },
  {
    icon: FileText,
    title: "Benefits Tracking",
    description:
      "DTC, CDB, OAP, RDSP, ACSD — knows every financial support available and tracks your application status from submitted to approved.",
    accent: "bg-status-success/10 text-status-success",
  },
  {
    icon: MapPin,
    title: "Journey Pathway",
    description:
      "See exactly where your family is in the autism services journey and what comes next. Clear stages with actionable steps — no more guessing.",
    accent: "bg-status-current/10 text-status-current",
  },
  {
    icon: MessageSquare,
    title: "Care Team Hub",
    description:
      "Doctors, therapists, and schools upload documents and communicate through one secure portal. Everyone on the same page.",
    accent: "bg-status-gap-filler/10 text-status-gap-filler",
  },
  {
    icon: Clock,
    title: "Gap Fillers",
    description:
      "While you wait for funded therapy, your navigator finds free workshops, research studies, and community programs to fill the gaps.",
    accent: "bg-primary/8 text-primary",
  },
];

const JOURNEY_STEPS = [
  { emoji: "🧒", title: "Tell us about your child", description: "Simple onboarding — share needs, interests, and where you are in the journey." },
  { emoji: "🤖", title: "Your Navigator gets to work", description: "Researches providers, monitors deadlines, identifies benefits — 24/7, in the background." },
  { emoji: "📊", title: "See everything in one place", description: "Your Mission Control dashboard shows everything found — matched providers, deadlines, programs, financial supports." },
];

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
            <span className="text-2xl" aria-hidden="true">🧭</span>
            <span className="font-heading font-bold text-lg text-foreground">
              The Companion
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* ── Hero ──────────────────────────────────────────── */}
        <section className="px-4 sm:px-6 pt-16 sm:pt-28 pb-16 sm:pb-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] to-transparent pointer-events-none" />
          <div className="max-w-4xl mx-auto text-center space-y-8 relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
              <Bot className="h-3.5 w-3.5" />
              Powered by AI agents working 24/7 for your family
            </div>
            <h1 className="font-heading text-4xl sm:text-5xl lg:text-[3.5rem] font-bold text-foreground leading-[1.1] tracking-tight">
              Stop navigating Ontario&apos;s
              <br className="hidden sm:block" />
              autism services{" "}
              <span className="text-primary">alone</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Your family gets a personal AI navigator that works around the clock —
              finding providers, tracking benefits, monitoring deadlines, and preparing
              recommendations while you focus on what matters most.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <Link
                href="/onboarding"
                className="group inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-4 text-base font-semibold text-primary-foreground hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 w-full sm:w-auto"
              >
                Get Started
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-xl border-2 border-border px-8 py-4 text-base font-semibold text-foreground hover:bg-warm-100 transition-colors w-full sm:w-auto"
              >
                Sign In
              </Link>
            </div>
          </div>
        </section>

        {/* ── Stats Bar ────────────────────────────────────── */}
        <section className="border-y border-border bg-card">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl sm:text-3xl font-bold text-primary font-heading">
                  {stat.value}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── How It Works ─────────────────────────────────── */}
        <section className="px-4 sm:px-6 py-20 sm:py-28">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <p className="text-sm font-semibold uppercase tracking-wider text-primary mb-3">
                How It Works
              </p>
              <h2 className="font-heading text-3xl sm:text-4xl font-bold text-foreground">
                Three steps to peace of mind
              </h2>
            </div>
            <div className="grid sm:grid-cols-3 gap-10 sm:gap-12">
              {JOURNEY_STEPS.map((step, i) => (
                <div key={step.title} className="relative text-center space-y-4">
                  <div className="text-5xl mb-2">{step.emoji}</div>
                  <div className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                    {i + 1}
                  </div>
                  <h3 className="font-heading font-semibold text-lg text-foreground">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {step.description}
                  </p>
                  {i < 2 && (
                    <ChevronRight className="hidden sm:block absolute -right-6 top-16 h-5 w-5 text-border" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Features Grid ───────────────────────────────── */}
        <section className="px-4 sm:px-6 py-20 sm:py-28 bg-warm-100/40">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <p className="text-sm font-semibold uppercase tracking-wider text-primary mb-3">
                Your Navigator&apos;s Toolkit
              </p>
              <h2 className="font-heading text-3xl sm:text-4xl font-bold text-foreground">
                Everything your family needs, in one place
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {FEATURES.map((feature) => (
                <div
                  key={feature.title}
                  className="bg-card rounded-2xl border border-border p-6 sm:p-7 space-y-4 hover:shadow-lg hover:-translate-y-0.5 transition-all"
                >
                  <div className={`inline-flex items-center justify-center w-11 h-11 rounded-xl ${feature.accent}`}>
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-heading font-semibold text-lg text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Testimonial ─────────────────────────────────── */}
        <section className="px-4 sm:px-6 py-20 sm:py-28">
          <div className="max-w-3xl mx-auto text-center">
            <div className="text-5xl mb-6">&ldquo;</div>
            <blockquote className="text-xl sm:text-2xl font-heading font-medium text-foreground leading-relaxed mb-8">
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
                  "Open source — audit the code yourself",
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

        {/* ── For Providers & Universities ────────────────── */}
        <section className="px-4 sm:px-6 py-20 sm:py-28">
          <div className="max-w-5xl mx-auto grid sm:grid-cols-2 gap-6">
            <div className="bg-card rounded-2xl border border-border p-8 sm:p-10 space-y-4 hover:shadow-lg transition-shadow">
              <div className="text-3xl">🏥</div>
              <h3 className="font-heading text-xl font-bold text-foreground">
                Are you a Service Provider?
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Therapists, clinics, and community organizations — register to be
                matched with families who need your services. Verified providers
                get priority placement and real-time analytics.
              </p>
              <Link
                href="/portal/register"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
              >
                Register as a Provider <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="bg-card rounded-2xl border border-border p-8 sm:p-10 space-y-4 hover:shadow-lg transition-shadow">
              <div className="text-3xl">🎓</div>
              <h3 className="font-heading text-xl font-bold text-foreground">
                Universities & Employers
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Register your institution to be matched with neurodiverse students
                and job seekers. Showcase your accommodations and support programs
                to families planning transitions.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/portal/university"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
                >
                  University Portal <ChevronRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/portal/employer"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
                >
                  Employer Portal <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ ─────────────────────────────────────────── */}
        <section className="px-4 sm:px-6 py-20 sm:py-28 bg-warm-100/40">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <p className="text-sm font-semibold uppercase tracking-wider text-primary mb-3">
                Questions & Answers
              </p>
              <h2 className="font-heading text-3xl sm:text-4xl font-bold text-foreground">
                Everything you need to know
              </h2>
            </div>
            <div className="space-y-4">
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
        <section className="px-4 sm:px-6 py-24 sm:py-32">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight">
              Ready to see your
              <br />
              <span className="text-primary">Mission Control?</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Join families across Ontario who already have a personal AI navigator
              working around the clock for their child.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/onboarding"
                className="group inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-10 py-4 text-lg font-semibold text-primary-foreground hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 w-full sm:w-auto"
              >
                <Users className="h-5 w-5" />
                Get Started Free
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-border px-10 py-4 text-lg font-semibold text-foreground hover:bg-warm-100 transition-colors w-full sm:w-auto"
              >
                Sign In
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ───────────────────────────────────────── */}
      <footer className="border-t border-border bg-card py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid sm:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg" aria-hidden="true">🧭</span>
                <span className="font-heading font-bold text-foreground">The Companion</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                AI-powered navigation for Ontario families
                of children with autism. Free for families, always.
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                For Families
              </p>
              <div className="space-y-2 text-sm">
                <Link href="/onboarding" className="block text-muted-foreground hover:text-foreground transition-colors">Get Started</Link>
                <Link href="/login" className="block text-muted-foreground hover:text-foreground transition-colors">Sign In</Link>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                For Providers
              </p>
              <div className="space-y-2 text-sm">
                <Link href="/portal/register" className="block text-muted-foreground hover:text-foreground transition-colors">Register</Link>
                <Link href="/portal/university" className="block text-muted-foreground hover:text-foreground transition-colors">University Portal</Link>
                <Link href="/portal/employer" className="block text-muted-foreground hover:text-foreground transition-colors">Employer Portal</Link>
              </div>
            </div>
          </div>
          <div className="border-t border-border pt-6 text-center">
            <p className="text-xs text-muted-foreground">
              The Companion — Made with <Heart className="inline h-3 w-3 text-primary" /> for Ontario families
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
