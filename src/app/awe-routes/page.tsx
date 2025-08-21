"use client";

import RouteDrawMap, { useRoutePointCount } from "@/components/route-draw-map";
import PlanBoard from "@/components/plan-board";

export default function AweRoutesPage() {
  const waypointCount = useRoutePointCount();

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Awe Routes</h1>
        <span className="pill-blue">awe</span>
      </div>

      <section className="c-card p-4 md:p-6">
        <p className="text-stone-600 mb-3">
          Draw a route with the polyline tool. Drag points to adjust, calculate distance, and export as GPX/JSON.
          Click a pin to see cards (notes/links/images/videos/todos) attached to that waypoint.
          Use the Users panel to set who owns newly added pins — pins are colored per user.
        </p>
        <RouteDrawMap />
      </section>

      <section className="c-card p-4 md:p-6">
        <h2 className="text-lg font-semibold mb-2">Plans, Invites & Cards</h2>
        <p className="text-stone-600 mb-3">
          Create a plan (personal or group), invite friends with a link, and add cards. Attach cards to route waypoints by number — they’ll show up when you click that pin on the map.
        </p>
        <PlanBoard currentWaypointCount={waypointCount} />
      </section>
    </div>
  );
}
