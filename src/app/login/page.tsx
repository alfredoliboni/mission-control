"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  const handleDemo = () => {
    document.cookie =
      "companion-demo=true; path=/; max-age=86400; samesite=lax";
    router.push("/dashboard");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();

    if (mode === "signup") {
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
    if (metadata.is_stakeholder || metadata.stakeholder_role) {
      // Providers/stakeholders who are on a care team → team portal
      router.push("/team");
    } else if (metadata.role === "provider") {
      router.push("/portal/dashboard");
    } else if (metadata.role === "stakeholder") {
      router.push("/team");
    } else {
      router.push("/dashboard");
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
            <form onSubmit={handleSubmit} className="space-y-4">
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
              variant="outline"
              className="w-full"
              onClick={handleDemo}
            >
              Try Demo
              <span className="ml-2 text-muted-foreground text-xs">
                — sample data, no login required
              </span>
            </Button>

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
