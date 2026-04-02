"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/components/providers/AuthProvider";
import { Mail, Loader2 } from "lucide-react";

type Mode = "password" | "magic-link";

export default function LoginPage() {
  const router = useRouter();
  const { signIn, signInWithOtp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<Mode>("password");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const handleDemo = () => {
    document.cookie = "companion-demo=true; path=/; max-age=86400; samesite=lax";
    router.push("/dashboard");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === "magic-link") {
      const { error } = await signInWithOtp(email);
      setLoading(false);
      if (error) {
        setError(error);
      } else {
        setMagicLinkSent(true);
      }
      return;
    }

    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      setError(error);
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <span className="text-3xl" aria-hidden="true">
              🧭
            </span>
            <h1 className="font-heading text-2xl font-bold text-foreground">
              Mission Control
            </h1>
          </div>
          <p className="text-sm text-warm-400">
            Your family&apos;s autism services dashboard
          </p>
        </div>

        {/* Login card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-heading text-center">
              Sign In
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {magicLinkSent ? (
              <div className="text-center space-y-3 py-4">
                <Mail className="h-10 w-10 text-primary mx-auto" />
                <p className="text-sm font-medium text-foreground">
                  Check your email
                </p>
                <p className="text-xs text-warm-400">
                  We sent a sign-in link to <strong>{email}</strong>.
                  <br />
                  Click the link in the email to sign in.
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setMagicLinkSent(false);
                    setMode("password");
                  }}
                >
                  Back to sign in
                </Button>
              </div>
            ) : (
              <>
                <form onSubmit={handleLogin} className="space-y-4">
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

                  {mode === "password" && (
                    <div>
                      <label
                        htmlFor="password"
                        className="text-sm font-medium text-foreground block mb-1.5"
                      >
                        Password
                      </label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                  )}

                  {error && (
                    <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                      {error}
                    </p>
                  )}

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {mode === "magic-link" ? "Send Magic Link" : "Sign In"}
                  </Button>
                </form>

                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === "password" ? "magic-link" : "password");
                    setError(null);
                  }}
                  className="w-full text-xs text-primary hover:text-primary/80 text-center"
                >
                  {mode === "password"
                    ? "Sign in with magic link instead"
                    : "Sign in with password instead"}
                </button>
              </>
            )}

            <div className="relative">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-warm-400">
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
              <span className="ml-2 text-warm-400 text-xs">
                — sample data, no login required
              </span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full text-primary hover:text-primary/80"
              onClick={() => router.push("/signup")}
            >
              Create Account
              <span className="ml-2 text-warm-400 text-xs">
                — parents, providers, schools
              </span>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
