"use client";

import { useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/db/supabase";

type AuthPanelProps = {
  authMessage: string;
};

export function AuthPanel({ authMessage }: AuthPanelProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState(authMessage);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const client = getSupabaseBrowserClient();
    if (!client) {
      setStatus("error");
      setMessage("Supabase is not configured yet. Add env vars first.");
      return;
    }

    setStatus("sending");
    setMessage("Sending magic link...");

    const { error } = await client.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    setStatus("sent");
    setMessage(`Magic link sent to ${email}. Open it on this browser to sign in.`);
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-10 sm:px-6">
      <div className="w-full overflow-hidden rounded-[36px] border border-white/40 bg-[linear-gradient(140deg,#184f45_0%,#10322c_55%,#0c211d_100%)] text-white shadow-[0_30px_80px_rgba(13,40,35,0.26)]">
        <div className="grid gap-8 px-6 py-8 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:px-10 lg:py-10">
          <div className="space-y-5">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/58">Supabase auth</p>
            <h1 className="font-serif text-4xl leading-tight sm:text-5xl">
              Sign in to save your household dashboard securely.
            </h1>
            <p className="text-sm leading-7 text-white/72 sm:text-base">
              This app now supports Supabase-backed login. Once you sign in, your data is scoped to your
              account and protected by row-level security in the database.
            </p>
            <div className="rounded-[28px] border border-white/12 bg-white/8 p-4 text-sm leading-7 text-white/80">
              <p>{message}</p>
              <p className="mt-2">
                If this is your first time signing in, the app will create a default household for you
                automatically after login.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="rounded-[30px] border border-white/12 bg-white/10 p-5 backdrop-blur">
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/58">Magic link sign-in</p>
                <p className="mt-2 text-sm leading-7 text-white/74">
                  Enter your email and Supabase will send you a sign-in link.
                </p>
              </div>

              <label className="grid gap-2 text-sm">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/62">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  className="h-12 rounded-2xl border border-white/12 bg-white/92 px-4 text-sm text-[#10322c] outline-none transition focus:border-white focus:ring-2 focus:ring-white/20"
                  placeholder="you@example.com"
                />
              </label>

              <button
                type="submit"
                disabled={status === "sending" || email.length === 0}
                className="w-full rounded-full bg-[#f3c97f] px-5 py-3 text-sm font-semibold text-[#10322c] transition hover:bg-[#efbd63] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {status === "sending" ? "Sending..." : "Send magic link"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
