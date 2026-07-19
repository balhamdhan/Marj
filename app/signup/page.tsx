"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    // If email confirmation is required, there will be no session yet.
    if (data.session) {
      router.push("/dashboard");
    } else {
      setMessage(
        "Account created — check your email to confirm your address before logging in."
      );
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink px-6">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-3xl font-semibold text-ivory mb-1">Marj</h1>
        <p className="text-muted text-sm mb-8">Create your account</p>

        <form onSubmit={handleSignup} className="space-y-4">
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
              placeholder="At least 6 characters"
            />
          </div>

          <div>
            <label className="block text-xs text-muted mb-1.5 uppercase tracking-wide">
              Confirm password
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-surface border border-border rounded px-3 py-2.5 text-ivory text-sm focus:outline-none focus:border-brass"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="text-rust text-sm bg-rust/10 border border-rust/30 rounded px-3 py-2">
              {error}
            </div>
          )}
          {message && (
            <div className="text-emerald text-sm bg-emerald/10 border border-emerald/30 rounded px-3 py-2">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brass text-ink font-semibold text-sm rounded py-2.5 hover:bg-brassDim transition-colors disabled:opacity-60"
          >
            {loading ? "Creating account…" : "Sign up"}
          </button>
        </form>

        <p className="text-muted text-sm mt-6 text-center">
          Already have an account?{" "}
          <Link href="/login" className="text-brass hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
