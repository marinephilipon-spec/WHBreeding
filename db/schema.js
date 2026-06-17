import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// Persists the questions asked to the AI breeding assistant and its answers,
// so the assistant's history survives page refreshes and redeploys.
export const chatHistory = pgTable('chat_history', {
  id: serial().primaryKey(),
  question: text().notNull(),
  answer: text().notNull().default(''),
  createdAt: timestamp('created_at').defaultNow(),
});
