"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AweRoutesRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/hopin");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <p className="text-gray-600">Redirecting to Hopin...</p>
      </div>
    </div>
  );
}
