"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function HistoryPage() {
  const { data: session, status } = useSession();
  const params = useParams();
  const router = useRouter();
  const category = typeof params.category === "string" ? params.category : "";

  const [history, setHistory] = useState<any[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<any | null>(null);

  const categoryLabels: Record<string, string> = {
    goals: "Goals",
    steps: "Steps",
    priorities: "Priorities",
    todos: "Todos",
    diary: "Diary",
    resources: "Resources",
    watchlist: "Watchlist",
    hopin: "This Week",
  };

  useEffect(() => {
    // Load history from localStorage (in production, would be from backend)
    const stored = localStorage.getItem(`history-${category}`);
    if (stored) {
      try {
        setHistory(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to load history:", e);
      }
    }
  }, [category]);

  // Show loading spinner while session is authenticating
  if (status === 'loading') {
    return <LoadingSpinner message="Loading history..." />;
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-6xl mb-4 animate-pulse">✨</p>
          <h1 className="text-4xl font-bold text-white mb-2">Essenz</h1>
          <Link href="/join" className="inline-block bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-blue-700 transition-all">
            Get Started
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        textarea, input[type="text"], select {
          background-color: rgba(30, 41, 59, 0.8) !important;
          color: #e2e8f0 !important;
          border: 1px solid rgba(59, 130, 246, 0.4) !important;
        }
        textarea:focus, input:focus, select:focus {
          background-color: rgba(30, 41, 59, 0.95) !important;
          border-color: #60a5fa !important;
          outline: none !important;
        }
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(59, 130, 246, 0.3);
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(59, 130, 246, 0.5);
        }
      `}</style>

      <div className="min-h-screen" style={{ backgroundColor: "#0a0e27" }}>
        {/* Header */}
        <div
          className="border-b px-8 py-4 flex items-center justify-between"
          style={{
            borderColor: "rgba(59, 130, 246, 0.1)",
            backgroundColor: "#0f1419",
          }}
        >
          <div>
            <button
              onClick={() => router.back()}
              className="text-sm px-3 py-2 rounded mb-2"
              style={{ color: "#60a5fa", backgroundColor: "rgba(59, 130, 246, 0.2)" }}
            >
              ← Back
            </button>
            <h1 className="text-2xl font-bold" style={{ color: "#60a5fa" }}>
              {categoryLabels[category] || category} History
            </h1>
            <p className="text-sm" style={{ color: "rgba(226, 232, 240, 0.6)" }}>
              Timeline of all changes and interactions
            </p>
          </div>
          <Link
            href="/profile"
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg"
            style={{ backgroundImage: "linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)" }}
          >
            {session.user?.name?.charAt(0) || "U"}
          </Link>
        </div>

        {/* Main Content */}
        <div className="flex gap-6 p-8 max-w-7xl">
          {/* Timeline */}
          <div className="flex-1">
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
                <h2 className="font-semibold text-white">Timeline</h2>
              </div>

              <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
                {history.length > 0 ? (
                  history.map((entry, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedEntry(entry)}
                      className="p-4 rounded-lg border cursor-pointer transition-all hover:bg-opacity-80"
                      style={{
                        borderColor: "rgba(59, 130, 246, 0.2)",
                        backgroundColor:
                          selectedEntry === entry ? "rgba(59, 130, 246, 0.2)" : "rgba(59, 130, 246, 0.08)",
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className="px-2 py-1 rounded text-xs font-bold"
                          style={{
                            backgroundColor: "rgba(96, 165, 250, 0.2)",
                            color: "#60a5fa",
                          }}
                        >
                          {entry.action || "Updated"}
                        </span>
                        <span className="text-xs opacity-75">
                          {new Date(entry.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm opacity-75">
                        {entry.category} • {new Date(entry.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm opacity-50">No history yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Details Panel */}
          <div className="w-80">
            <div
              className="rounded-lg border overflow-hidden sticky top-8"
              style={{
                borderColor: "rgba(59, 130, 246, 0.2)",
                backgroundColor: "rgba(15, 20, 25, 0.6)",
              }}
            >
              <div
                className="px-6 py-4 border-b"
                style={{ borderColor: "rgba(59, 130, 246, 0.1)" }}
              >
                <h2 className="font-semibold text-white">Details</h2>
              </div>

              {selectedEntry ? (
                <div className="p-6 space-y-4">
                  <div>
                    <h3 className="text-xs font-bold mb-2" style={{ color: "#60a5fa" }}>
                      Action
                    </h3>
                    <p className="text-sm">{selectedEntry.action || "Updated"}</p>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold mb-2" style={{ color: "#60a5fa" }}>
                      Category
                    </h3>
                    <p className="text-sm">{selectedEntry.category}</p>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold mb-2" style={{ color: "#60a5fa" }}>
                      Timestamp
                    </h3>
                    <p className="text-sm">{new Date(selectedEntry.timestamp).toLocaleString()}</p>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold mb-2" style={{ color: "#60a5fa" }}>
                      Data Snapshot
                    </h3>
                    <div
                      className="p-3 rounded text-xs max-h-32 overflow-y-auto font-mono"
                      style={{ backgroundColor: "rgba(30, 41, 59, 0.5)" }}
                    >
                      {JSON.stringify(selectedEntry.data, null, 2).slice(0, 500)}...
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center">
                  <p className="text-sm opacity-50">Select an entry to view details</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
