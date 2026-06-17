import { drizzle } from 'drizzle-orm/netlify-db';
import * as schema from './schema.js';

// Netlify injects the Postgres connection string at runtime, but the exact
// environment variable that holds a *usable* string varies between runtimes.
// In some Netlify runtimes `NETLIFY_DB_URL` is only a short placeholder, which
// makes the bare `drizzle({ schema })` helper hand an invalid value to neon()
// and throw on import — so every request to the store function returned 500 and
// nothing was ever saved or loaded (horses vanished on refresh).
//
// Resolve the first environment variable that actually contains a real Postgres
// connection string and pass it to drizzle explicitly. The placeholder is
// skipped, and we fall back to drizzle's own automatic resolution only if none
// of the known variables look valid.
const PG_URL = /^postgres(ql)?:\/\/[^@\s]+@[^/\s]+\/.+/;
const connectionString = [
  process.env.NETLIFY_DATABASE_URL,
  process.env.NETLIFY_DB_URL,
  process.env.NETLIFY_DATABASE_URL_UNPOOLED,
  process.env.DATABASE_URL,
  process.env.NETLIFY_AGENT_RUNNER_DB_CONNECTION_STRING,
].find((value) => PG_URL.test(value || ''));

export const db = connectionString
  ? drizzle(connectionString, { schema })
  : drizzle({ schema });
