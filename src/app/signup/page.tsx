"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth, type UserRole } from "@/components/providers/AuthProvider";
import { Loader2, Mail } from "lucide-react";

const ROLES: { value: UserRole; label: string }[] = [
  { value: "parent", label: "Parent / Guardian" },
  { value: "provider", label: "Service Provider" },
  { value: "school", label: "School Staff" },
  { value: "therapist", label: "Therapist" },
];

export default function SignUpPage() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<UserRole>("parent");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    document.title = "Sign Up — Mission Control";
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await signUp(email, password, {
      full_name: fullName,
      role,
    });

    setLoading(false);
    if (error) {
      setError(error);
    } else {
      setSuccess(true);
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
            Create your account
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-heading text-center">
              Sign Up
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {success ? (
              <div className="text-center space-y-3 py-4">
                <Mail className="h-10 w-10 text-primary mx-auto" />
                <p className="text-sm font-medium text-foreground">
                  Check your email
                </p>
                <p className="text-xs text-warm-400">
                  We sent a confirmation link to <strong>{email}</strong>.
                  <br />
                  Click the link to activate your account.
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/login")}
                >
                  Back to sign in
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="fullName"
                    className="text-sm font-medium text-foreground block mb-1.5"
                  >
                    Full Name
                  </label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="signupEmail"
                    className="text-sm font-medium text-foreground block mb-1.5"
                  >
                    Email
                  </label>
                  <Input
                    id="signupEmail"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="signupPassword"
                    className="text-sm font-medium text-foreground block mb-1.5"
                  >
                    Password
                  </label>
                  <Input
                    id="signupPassword"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>

                <div>
                  <label
                    htmlFor="role"
                    className="text-sm font-medium text-foreground block mb-1.5"
                  >
                    I am a...
                  </label>
                  <select
                    id="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                {error && (
                  <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Account
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-primary hover:text-primary/80"
                  onClick={() => router.push("/login")}
                >
                  Already have an account? Sign in
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
