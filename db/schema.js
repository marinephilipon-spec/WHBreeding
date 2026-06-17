import { pgTable, serial, text, timestamp, jsonb } from 'drizzle-orm/pg-core';

// Persists the questions asked to the AI breeding assistant and its answers,
// so the assistant's history survives page refreshes and redeploys.
export const chatHistory = pgTable('chat_history', {
  id: serial().primaryKey(),
  question: text().notNull(),
  answer: text().notNull().default(''),
  createdAt: timestamp('created_at').defaultNow(),
});

// The app's horse records. Each row holds one horse keyed by the
// client-generated id. The full record (barn name, pedigree, profile details,
// breeding status, attached files, etc.) is kept in the `data` JSON column so
// every field entered on the site is stored verbatim and survives refreshes.
export const horses = pgTable('horses', {
  id: text().primaryKey(),
  data: jsonb().notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Scheduled to-dos / reminders created on the site, keyed by client id.
export const actions = pgTable('actions', {
  id: text().primaryKey(),
  data: jsonb().notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Timeline events logged for horses, keyed by client id.
export const events = pgTable('events', {
  id: text().primaryKey(),
  data: jsonb().notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
