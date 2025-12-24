'use client';

import React, { useState, useEffect } from 'react';
import { Ghost, ChevronDown, ChevronRight } from 'lucide-react';

interface GhostedRequest {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
    profile: {
      avatarUrl: string;
      bio: string;
    } | null;
  };
  updatedAt: string;
}

export default function GhostedRequestsSection() {
  const [ghostedRequests, setGhostedRequests] = useState<GhostedRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetchGhostedRequests();
  }, []);

  const fetchGhostedRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/friends/ghosted');
      if (!response.ok) throw new Error('Failed to fetch ghosted requests');
      const data = await response.json();
      setGhostedRequests(data.ghostedRequests);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Fetch ghosted requests error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromGhosted = async (friendshipId: string) => {
    try {
      const response = await fetch('/api/friends/ghosted', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendshipId }),
      });

      if (response.ok) {
        setGhostedRequests(prev => prev.filter(r => r.id !== friendshipId));
      } else {
        console.error('Failed to remove from ghosted');
      }
    } catch (err) {
      console.error('Error removing from ghosted:', err);
    }
  };

  if (loading) {
    return <div className="text-center text-gray-400 py-4">Loading...</div>;
  }

  return (
    <section className="bg-black/40 backdrop-blur-md rounded-xl border border-white/10 shadow-lg p-6 mb-6">
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-2">
          <Ghost className="w-5 h-5 text-white" />
          <h3 className="text-xl font-bold text-white uppercase tracking-wider">
            Ghosted Requests ({ghostedRequests.length})
          </h3>
        </div>
        <button className="text-white hover:text-gray-300 transition-colors">
          {expanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>
      </div>

      {expanded && (
        <div className="mt-6 animate-in fade-in slide-in-from-top-2 duration-300">
          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
          {ghostedRequests.length === 0 ? (
            <p className="text-gray-400 text-sm font-medium">No ghosted requests found.</p>
          ) : (
            <div className="space-y-4">
              {ghostedRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg p-4">
                  <div className="flex items-center gap-4">
                    <img
                      src={request.user.profile?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${request.user.id}`}
                      alt={request.user.name}
                      className="w-10 h-10 rounded-full bg-gray-800 object-cover"
                    />
                    <div>
                      <p className="text-white font-bold">{request.user.name}</p>
                      <p className="text-xs text-gray-400">{request.user.email}</p>
                      <p className="text-[10px] text-gray-500 mt-1 uppercase">
                        Ghosted on {new Date(request.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <button
                    className="p-2 text-gray-400 hover:text-white transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFromGhosted(request.id);
                    }}
                    title="Remove from ghosted"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
