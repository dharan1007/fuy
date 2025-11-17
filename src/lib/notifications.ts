// Workout and Health Notifications Service
export interface WorkoutNotification {
  type: "invitation" | "reminder" | "rest_reminder" | "set_complete" | "workout_complete" | "diet_suggestion";
  title: string;
  message: string;
  actionId?: string;
}

/**
 * Send notification to the global notifications API
 */
export async function sendNotification(title: string, message: string, type: WorkoutNotification["type"]) {
  try {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        message: `${title}: ${message}`,
      }),
    });
  } catch (error) {
    console.error("Failed to send notification:", error);
  }
}

/**
 * Toast notification handler - shows in-app notification
 */
export function showToast(title: string, message: string, duration = 5000) {
  if (typeof window !== "undefined") {
    const event = new CustomEvent("showToast", {
      detail: { title, message, duration },
    });
    window.dispatchEvent(event);
  }
}
