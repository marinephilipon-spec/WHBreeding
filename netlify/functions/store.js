import { eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { horses, actions, events } from '../../db/schema.js';

// Persists everything created on the site (horses, actions, events) so the data
// survives page refreshes and redeploys — backed by Netlify Database (managed
// Postgres). Each record lives in its own table as a row keyed by the
// client-generated id, with the full record kept verbatim in a `data` JSON
// column so every field entered on the site is stored and read back exactly.
//
//   GET    -> returns { horses, actions, events } as arrays of records
//   PUT    -> body { collection, item }  upserts one record (insert or update)
//   DELETE -> body { collection, id }    removes one record
//
// The runtime role has SELECT/INSERT/UPDATE/DELETE on these tables (granted by
// the 20260617030000 migration), so writes actually commit — earlier attempts
// failed silently because the role was read-only or because storage was never
// wired to the database at all.
const TABLES = { horses, actions, events };

export const handler = async (event) => {
  try {
    if (event.httpMethod === 'GET') {
      const result = {};
      await Promise.all(
        Object.entries(TABLES).map(async ([name, table]) => {
          const rows = await db.select({ data: table.data }).from(table);
          result[name] = rows.map((row) => row.data);
        }),
      );
      return json(200, result);
    }

    if (event.httpMethod === 'PUT' || event.httpMethod === 'POST') {
      const { collection, item } = JSON.parse(event.body || '{}');
      const table = TABLES[collection];
      if (!table) return json(400, { error: 'Unknown collection' });
      if (!item || !item.id) return json(400, { error: 'Item with an id is required' });

      await db
        .insert(table)
        .values({ id: item.id, data: item })
        .onConflictDoUpdate({
          target: table.id,
          set: { data: item, updatedAt: new Date() },
        });
      return json(200, { ok: true });
    }

    if (event.httpMethod === 'DELETE') {
      const { collection, id } = JSON.parse(event.body || '{}');
      const table = TABLES[collection];
      if (!table) return json(400, { error: 'Unknown collection' });
      if (!id) return json(400, { error: 'An id is required' });

      await db.delete(table).where(eq(table.id, id));
      return json(200, { ok: true });
    }

    return json(405, { error: 'Method not allowed' });
  } catch (error) {
    console.error('Error in store function:', error);
    return json(500, { error: error.message || 'Internal server error' });
  }
};

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
