"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type ProjectCategory = "goals" | "steps" | "todos" | "diary" | "resources" | "watchlist" | "hopin" | "priorities";

interface ProjectNode {
  id: string;
  name: string;
  category: ProjectCategory;
  icon: string;
  data: any;
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function EssenzPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<ProjectCategory>("goals");
  const [expandedProjects, setExpandedProjects] = useState<{ [key: string]: boolean }>({
    goals: true,
    steps: false,
    todos: true,
    diary: false,
    resources: false,
    watchlist: false,
    hopin: false,
    priorities: false,
  });

  const [projects] = useState<ProjectNode[]>([
    {
      id: "goal-main",
      name: "Main Goal",
      category: "goals",
      icon: "🎯",
      data: { statement: "", focusAreas: [], plan: [], codename: "" },
    },
  ]);

  const categories = [
    { id: "goals", label: "Goals", icon: "🎯", color: "blue" },
    { id: "steps", label: "Steps", icon: "🪜", color: "green" },
    { id: "priorities", label: "Priorities", icon: "📊", color: "purple" },
    { id: "todos", label: "Todos", icon: "✅", color: "yellow" },
    { id: "diary", label: "Diary", icon: "📔", color: "pink" },
    { id: "resources", label: "Resources", icon: "🔧", color: "indigo" },
    { id: "watchlist", label: "Watchlist", icon: "🎬", color: "red" },
    { id: "hopin", label: "This Week", icon: "📅", color: "cyan" },
  ];

  const currentCategory = categories.find((c) => c.id === selectedCategory);

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-6xl mb-4 animate-pulse">✨</p>
          <h1 className="text-4xl font-bold text-white mb-2">Essenz</h1>
          <p className="text-slate-300 mb-8">Your Personal Goal Achievement System</p>
          <Link
            href="/join"
            className="inline-block bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-blue-700 transition-all"
          >
            Get Started
          </Link>
        </div>
      </div>
    );
  }

  const toggleProject = (projectId: string) => {
    setExpandedProjects((prev) => ({
      ...prev,
      [projectId]: !prev[projectId],
    }));
  };

  return (
    <>
      <style>{`
        * {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }

        textarea, input[type="text"], input[type="email"], input[type="number"], select {
          background-color: rgba(30, 41, 59, 0.8) !important;
          color: #e2e8f0 !important;
          border: 1px solid rgba(59, 130, 246, 0.4) !important;
          border-radius: 6px !important;
        }

        textarea:focus, input[type="text"]:focus, input[type="email"]:focus, input[type="number"]:focus, select:focus {
          background-color: rgba(30, 41, 59, 0.95) !important;
          border-color: #60a5fa !important;
          outline: none !important;
          box-shadow: 0 0 12px rgba(96, 165, 250, 0.2) !important;
        }

        textarea::placeholder, input::placeholder {
          color: rgba(96, 165, 250, 0.5) !important;
        }

        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        ::-webkit-scrollbar-track {
          background: transparent;
        }

        ::-webkit-scrollbar-thumb {
          background: rgba(59, 130, 246, 0.3);
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: rgba(59, 130, 246, 0.5);
        }
      `}</style>

      <div className="flex h-screen" style={{ backgroundColor: "#1a1f3a" }}>
        {/* LEFT SIDEBAR */}
        <div
          className="flex flex-col transition-all duration-300"
          style={{
            width: sidebarOpen ? "280px" : "60px",
            backgroundColor: "#0f1419",
            borderRight: "1px solid rgba(59, 130, 246, 0.1)",
          }}
        >
          {/* Sidebar Header */}
          <div className="p-4 border-b" style={{ borderColor: "rgba(59, 130, 246, 0.1)" }}>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-opacity-10 rounded transition-all"
              style={{ color: "#60a5fa" }}
            >
              ☰
            </button>
          </div>

          {/* Navigation Items */}
          {sidebarOpen && (
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {/* Main Navigation */}
              <div className="space-y-1 mb-6">
                <div className="text-xs font-bold text-gray-500 px-2 mb-3">NAVIGATION</div>
                {[
                  { id: "home", label: "Home", icon: "🏠" },
                  { id: "search", label: "Search", icon: "��" },
                  { id: "projects", label: "Projects", icon: "📁" },
                ].map((item) => (
                  <button
                    key={item.id}
                    className="w-full text-left px-3 py-2 rounded text-sm transition-all hover:bg-opacity-20"
                    style={{
                      backgroundColor: item.id === "projects" ? "rgba(59, 130, 246, 0.1)" : "transparent",
                      color: item.id === "projects" ? "#60a5fa" : "rgba(226, 232, 240, 0.7)",
                    }}
                  >
                    <span className="mr-2">{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Projects Section */}
              <div className="text-xs font-bold text-gray-500 px-2 mb-3">PROJECTS</div>
              <div className="space-y-1">
                {categories.map((category) => (
                  <div key={category.id}>
                    <button
                      onClick={() => {
                        setSelectedCategory(category.id as ProjectCategory);
                        toggleProject(category.id);
                      }}
                      className="w-full text-left px-3 py-2 rounded text-sm transition-all hover:bg-opacity-20 flex items-center justify-between"
                      style={{
                        backgroundColor:
                          selectedCategory === category.id ? "rgba(59, 130, 246, 0.15)" : "transparent",
                        color: selectedCategory === category.id ? "#60a5fa" : "rgba(226, 232, 240, 0.7)",
                      }}
                    >
                      <span>
                        <span className="mr-2">{category.icon}</span>
                        {category.label}
                      </span>
                      <span className="text-xs opacity-60">{expandedProjects[category.id] ? "▼" : "▶"}</span>
                    </button>

                    {/* Nested Projects */}
                    {expandedProjects[category.id] && (
                      <div className="ml-4 space-y-1 mt-1">
                        {projects
                          .filter((p) => p.category === category.id)
                          .map((project) => (
                            <button
                              key={project.id}
                              onClick={() => setSelectedCategory(category.id as ProjectCategory)}
                              className="w-full text-left px-3 py-1.5 rounded text-xs transition-all hover:bg-opacity-20"
                              style={{
                                backgroundColor:
                                  selectedCategory === category.id ? "rgba(59, 130, 246, 0.1)" : "transparent",
                                color: "rgba(226, 232, 240, 0.6)",
                              }}
                            >
                              <span className="mr-2">📄</span>
                              {project.name}
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Shortcuts */}
              <div className="mt-8 pt-6 border-t" style={{ borderColor: "rgba(59, 130, 246, 0.1)" }}>
                <div className="text-xs font-bold text-gray-500 px-2 mb-3">SHORTCUTS</div>
                <button
                  className="w-full text-left px-3 py-2 rounded text-sm transition-all hover:bg-opacity-20"
                  style={{ color: "rgba(226, 232, 240, 0.7)" }}
                >
                  ⚡ Quick Add Goal
                </button>
              </div>
            </div>
          )}
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Header */}
          <div
            className="border-b px-8 py-4 flex items-center justify-between"
            style={{
              borderColor: "rgba(59, 130, 246, 0.1)",
              backgroundColor: "#0f1419",
            }}
          >
            <div>
              <h1 className="text-2xl font-bold" style={{ color: "#60a5fa" }}>
                {currentCategory?.label}
              </h1>
              <p className="text-sm" style={{ color: "rgba(226, 232, 240, 0.6)" }}>
                Manage your {currentCategory?.label.toLowerCase()}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                className="px-4 py-2 rounded text-sm font-medium transition-all"
                style={{
                  backgroundColor: "rgba(59, 130, 246, 0.2)",
                  color: "#60a5fa",
                }}
              >
                + Add New
              </button>
              <Link
                href="/profile"
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg"
                style={{ backgroundImage: "linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)" }}
              >
                {session.user?.name?.charAt(0) || "U"}
              </Link>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-auto p-8">
            <div className="space-y-6 max-w-6xl">
              {/* Light Theme Card */}
              <div
                className="rounded-lg border overflow-hidden"
                style={{
                  borderColor: "rgba(59, 130, 246, 0.2)",
                  backgroundColor: "rgba(15, 20, 25, 0.6)",
                }}
              >
                <div
                  className="px-6 py-4 border-b flex items-center gap-3"
                  style={{ borderColor: "rgba(59, 130, 246, 0.1)" }}
                >
                  <span className="text-lg">{currentCategory?.icon}</span>
                  <div>
                    <h2 className="font-semibold text-white">{currentCategory?.label} System</h2>
                    <p className="text-xs" style={{ color: "rgba(226, 232, 240, 0.6)" }}>
                      Configure your {currentCategory?.label.toLowerCase()} settings
                    </p>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    {["Colors", "Typography", "Spacing"].map((item, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 rounded text-xs"
                        style={{
                          backgroundColor: idx === 1 ? "rgba(96, 165, 250, 0.2)" : "rgba(59, 130, 246, 0.1)",
                          color: idx === 1 ? "#60a5fa" : "rgba(226, 232, 240, 0.7)",
                        }}
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Config Display */}
                <div className="p-6">
                  <div className="grid grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div>
                      <h3
                        className="text-sm font-semibold mb-4 flex items-center gap-2"
                        style={{ color: "#60a5fa" }}
                      >
                        Light
                        <span className="inline-block w-4 h-4 rounded-full bg-gray-300"></span>
                      </h3>
                      <div
                        className="rounded-lg p-4 space-y-2 font-mono text-xs"
                        style={{
                          backgroundColor: "rgba(30, 41, 59, 0.4)",
                          color: "rgba(226, 232, 240, 0.8)",
                        }}
                      >
                        <div>
                          <span style={{ color: "#60a5fa" }}>• Colors</span>
                        </div>
                        <div>
                          <span style={{ color: "#60a5fa" }}>• Typography</span>
                        </div>
                        <div>
                          <span style={{ color: "#60a5fa" }}>• Border</span>
                        </div>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div>
                      <h3
                        className="text-sm font-semibold mb-4 flex items-center gap-2"
                        style={{ color: "#60a5fa" }}
                      >
                        Dark
                        <span className="inline-block w-4 h-4 rounded-full" style={{ backgroundColor: "#0f1419" }}></span>
                      </h3>
                      <div
                        className="rounded-lg p-4 space-y-2 font-mono text-xs"
                        style={{
                          backgroundColor: "rgba(30, 41, 59, 0.4)",
                          color: "rgba(226, 232, 240, 0.8)",
                        }}
                      >
                        <div>
                          <span style={{ color: "#60a5fa" }}>• Colors</span>
                        </div>
                        <div>
                          <span style={{ color: "#60a5fa" }}>• Typography</span>
                        </div>
                        <div>
                          <span style={{ color: "#60a5fa" }}>• Shadow</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Typography Card */}
              <div
                className="rounded-lg border overflow-hidden"
                style={{
                  borderColor: "rgba(59, 130, 246, 0.2)",
                  backgroundColor: "rgba(15, 20, 25, 0.6)",
                }}
              >
                <div
                  className="px-6 py-4 border-b"
                  style={{ borderColor: "rgba(59, 130, 246, 0.1)" }}
                >
                  <h2 className="font-semibold text-white">Typography</h2>
                </div>
                <div className="p-6">
                  <div
                    className="rounded-lg p-4 font-mono text-xs space-y-2"
                    style={{
                      backgroundColor: "rgba(30, 41, 59, 0.4)",
                      color: "rgba(226, 232, 240, 0.8)",
                    }}
                  >
                    <div>
                      <span style={{ color: "#f97316" }}>"h1-600":</span>
                      <span style={{ color: "#a78bfa" }}>{`{`}</span>
                    </div>
                    <div className="ml-4">
                      <span style={{ color: "#f97316" }}>value</span>: <span style={{ color: "#4ade80" }}>"24px"</span>,
                    </div>
                    <div className="ml-4">
                      <span style={{ color: "#f97316" }}>fontWeight</span>: <span style={{ color: "#4ade80" }}>"600"</span>,
                    </div>
                    <div className="ml-4">
                      <span style={{ color: "#f97316" }}>lineHeight</span>: <span style={{ color: "#4ade80" }}>"32px"</span>,
                    </div>
                    <div className="ml-4">
                      <span style={{ color: "#f97316" }}>letterSpacing</span>:
                      <span style={{ color: "#4ade80" }}>"0.15px"</span>,
                    </div>
                    <div>
                      <span style={{ color: "#a78bfa" }}>{`}`}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SIDEBAR */}
        <div
          className="w-72 border-l overflow-y-auto p-6"
          style={{
            borderColor: "rgba(59, 130, 246, 0.1)",
            backgroundColor: "#0f1419",
          }}
        >
          <div className="space-y-6">
            {/* Category Info */}
            <div
              className="rounded-lg p-4"
              style={{ backgroundColor: "rgba(59, 130, 246, 0.1)" }}
            >
              <h3 className="font-semibold text-sm mb-2" style={{ color: "#60a5fa" }}>
                {currentCategory?.label}
              </h3>
              <p className="text-xs" style={{ color: "rgba(226, 232, 240, 0.6)" }}>
                Manage and configure all {currentCategory?.label.toLowerCase()} across your goal system
              </p>
            </div>

            {/* Quick Stats */}
            <div>
              <h3 className="font-semibold text-sm mb-3" style={{ color: "#60a5fa" }}>
                Quick Stats
              </h3>
              <div className="space-y-2 text-xs" style={{ color: "rgba(226, 232, 240, 0.7)" }}>
                <div className="flex justify-between">
                  <span>Total Items:</span>
                  <span className="font-semibold">0</span>
                </div>
                <div className="flex justify-between">
                  <span>Completed:</span>
                  <span className="font-semibold">0</span>
                </div>
                <div className="flex justify-between">
                  <span>Last Updated:</span>
                  <span className="font-semibold">Just now</span>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div>
              <h3 className="font-semibold text-sm mb-3" style={{ color: "#60a5fa" }}>
                Tips
              </h3>
              <p className="text-xs" style={{ color: "rgba(226, 232, 240, 0.6)" }}>
                Select any category on the left to customize and manage your goals, steps, and more.
              </p>
            </div>

            {/* User Profile */}
            <div
              className="rounded-lg p-4 border"
              style={{
                borderColor: "rgba(59, 130, 246, 0.2)",
                backgroundColor: "rgba(59, 130, 246, 0.05)",
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                  style={{ backgroundImage: "linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)" }}
                >
                  {session.user?.name?.charAt(0) || "U"}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{session.user?.name}</p>
                  <p className="text-xs" style={{ color: "rgba(226, 232, 240, 0.6)" }}>
                    Goal Achiever
                  </p>
                </div>
              </div>
              <button
                onClick={() => router.push("/profile")}
                className="w-full px-3 py-2 rounded text-xs font-medium transition-all"
                style={{
                  backgroundColor: "rgba(96, 165, 250, 0.2)",
                  color: "#60a5fa",
                }}
              >
                View Profile
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
