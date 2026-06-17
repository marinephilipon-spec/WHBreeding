import { db } from '../../db/index.js';
import { horses, actions, events } from '../../db/schema.js';
import { eq, asc } from 'drizzle-orm';

// Maps the collection names used by the frontend to their Drizzle tables.
const TABLES = { horses, actions, events };

// Persists everything created on the site (horses, actions, events) so the
// data survives page refreshes and redeploys.
//   GET    -> returns { horses, actions, events } as arrays of records
//   PUT    -> body { collection, item }  upserts one record (insert or update)
//   DELETE -> body { collection, id }    removes one record
export const handler = async (event) => {
  try {
    if (event.httpMethod === 'GET') {
      const [horseRows, actionRows, eventRows] = await Promise.all([
        db.select().from(horses).orderBy(asc(horses.createdAt)),
        db.select().from(actions).orderBy(asc(actions.createdAt)),
        db.select().from(events).orderBy(asc(events.createdAt)),
      ]);
      return json(200, {
        horses: horseRows.map((r) => r.data),
        actions: actionRows.map((r) => r.data),
        events: eventRows.map((r) => r.data),
      });
    }

    if (event.httpMethod === 'PUT' || event.httpMethod === 'POST') {
      const { collection, item } = JSON.parse(event.body || '{}');
      const table = TABLES[collection];
      if (!table) return json(400, { error: 'Unknown collection' });
      if (!item || !item.id) return json(400, { error: 'Item with an id is required' });

      await db
        .insert(table)
        .values({ id: String(item.id), data: item })
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

      await db.delete(table).where(eq(table.id, String(id)));
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
