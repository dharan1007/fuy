"use client";

import { useState } from "react";
import {
  startRegistration,
  startAuthentication,
} from "@simplewebauthn/browser";
import dynamic from "next/dynamic";
const ScrollStarfield = dynamic(() => import("@/components/ScrollStarfield"), { ssr: false });
import Link from "next/link";

async function getOptions(path: string) {
  const res = await fetch(path, { method: "GET" });
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(`Failed to fetch options: ${res.status} ${msg}`);
  }
  const opts = await res.json();
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
      const { loginUrl } = await res.json();

      setStatus("Finalizing session...");
      if (loginUrl) {
        window.location.href = loginUrl;
      } else {
        throw new Error("Failed to generate session link");
      }
    } catch (e: any) {
      setStatus(`❌ ${e?.message ?? e}`);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative text-white">
      <ScrollStarfield variant="default" />
      <div className="w-full max-w-md relative z-10">
        <div className="bg-white/5 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500 mb-2">
              Passkeys
            </h1>
            <p className="text-sm text-gray-300">
              Secure, passwordless sign-in.
            </p>
          </div>

          <p className="text-sm text-center text-white/70 bg-white/5 p-3 rounded-lg border border-white/10">
            Link a passkey to your account for faster, safer access.
          </p>

          <div className="space-y-4 pt-2">
            <button
              onClick={register}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Register New Passkey
            </button>

            <button
              onClick={authenticate}
              className="w-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              Authenticate with Passkey
            </button>
          </div>

          {status && (
            <div className={`mt-4 p-3 rounded-lg text-sm text-center border ${status.includes("❌")
              ? "bg-red-500/10 border-red-500/30 text-red-200"
              : status.includes("✅")
                ? "bg-green-500/10 border-green-500/30 text-green-200"
                : "bg-blue-500/10 border-blue-500/30 text-blue-200"
              }`}>
              {status}
            </div>
          )}

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-transparent px-2 text-white/40">Navigation</span>
            </div>
          </div>

          <Link
            href="/login"
            className="block text-center text-sm text-white/60 hover:text-white transition-colors"
          >
            ← Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
