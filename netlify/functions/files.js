import { getStore } from '@netlify/blobs';

// Stores the actual bytes of files that users upload against a horse profile, so
// a file can be opened and rendered later — not just listed by name. The small
// metadata for each file (id, display name, size, type, date) still lives inside
// the horse record in the `store` function; this function owns only the raw
// content, keyed by the same file id.
//
// Binary content does not belong in the horse JSON record: it would bloat every
// load of the whole dataset and can be megabytes per file. A dedicated Blobs
// store keeps each upload as its own object, fetched only when the user actually
// opens that file.
//
//   POST   /files?id=<id>     body = raw file bytes, Content-Type = the file's
//                             type. Saves the object (content type kept as
//                             metadata so it can be served back correctly).
//   GET    /files?id=<id>     streams the bytes back with the original
//                             Content-Type and an inline disposition, so the
//                             browser renders images/PDFs/etc. directly.
//   DELETE /files?id=<id>     removes the stored object.
//
// Strong consistency mirrors the `store` function: a freshly uploaded file is
// viewable on the very next request instead of lagging behind eventual
// consistency (which would look like a broken link right after upload).
const store = () => getStore({ name: 'file-content', consistency: 'strong' });

const key = (id) => `file/${id}`;

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export default async (req) => {
  try {
    const blobs = store();
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id) return json(400, { error: 'A file id is required' });

    if (req.method === 'POST' || req.method === 'PUT') {
      const data = await req.arrayBuffer();
      const contentType = req.headers.get('content-type') || 'application/octet-stream';
      const name = url.searchParams.get('name') || '';
      await blobs.set(key(id), data, { metadata: { contentType, name } });
      return json(200, { ok: true });
    }

    if (req.method === 'GET') {
      const result = await blobs.getWithMetadata(key(id), { type: 'arrayBuffer' });
      if (!result || !result.data) return json(404, { error: 'File not found' });
      const contentType = result.metadata?.contentType || 'application/octet-stream';
      const name = result.metadata?.name || 'file';
      return new Response(result.data, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          // `inline` asks the browser to render the file in place (image, PDF,
          // text…) rather than forcing a download.
          'Content-Disposition': `inline; filename="${name.replace(/"/g, '')}"`,
          'Cache-Control': 'private, max-age=31536000, immutable',
        },
      });
    }

    if (req.method === 'DELETE') {
      await blobs.delete(key(id));
      return json(200, { ok: true });
    }

    return json(405, { error: 'Method not allowed' });
  } catch (error) {
    console.error('Error in files function:', error);
    return json(500, { error: error.message || 'Internal server error' });
  }
};
