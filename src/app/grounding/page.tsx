
import { auth } from "@/lib/auth";
import StressMapSection from "@/components/grounding/StressMapSection";
import WorkoutSection from "@/components/grounding/WorkoutSection";
import HealthSection from "@/components/grounding/HealthSection";
import DietSection from "@/components/grounding/DietSection";
import { redirect } from "next/navigation";

// Space Background Wrapper
function SpaceBackground({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-black text-white font-sans selection:bg-white/20">
      {/* Stars / Dust (Static or CSS animation) */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-40"
        style={{
          backgroundImage: "radial-gradient(circle at center, white 1px, transparent 1px)",
          backgroundSize: "40px 40px"
        }}
      />

      {/* Content */}
      <div className="relative z-10 w-full px-8 pb-32 space-y-24">
        {children}
      </div>
    </div>
  );
}

// Section Wrapper
function Section({ title, id, children }: { title: string; id: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="flex items-center gap-4 mb-8">
        <div className="h-[1px] bg-white/20 flex-1" />
        <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter shimmer-text">
          {title}
        </h2>
        <div className="h-[1px] bg-white/20 flex-1" />
      </div>
      {children}
    </section>
  );
}

export default async function GroundingPage() {
  const session = await auth();
  if (!session?.user) redirect("/");

  return (
    <SpaceBackground>
      {/* Header */}
      <header className="text-center space-y-4 mb-12 animate-in fade-in slide-in-from-top-8 duration-1000">
        <h1 className="text-6xl md:text-8xl font-black tracking-tighter uppercase">
          Wrex <span className="text-white/30">Hub</span>
        </h1>
        <p className="text-white/50 max-w-lg mx-auto">
          Your central command for physical and mental calibration.
        </p>
      </header>

      <Section id="stress-map" title="Stress Map">
        <StressMapSection />
      </Section>

      <Section id="workout" title="Workout Lab">
        <WorkoutSection />
      </Section>

      <Section id="health" title="Bio-Metrics">
        <HealthSection />
      </Section>

      <Section id="diet" title="Fuel & Nutrition">
        <DietSection />
      </Section>
    </SpaceBackground>
  );
}
