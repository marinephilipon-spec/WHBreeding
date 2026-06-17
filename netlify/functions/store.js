import { getStore } from '@netlify/blobs';

// Persists everything created on the site (horses, actions, events) so the data
// survives page refreshes, navigation, and redeploys — backed by Netlify Blobs,
// a zero-configuration object store that is built into the Netlify runtime.
//
// Why Blobs instead of a database: this data is just self-contained JSON records
// keyed by a client-generated id. There is nothing relational to query or join —
// the site loads everything at once and saves one record at a time. Blobs needs
// no connection string, no driver, and no migrations, so the whole class of
// deploy-only connection/bundling failures that plagued the database approach
// simply cannot happen here.
//
// Each record is stored as its own blob under the key `<collection>/<id>` (e.g.
// `horses/abc123`). Storing one blob per record — rather than one big array per
// collection — means two rapid saves to different records can never clobber each
// other, and a delete only touches the one record.
//
//   GET    -> returns { horses, actions, events } as arrays of records
//   PUT    -> body { collection, item }  saves one record (key collection/id)
//   DELETE -> body { collection, id }    removes one record
//
// Strong consistency is used so a record is readable on the very next request —
// without it, a save followed immediately by a refresh could read stale data
// (Blobs' default eventual consistency can lag up to ~60s), which would look
// exactly like "nothing saved".
const COLLECTIONS = ['horses', 'actions', 'events'];

const store = () => getStore({ name: 'app-data', consistency: 'strong' });

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export default async (req) => {
  try {
    const blobs = store();

    if (req.method === 'GET') {
      const result = {};
      await Promise.all(
        COLLECTIONS.map(async (collection) => {
          const { blobs: entries } = await blobs.list({ prefix: `${collection}/` });
          const records = await Promise.all(
            entries.map((entry) => blobs.get(entry.key, { type: 'json' })),
          );
          result[collection] = records.filter(Boolean);
        }),
      );
      return json(200, result);
    }

    if (req.method === 'PUT' || req.method === 'POST') {
      const { collection, item } = await req.json().catch(() => ({}));
      if (!COLLECTIONS.includes(collection)) return json(400, { error: 'Unknown collection' });
      if (!item || !item.id) return json(400, { error: 'Item with an id is required' });

      await blobs.setJSON(`${collection}/${item.id}`, item);
      return json(200, { ok: true });
    }

    if (req.method === 'DELETE') {
      const { collection, id } = await req.json().catch(() => ({}));
      if (!COLLECTIONS.includes(collection)) return json(400, { error: 'Unknown collection' });
      if (!id) return json(400, { error: 'An id is required' });

      await blobs.delete(`${collection}/${id}`);
      return json(200, { ok: true });
    }

    return json(405, { error: 'Method not allowed' });
  } catch (error) {
    console.error('Error in store function:', error);
    return json(500, { error: error.message || 'Internal server error' });
  }
};
