"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink px-6">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-3xl font-semibold text-ivory mb-1">Marj</h1>
        <p className="text-muted text-sm mb-8">Log in to your account</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs text-muted mb-1.5 uppercase tracking-wide">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-surface border border-border rounded px-3 py-2.5 text-ivory text-sm focus:outline-none focus:border-brass"
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label className="block text-xs text-muted mb-1.5 uppercase tracking-wide">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-surface border border-border rounded px-3 py-2.5 text-ivory text-sm focus:outline-none focus:border-brass"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="text-rust text-sm bg-rust/10 border border-rust/30 rounded px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brass text-ink font-semibold text-sm rounded py-2.5 hover:bg-brassDim transition-colors disabled:opacity-60"
          >
            {loading ? "Logging in…" : "Log in"}
          </button>
        </form>

        <p className="text-muted text-sm mt-6 text-center">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-brass hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
