"use client";

import { useState } from "react";
import {
  startRegistration,
  startAuthentication,
} from "@simplewebauthn/browser";

async function getOptions(path: string) {
  const res = await fetch(path, { method: "GET" });
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(`Failed to fetch options: ${res.status} ${msg}`);
  }
  // API returns the options object (not wrapped)
  const opts = await res.json();
  // we also expose challenge in a header (nice to forward back on verify)
  const challenge =
    res.headers.get("x-webauthn-challenge") ?? (opts as any).challenge ?? "";
  return { options: opts, challenge };
}

export default function PasskeysPage() {
  const [status, setStatus] = useState<string>("");

  async function register() {
    try {
      setStatus("Requesting options…");
      const { options, challenge } = await getOptions(
        "/api/webauthn/generate-registration-options"
      );

      setStatus("Creating credential…");
      const att = await startRegistration(options);

      setStatus("Verifying…");
      const res = await fetch("/api/webauthn/verify-registration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-webauthn-challenge": challenge,
        },
        body: JSON.stringify(att),
      });

      if (!res.ok) throw new Error(await res.text());
      setStatus("✅ Registered passkey");
    } catch (e: any) {
      setStatus(`❌ ${e?.message ?? e}`);
    }
  }

  async function authenticate() {
    try {
      setStatus("Auth options…");
      const { options, challenge } = await getOptions(
        "/api/webauthn/generate-authentication-options"
      );

      setStatus("Requesting assertion…");
      const assertion = await startAuthentication(options);

      setStatus("Verifying…");
      const res = await fetch("/api/webauthn/verify-authentication", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-webauthn-challenge": challenge,
        },
        body: JSON.stringify(assertion),
      });

      if (!res.ok) throw new Error(await res.text());
      setStatus("✅ Authenticated");
    } catch (e: any) {
      setStatus(`❌ ${e?.message ?? e}`);
    }
  }

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Passkeys</h1>
      <div className="c-card p-6 grid gap-4">
        <p className="text-stone-600">
          Register a passkey on <span className="font-medium">localhost</span>,
          then try authenticating.
        </p>
        <div className="flex gap-3">
          <button onClick={register} className="c-btn-primary">Register</button>
          <button onClick={authenticate} className="c-btn-ghost">Authenticate</button>
        </div>
        {status && <div className="text-sm text-stone-700">{status}</div>}
      </div>
    </div>
  );
}
