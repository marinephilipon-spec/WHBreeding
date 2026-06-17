import { drizzle } from 'drizzle-orm/netlify-db';
import * as schema from './schema.js';

// Connection is configured automatically by the Netlify platform — no
// connection string is required. The first connection provisions the database.
export const db = drizzle({ schema });
