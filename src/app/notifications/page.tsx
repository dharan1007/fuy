"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useSession } from "@/hooks/use-session";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import LoadingSpinner from "@/components/LoadingSpinner";

// ============================================================================
//   SOPHISTICATED SPACE ENGINE (CANVAS BASED)
//   "Framer-Style" Motion, Physics, and Aesthetic
// ============================================================================

/**
 * Configuration for the Space Engine
 * Tweaked for "Pitch Black" premium aesthetic
 */
const CONFIG = {
  starCount: 600,
  nebulaCount: 8,
  cometChance: 0.005, // Chance per frame
  baseSpeed: 0.1,
  starColors: ["#ffffff", "#e0f2fe", "#f0f9ff", "#bfdbfe"], // Cool whites/blues
  nebulaColors: [
    "rgba(29, 78, 216, 0.03)",  // Faint Deep Blue
    "rgba(30, 41, 59, 0.02)",   // Dark Slate
    "rgba(59, 130, 246, 0.02)", // Blue
  ],
};

class Star {
  x: number;
  y: number;
  z: number;
  size: number;
  opacity: number;
  twinkleSpeed: number;
  color: string;

  constructor(width: number, height: number) {
    this.x = Math.random() * width;
    this.y = Math.random() * height;
    this.z = Math.random() * 2 + 0.5; // Depth factor
    this.size = Math.random() * 1.5;
    this.opacity = Math.random();
    this.twinkleSpeed = Math.random() * 0.02 + 0.005;
    this.color = CONFIG.starColors[Math.floor(Math.random() * CONFIG.starColors.length)];
  }

  update(width: number, height: number, speed: number) {
    // Parallax movement based on depth (z)
    this.y -= speed * this.z;

    // Twinkle opacity
    this.opacity += this.twinkleSpeed;
    if (this.opacity > 1 || this.opacity < 0.3) {
      this.twinkleSpeed = -this.twinkleSpeed;
    }

    // Reset if off screen
    if (this.y < 0) {
      this.y = height;
      this.x = Math.random() * width;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * this.z * 0.8, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.globalAlpha = Math.max(0, Math.min(1, this.opacity)); // Clamp opacity
    ctx.fill();
    ctx.globalAlpha = 1.0;
  }
}

class Nebula {
  x: number;
  y: number;
  radius: number;
  color: string;
  vx: number;
  vy: number;

  constructor(width: number, height: number) {
    this.x = Math.random() * width;
    this.y = Math.random() * height;
    this.radius = Math.random() * 400 + 200;
    this.color = CONFIG.nebulaColors[Math.floor(Math.random() * CONFIG.nebulaColors.length)];
    this.vx = (Math.random() - 0.5) * 0.2;
    this.vy = (Math.random() - 0.5) * 0.2;
  }

  update(width: number, height: number) {
    this.x += this.vx;
    this.y += this.vy;

    // Bounce gently off edges (infinite flow)
    if (this.x < -this.radius) this.x = width + this.radius;
    if (this.x > width + this.radius) this.x = -this.radius;
    if (this.y < -this.radius) this.y = height + this.radius;
    if (this.y > height + this.radius) this.y = -this.radius;
  }

  draw(ctx: CanvasRenderingContext2D) {
    const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
    gradient.addColorStop(0, this.color);
    gradient.addColorStop(1, "rgba(0,0,0,0)");

    ctx.fillStyle = gradient;
    ctx.fillRect(this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
  }
}

class Comet {
  x: number;
  y: number;
  length: number;
  speed: number;
  angle: number;
  opacity: number;
  dead: boolean = false;

  constructor(width: number, height: number) {
    this.x = Math.random() * width;
    this.y = Math.random() * height * 0.5; // Start in top half mostly
    this.length = Math.random() * 100 + 50;
    this.speed = Math.random() * 5 + 8;
    this.angle = Math.PI / 4 + (Math.random() - 0.5) * 0.2; // roughly diagonal down-right
    this.opacity = 0;
  }

  update(width: number, height: number) {
    // Fade in
    if (this.opacity < 1 && !this.dead) this.opacity += 0.05;

    this.x += Math.cos(this.angle) * this.speed;
    this.y += Math.sin(this.angle) * this.speed;

    // Kill if off screen
    if (this.x > width + 100 || this.y > height + 100) {
      this.dead = true;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.dead) return;

    const tailX = this.x - Math.cos(this.angle) * this.length;
    const tailY = this.y - Math.sin(this.angle) * this.length;

    const gradient = ctx.createLinearGradient(this.x, this.y, tailX, tailY);
    gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
    gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

    ctx.globalAlpha = this.opacity;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(tailX, tailY);
    ctx.stroke();
    ctx.globalAlpha = 1.0;
  }
}

const SpaceBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const stars: Star[] = Array.from({ length: CONFIG.starCount }).map(() => new Star(width, height));
    const nebulas: Nebula[] = Array.from({ length: CONFIG.nebulaCount }).map(() => new Nebula(width, height));
    let comets: Comet[] = [];

    const onResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };
    window.addEventListener("resize", onResize);

    let animationFrameId: number;

    const render = () => {
      // Clear with pitch black
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, width, height);

      // Draw Nebulas (Base Layer)
      nebulas.forEach(n => {
        n.update(width, height);
        n.draw(ctx);
      });

      // Draw Stars (Mid Layer)
      stars.forEach(s => {
        s.update(width, height, CONFIG.baseSpeed);
        s.draw(ctx);
      });

      // Manage Comets
      if (Math.random() < CONFIG.cometChance) {
        comets.push(new Comet(width, height));
      }

      comets.forEach(c => {
        c.update(width, height);
        c.draw(ctx);
      });
      comets = comets.filter(c => !c.dead);

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 w-full h-full pointer-events-none"
    />
  );
};

// ============================================================================
//   MAIN PAGE & DATA TYPES
// ============================================================================

type Notification = {
  id: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
  friendshipId?: string;
  sender?: {
    id: string;
    name: string | null;
    profile: {
      displayName: string | null;
      avatarUrl: string | null;
    } | null;
  };
  post?: {
    id: string;
    content: string;
    user: {
      id: string;
      name: string | null;
    };
  };
  _actionTaken?: "ACCEPT" | "REJECT" | "GHOST" | "UNDO" | "FOLLOWED_BACK";
  friendshipStatus?: string;
  isGhosted?: boolean;
  isFollowing?: boolean;
};

export default function NotificationsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  useEffect(() => {
    if (status !== 'loading') {
      loadNotifications();
    }
  }, [filter, status]);

  // Auto mark all as read when opening page
  useEffect(() => {
    // Immediate local dispatch to clear badge
    window.dispatchEvent(new CustomEvent('notifications-read'));

    // API Call if needed
    if (!loading && notifications.some(n => !n.read)) {
      markAllAsRead();
    }
  }, [loading, notifications.length]); // depend on length to trigger but avoid loops

  if (status === 'loading') {
    return <LoadingSpinner message="Syncing with the cosmos..." />;
  }

  // --- Data Fetching & Actions ---

  async function loadNotifications() {
    setLoading(true);
    try {
      const url = filter === "unread" ? "/api/notifications?unreadOnly=true" : "/api/notifications";
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();
      setNotifications(data.notifications || []);
    } catch (error) {
      console.error("Load notifications error:", error);
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(notificationId: string) {
    try {
      setNotifications(prev => prev.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      ));

      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      });
    } catch (error) {
      console.error("Mark as read error:", error);
      loadNotifications();
    }
  }

  async function markAllAsRead() {
    try {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));

      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });

      // Synchronize across components
      window.dispatchEvent(new CustomEvent('notifications-read'));
    } catch (error) {
      console.error("Mark all as read error:", error);
      loadNotifications();
    }
  }

  async function deleteNotification(notificationId: string) {
    try {
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      await fetch(`/api/notifications?id=${notificationId}`, {
        method: "DELETE",
      });
    } catch (error) {
      console.error("Delete notification error:", error);
      loadNotifications();
    }
  }

  async function handleFriendAction(friendshipId: string, action: "ACCEPT" | "REJECT" | "GHOST" | "UNDO") {
    // Optimistic UI Update
    setNotifications(prev => {
      // If GHOST, remove immediately from view
      if (action === 'GHOST') {
        return prev.filter(n => n.friendshipId !== friendshipId);
      }

      return prev.map(n => {
        if (n.friendshipId === friendshipId) {
          // If UNDO, clear the action taken
          if (action === 'UNDO') {
            return { ...n, _actionTaken: undefined };
          }
          return { ...n, _actionTaken: action };
        }
        return n;
      });
    });

    try {
      const res = await fetch("/api/users/follow-request", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        // @ts-ignore
        body: JSON.stringify({ friendshipId, action }),
      });

      if (!res.ok) {
        const error = await res.json();
        console.error("Action failed:", error.error);
        loadNotifications(); // Revert on error
      }
    } catch (error) {
      console.error("Friend action error:", error);
      loadNotifications();
    }
  }

  async function handleFollowBack(targetUserId: string, notificationId: string) {
    // Optimistic Update
    setNotifications(prev => prev.map(n =>
      n.id === notificationId ? { ...n, _actionTaken: "FOLLOWED_BACK", isFollowing: true } : n
    ));

    try {
      const res = await fetch("/api/users/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId }),
      });

      if (!res.ok) {
        throw new Error("Failed to follow");
      }
    } catch (error) {
      console.error("Follow back error:", error);
      loadNotifications(); // Revert
    }
  }

  // --- UI Helpers ---

  function getNotificationIcon(type: string) {
    switch (type) {
      case "FRIEND_REQUEST":
        return (
          <div className="bg-blue-500/10 p-2.5 rounded-full border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
        );
      case "FRIEND_ACCEPT":
      case "FOLLOW":
        return (
          <div className="bg-green-500/10 p-2.5 rounded-full border border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.2)]">
            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case "POST_LIKE":
        return (
          <div className="bg-rose-500/10 p-2.5 rounded-full border border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.2)]">
            <svg className="w-5 h-5 text-rose-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="bg-white/5 p-2.5 rounded-full border border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
            <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
        );
    }
  }

  function getDisplayName(user: any) {
    return user?.profile?.displayName || user?.name || "Unknown User";
  }

  return (
    <div className="min-h-screen bg-black text-white selection:bg-blue-500/30 font-sans">
      <SpaceBackground />
      <div className="relative z-10 flex flex-col min-h-screen">
        <div className="bg-gradient-to-b from-black/80 to-transparent pb-4">
          <AppHeader title="NOTIFICATIONS" showBackButton />
        </div>

        <div className="max-w-2xl mx-auto w-full px-4 flex-1 pb-20">
          <div className="sticky top-20 z-20 mb-6 mx-2">
            <div className="flex items-center justify-between backdrop-blur-2xl bg-white/[0.03] p-1.5 rounded-full border border-white/[0.1] shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
              <div className="flex gap-1 p-0.5">
                <button
                  onClick={() => setFilter("all")}
                  className={`px-5 py-2 rounded-full text-xs font-bold tracking-wide transition-all duration-300 ${filter === "all" ? "bg-white text-black shadow-lg scale-100" : "text-gray-400 hover:text-white hover:bg-white/5 active:scale-95"}`}
                >ALL</button>
                <button
                  onClick={() => setFilter("unread")}
                  className={`px-5 py-2 rounded-full text-xs font-bold tracking-wide transition-all duration-300 ${filter === "unread" ? "bg-white text-black shadow-lg scale-100" : "text-gray-400 hover:text-white hover:bg-white/5 active:scale-95"}`}
                >UNREAD</button>
              </div>

              <button
                onClick={markAllAsRead}
                className="px-5 py-2 text-xs font-bold text-gray-400 hover:text-white transition-colors"
              >MARK ALL READ</button>
            </div>
          </div>

          <div className="space-y-3 relative">
            {loading && (
              <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-blue-500 animate-spin mb-4 shadow-[0_0_20px_rgba(59,130,246,0.5)]" />
                <span className="text-[10px] font-bold tracking-[0.2em] text-blue-400/80 uppercase">INITIALIZING FEED</span>
              </div>
            )}

            {!loading && notifications.length === 0 && (
              <div className="flex flex-col items-center justify-center py-32 opacity-60">
                <div className="w-20 h-20 bg-white/[0.02] rounded-full flex items-center justify-center mb-6 border border-white/[0.05] shadow-inner">
                  <svg className="w-8 h-8 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 12H4M4 12L12 4M4 12L12 20" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-500 tracking-wide">NO RECENT ACTIVITY</p>
              </div>
            )}

            {notifications.map((notif, index) => {
              let cleanMessage = notif.message || '';
              cleanMessage = cleanMessage.replace(/^Someone\s+/, '');
              cleanMessage = cleanMessage.charAt(0).toUpperCase() + cleanMessage.slice(1);

              return (
                <div
                  key={notif.id}
                  className={`group relative overflow-hidden rounded-2xl border transition-all duration-500 ease-out ${notif.read ? "bg-transparent border-white/[0.03] opacity-70 hover:opacity-100" : "bg-white/[0.04] border-white/[0.1] shadow-[0_0_30px_rgba(0,0,0,0.5)]"}`}
                  onClick={() => !notif.read && markAsRead(notif.id)}
                >
                  <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50" />
                  <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-black/50 to-transparent" />

                  <div className="p-5 flex items-start gap-4 z-10 relative">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notif.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col gap-1.5">
                        <p className="text-[15px] text-gray-200 leading-snug font-light tracking-wide">
                          {(() => {
                            const displayName = notif.sender ? getDisplayName(notif.sender) : null;
                            // If we have a sender, try to strip their name from the message to avoid duplication
                            // "Manoj commented" -> "commented"
                            let displayMessage = cleanMessage;
                            if (displayName && displayMessage.startsWith(displayName)) {
                              displayMessage = displayMessage.substring(displayName.length).trim();
                            }

                            return (
                              <>
                                {displayName && (
                                  <span className="font-bold text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                                    {displayName}{" "}
                                  </span>
                                )}
                                <span className={!displayName ? "font-bold text-gray-200" : ""}>
                                  {displayMessage}
                                </span>
                              </>
                            );
                          })()}
                        </p>

                        {/* Friend Request / Follow Action Area */}
                        {(notif.type === "FRIEND_REQUEST" || (notif.friendshipStatus === "ACCEPTED" && !notif.isFollowing)) && notif.sender && (
                          <div className="mt-3 flex gap-2">
                            {/* Case 1: Active Friend Request */}
                            {notif.type === "FRIEND_REQUEST" && notif.friendshipStatus === "PENDING" && !notif._actionTaken && (
                              <>
                                <button
                                  onClick={(e) => { e.stopPropagation(); if (notif.friendshipId) handleFriendAction(notif.friendshipId, "ACCEPT"); }}
                                  className="px-4 py-1.5 bg-white text-black hover:bg-gray-200 rounded text-[10px] font-black uppercase tracking-wider transition-all shadow-md active:scale-95"
                                >
                                  Confirm
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); if (notif.friendshipId) handleFriendAction(notif.friendshipId, "REJECT"); }}
                                  className="px-4 py-1.5 bg-transparent text-white border border-white/20 hover:bg-white/5 rounded text-[10px] font-black uppercase tracking-wider transition-all active:scale-95"
                                >
                                  Delete
                                </button>
                              </>
                            )}

                            {/* Case 2: Accepted but NOT Following Back */}
                            {((notif.friendshipStatus === "ACCEPTED" || notif._actionTaken === "ACCEPT")) && !notif.isFollowing && notif._actionTaken !== "FOLLOWED_BACK" && (
                              <button
                                onClick={(e) => { e.stopPropagation(); if (notif.sender?.id) handleFollowBack(notif.sender.id, notif.id); }}
                                className="px-4 py-1.5 bg-blue-600 text-white hover:bg-blue-500 rounded text-[10px] font-black uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)] active:scale-95 flex items-center gap-1"
                              >
                                Follow Back
                              </button>
                            )}

                            {/* Status Indicators */}
                            {((notif.friendshipStatus === "ACCEPTED" || notif._actionTaken === "ACCEPT") && (notif.isFollowing || notif._actionTaken === "FOLLOWED_BACK")) && (
                              <span className="text-[10px] text-green-400 font-bold uppercase tracking-wider border border-green-500/20 px-2 py-1 rounded bg-green-500/5">
                                Following
                              </span>
                            )}

                            {((notif.friendshipStatus === "REJECTED" || notif._actionTaken === "REJECT")) && (
                              <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider border border-red-500/20 px-2 py-1 rounded bg-red-500/5">
                                Declined
                              </span>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-between mt-2">
                          <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                            {new Date(notif.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notif.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-all duration-300 text-gray-600 hover:text-red-500 p-2 transform hover:rotate-90"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
