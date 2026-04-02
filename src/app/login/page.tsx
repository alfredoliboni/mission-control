"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleDemo = () => {
    document.cookie = "companion-demo=true; path=/; max-age=86400; samesite=lax";
    router.push("/dashboard");
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Supabase auth would go here
    // For now, redirect to demo
    handleDemo();
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
                />
              </div>
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
                />
              </div>
              <Button type="submit" className="w-full">
                Sign In
              </Button>
            </form>

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
              onClick={() => router.push("/onboarding")}
            >
              Get Started
              <span className="ml-2 text-warm-400 text-xs">
                — set up your child&apos;s profile
              </span>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
