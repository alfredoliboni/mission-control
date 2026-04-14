"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import { isKnownFamilyEmail } from "@/lib/family-agents";
import Link from "next/link";

type SignupRole = "family" | "provider" | "stakeholder";

const SIGNUP_ROLES: { value: SignupRole; label: string; description: string; icon: string }[] = [
  { value: "family", label: "I'm a parent / family member", description: "Set up your child's profile and services", icon: "👨‍👩‍👧" },
  { value: "provider", label: "I'm a service provider", description: "Register your practice on our directory", icon: "🏥" },
  { value: "stakeholder", label: "I'm a doctor / therapist on a care team", description: "You'll need an invite link from a family", icon: "🩺" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [signupRole, setSignupRole] = useState<SignupRole>("family");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();

    if (mode === "signup") {
      // Provider role: redirect to provider registration instead of creating account here
      if (signupRole === "provider") {
        router.push("/portal/register");
        return;
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      setError(null);
      setMode("signin");
      setLoading(false);
      // Show confirmation message
      setError("Check your email to confirm your account, then sign in.");
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Redirect based on user role and stakeholder status
    const metadata = data.user?.user_metadata || {};
    const userEmail = data.user?.email;

    if (metadata.is_stakeholder || metadata.stakeholder_role) {
      // Providers/stakeholders who are on a care team -> team portal
      router.push("/team");
    } else if (metadata.role === "provider") {
      router.push("/portal/dashboard");
    } else if (metadata.role === "stakeholder") {
      router.push("/team");
    } else if (!isKnownFamilyEmail(userEmail) && !metadata.agent_id) {
      // Check if onboarding was completed but not synced (pending in localStorage)
      const pendingOnboarding = localStorage.getItem("onboarding-pending");
      if (pendingOnboarding) {
        try {
          const onboardingData = JSON.parse(pendingOnboarding);
          const res = await fetch("/api/onboarding", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(onboardingData),
          });
          if (res.ok) {
            localStorage.removeItem("onboarding-pending");
            router.push("/profile");
            router.refresh();
            return;
          }
        } catch {
          // If sync fails, still go to profile
        }
        router.push("/profile");
      } else {
        // Truly new user, no onboarding done
        router.push("/onboarding");
      }
    } else {
      router.push("/profile");
    }
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <span className="text-3xl" aria-hidden="true">🧭</span>
            <h1 className="font-heading text-2xl font-bold text-foreground">
              Mission Control
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Your family&apos;s autism services dashboard
          </p>
        </div>

        <Card className="border border-border">
          <CardHeader>
            <CardTitle className="text-lg font-heading font-semibold text-center">
              {mode === "signin" ? "Sign In" : "Create Account"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Role selector — only shown in signup mode */}
            {mode === "signup" && (
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-foreground mb-1.5">
                  I am...
                </legend>
                {SIGNUP_ROLES.map((role) => (
                  <label
                    key={role.value}
                    className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${
                      signupRole === role.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-warm-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="signupRole"
                      value={role.value}
                      checked={signupRole === role.value}
                      onChange={() => setSignupRole(role.value)}
                      className="mt-1 accent-primary"
                    />
                    <div>
                      <span className="mr-1.5 text-sm">{role.icon}</span>
                      <span className="text-sm font-medium text-foreground">
                        {role.label}
                      </span>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {role.description}
                      </p>
                    </div>
                  </label>
                ))}
              </fieldset>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Hide email/password fields for provider signup — they'll register on the portal */}
              {!(mode === "signup" && signupRole === "provider") && (
                <>
                  <div>
                    <label
                      htmlFor="email"
                      className="text-sm font-medium text-foreground block mb-1.5"
                    >
                      Email
                    </label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="password"
                      className="text-sm font-medium text-foreground block mb-1.5"
                    >
                      Password
                    </label>
                    <PasswordInput
                      id="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                </>
              )}

              {error && (
                <p className={`text-sm ${error.includes("Check your email") ? "text-status-success" : "text-status-blocked"}`}>
                  {error}
                </p>
              )}

              <Button
                type="submit"
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={loading}
              >
                {loading
                  ? "..."
                  : mode === "signup" && signupRole === "provider"
                    ? "Go to Provider Registration"
                    : mode === "signin"
                      ? "Sign In"
                      : "Create Account"}
              </Button>

              {mode === "signin" && (
                <p className="text-center text-xs text-muted-foreground">
                  <Link
                    href="/reset-password"
                    className="text-primary hover:underline font-medium"
                  >
                    Forgot password?
                  </Link>
                </p>
              )}
            </form>

            <p className="text-center text-xs text-muted-foreground">
              {mode === "signin" ? (
                <>
                  No account?{" "}
                  <button
                    type="button"
                    onClick={() => { setMode("signup"); setError(null); }}
                    className="text-primary hover:underline font-medium"
                  >
                    Create one
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => { setMode("signin"); setError(null); }}
                    className="text-primary hover:underline font-medium"
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>

            <div className="relative">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground">
                or
              </span>
            </div>

            <Button
              type="button"
              variant="ghost"
              className="w-full text-primary hover:text-primary/80"
              onClick={() => router.push("/onboarding")}
            >
              Get Started
              <span className="ml-2 text-muted-foreground text-xs">
                — set up your child&apos;s profile
              </span>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
