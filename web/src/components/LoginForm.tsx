"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ArrowRight, Loader2, LockKeyhole } from "lucide-react";

export default function LoginForm() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error: loginError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (loginError) {
        setError("Nesprávný e-mail nebo heslo.");
        return;
      }

      router.replace("/platform");
      router.refresh();
    } catch {
      setError("Přihlášení se nepodařilo. Zkus to znovu.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="login-form">
      <div className="login-icon">
        <LockKeyhole size={20} strokeWidth={1.7} />
      </div>

      <div className="login-heading">
        <h1>Welcome back.</h1>
        <p>Sign in to access your Sprintuy workspace.</p>
      </div>

      <div className="form-fields">
        <div className="field">
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="field">
          <div className="field-label">
            <label htmlFor="password">Password</label>
          </div>

          <input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
      </div>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <button
        className="login-button"
        type="submit"
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 size={17} className="animate-spin" />
            Signing in...
          </>
        ) : (
          <>
            Sign in
            <ArrowRight size={17} />
          </>
        )}
      </button>

      <p className="login-footer">
        Private workspace · Authorized access only
      </p>
    </form>
  );
}