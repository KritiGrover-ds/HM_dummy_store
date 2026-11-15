"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const DEMO_EMAIL = "member@hm.com";
const DEMO_PASSWORD = "hmindia2026";

export default function AuthForm({ mode, next }: { mode: "login" | "register"; next: string }) {
  const router = useRouter();
  const { login, register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/profile";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = mode === "login" ? await login(email, password) : await register({ name, email, password, phone });
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "Something went wrong");
      return;
    }
    router.push(safeNext);
    router.refresh();
  }

  function fillDemo() {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    if (mode === "register") {
      setName("Aanya Sharma");
      setPhone("+91 98765 43210");
    }
  }

  async function demoSignIn() {
    setBusy(true);
    setError(null);
    const result = await login(DEMO_EMAIL, DEMO_PASSWORD);
    setBusy(false);
    if (!result.ok) setError(result.error ?? "Demo sign in failed");
    else {
      router.push(safeNext);
      router.refresh();
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <h1 className="text-center text-2xl font-semibold">{mode === "login" ? "Sign in" : "Become an H&M Member"}</h1>
      <p className="mt-2 text-center text-sm text-neutral-600">
        {mode === "login"
          ? "Become a member — don’t miss out on deals, offers, discounts and bonus vouchers."
          : "Join for free: 50 welcome points, free delivery above ₹1,999 and a 10% member promo."}
      </p>

      <div className="mt-6 bg-[#faf9f8] p-4 text-sm">
        <p className="font-semibold">Demo account</p>
        <p className="text-xs text-neutral-600">member@hm.com · hmindia2026</p>
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={fillDemo} className="flex-1 border border-black px-3 py-2 text-xs font-semibold uppercase tracking-wider">
            Fill Demo H&amp;M Member (member@hm.com)
          </button>
          {mode === "login" && (
            <button type="button" onClick={demoSignIn} disabled={busy} className="bg-black px-3 py-2 text-xs font-semibold uppercase tracking-wider text-white disabled:opacity-50">
              1-click sign in
            </button>
          )}
        </div>
      </div>

      <form onSubmit={submit} className="mt-6 space-y-4">
        {mode === "register" && (
          <>
            <Field label="Full name" value={name} onChange={setName} autoComplete="name" required />
            <Field label="Mobile number (optional)" value={phone} onChange={setPhone} type="tel" autoComplete="tel" />
          </>
        )}
        <Field label="Email" value={email} onChange={setEmail} type="email" autoComplete="email" required />
        <Field
          label={mode === "register" ? "Create password (min 8 characters)" : "Password"}
          value={password}
          onChange={setPassword}
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          required
        />
        {error && <p className="bg-[#fff1f1] p-3 text-xs text-[#b0000c]">{error}</p>}
        <button disabled={busy} className="w-full bg-black py-3.5 text-xs font-semibold uppercase tracking-wider text-white disabled:opacity-50">
          {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Become a member"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm">
        {mode === "login" ? (
          <>Not a member yet? <Link href={`/register?next=${encodeURIComponent(safeNext)}`} className="font-semibold underline">Become a member</Link></>
        ) : (
          <>Already a member? <Link href={`/login?next=${encodeURIComponent(safeNext)}`} className="font-semibold underline">Sign in</Link></>
        )}
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-xs">
      <span className="font-semibold">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required={required}
        className="mt-1 w-full border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-black"
      />
    </label>
  );
}
