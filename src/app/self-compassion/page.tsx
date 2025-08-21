"use client";
import { SelfCompassionPro } from "@/components/self-compassion";
import { useRouter } from "next/navigation";

export default function SelfCompassionPage() {
  const router = useRouter();
  return (
    <section className="grid gap-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Self-compassion</h1>
          <p className="text-neutral-500 mt-1">Respond to struggle with kindness.</p>
        </div>
        <button className="btn btn-ghost" onClick={()=>router.push("/dashboard")}>← Back to dashboard</button>
      </div>
      <SelfCompassionPro />
    </section>
  );
}
