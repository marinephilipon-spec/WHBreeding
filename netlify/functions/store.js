import { getStore } from '@netlify/blobs';

// Persists everything created on the site (horses, actions, events) so the
// data survives page refreshes and redeploys — backed by Netlify Blobs, a
// zero-configuration object store. No database, roles, migrations, or write
// permissions are involved, which is what kept breaking before.
//
//   GET    -> returns { horses, actions, events } as arrays of records
//   PUT    -> body { collection, item }  upserts one record (insert or update)
//   DELETE -> body { collection, id }    removes one record
//
// Each record is stored as its own JSON blob under the key `<collection>/<id>`.
// Strong consistency is used so a freshly created record is readable
// immediately after a page refresh (the default eventual mode can lag up to a
// minute, which is exactly the "it vanished on refresh" symptom).
const COLLECTIONS = ['horses', 'actions', 'events'];

const store = () => getStore({ name: 'breeding-data', consistency: 'strong' });

export const handler = async (event) => {
  try {
    const data = store();

    if (event.httpMethod === 'GET') {
      const result = {};
      await Promise.all(
        COLLECTIONS.map(async (collection) => {
          const { blobs } = await data.list({ prefix: `${collection}/` });
          const items = await Promise.all(
            blobs.map((b) => data.get(b.key, { type: 'json' })),
          );
          result[collection] = items.filter(Boolean);
        }),
      );
      return json(200, result);
    }

    if (event.httpMethod === 'PUT' || event.httpMethod === 'POST') {
      const { collection, item } = JSON.parse(event.body || '{}');
      if (!COLLECTIONS.includes(collection)) return json(400, { error: 'Unknown collection' });
      if (!item || !item.id) return json(400, { error: 'Item with an id is required' });

      await data.setJSON(`${collection}/${item.id}`, item);
      return json(200, { ok: true });
    }

    if (event.httpMethod === 'DELETE') {
      const { collection, id } = JSON.parse(event.body || '{}');
      if (!COLLECTIONS.includes(collection)) return json(400, { error: 'Unknown collection' });
      if (!id) return json(400, { error: 'An id is required' });

      await data.delete(`${collection}/${id}`);
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
