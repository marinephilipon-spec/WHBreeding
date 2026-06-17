import { drizzle } from 'drizzle-orm/netlify-db';
import * as schema from './schema.js';

// Resolve the Postgres connection string from whichever environment variable the
// current runtime exposes, and ALWAYS pass a *usable* one to drizzle().
//
// The catch is that several of these variables can be present but point at a
// stub. In particular the Netlify Functions runtime (both `netlify dev` and
// deploys) can inject `NETLIFY_DB_URL=postgres://localhost/postgres` — a local
// placeholder with no host or credentials. The Neon driver rejects it at import
// time ("connection string format ... should be postgresql://user:password@host"),
// the store function 500s on every request, and the site shows "Could not save".
// Meanwhile the real connection string lives in a *different* variable depending
// on the runtime: `NETLIFY_DATABASE_URL` on deployed functions, and
// `NETLIFY_AGENT_RUNNER_DB_CONNECTION_STRING` in the local/agent runtime.
//
// So we can't just take the first non-empty variable — we take the first one
// that actually looks like a real remote Postgres URL (proper scheme, a real
// host, and credentials), which skips the localhost stub and lands on whichever
// variable the current runtime populated for real.
const CANDIDATES = [
  process.env.NETLIFY_DATABASE_URL,
  process.env.NETLIFY_DATABASE_URL_UNPOOLED,
  process.env.NETLIFY_DB_URL,
  process.env.DATABASE_URL,
  process.env.NETLIFY_AGENT_RUNNER_DB_CONNECTION_STRING,
];

const isUsable = (value) => {
  if (!value) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') return false;
    if (!url.hostname || url.hostname === 'localhost' || url.hostname === '127.0.0.1') return false;
    if (!url.username) return false;
    return true;
  } catch {
    return false;
  }
};

const connectionString = CANDIDATES.find(isUsable);

export const db = drizzle(connectionString, { schema });
