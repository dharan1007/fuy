"use client";

import { useEffect } from "react";

export default function useKeyDown(handler: (e: KeyboardEvent) => void): void {
  useEffect(() => {
    const on = (e: KeyboardEvent) => handler(e);
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [handler]);
}
