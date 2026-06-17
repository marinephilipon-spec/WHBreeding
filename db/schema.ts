import { pgTable, text, jsonb, timestamp } from "drizzle-orm/pg-core";

// Single-row table that holds the entire breeding-operation state for the app.
// The frontend is a single shared workspace (no per-user auth), so the whole
// state document is loaded on startup and saved whenever it changes.
export const appState = pgTable("app_state", {
  id: text().primaryKey(),
  horses: jsonb().notNull().default([]),
  actions: jsonb().notNull().default([]),
  events: jsonb().notNull().default([]),
  updatedAt: timestamp("updated_at").defaultNow(),
});
