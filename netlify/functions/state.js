import { db } from "../../db/index.js";
import { appState } from "../../db/schema.js";
import { eq, sql } from "drizzle-orm";

// Fixed key for the single shared state document.
const SINGLETON = "default";

const empty = { horses: [], actions: [], events: [] };

export default async (req) => {
  try {
    if (req.method === "GET") {
      const [row] = await db
        .select()
        .from(appState)
        .where(eq(appState.id, SINGLETON));
      return Response.json(
        row
          ? { horses: row.horses, actions: row.actions, events: row.events }
          : empty
      );
    }

    if (req.method === "POST" || req.method === "PUT") {
      const body = await req.json();
      const horses = Array.isArray(body.horses) ? body.horses : [];
      const actions = Array.isArray(body.actions) ? body.actions : [];
      const events = Array.isArray(body.events) ? body.events : [];

      await db
        .insert(appState)
        .values({ id: SINGLETON, horses, actions, events })
        .onConflictDoUpdate({
          target: appState.id,
          set: { horses, actions, events, updatedAt: sql`now()` },
        });

      return Response.json({ ok: true });
    }

    return new Response("Method not allowed", { status: 405 });
  } catch (error) {
    console.error("state function error:", error);
    return Response.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
};

export const config = {
  path: "/api/state",
};
