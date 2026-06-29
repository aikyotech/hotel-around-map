/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Hono } from 'hono';
import type { Spot } from '../types';
import type { Bindings } from './bindings';
import {
  deleteSpot,
  getCalendarEvents,
  getHotelConfig,
  getSpotsWithComputedValues,
  getStats,
  incrementPv,
  insertSpot,
  updateHotelConfig,
  updateSpot,
  type HotelConfig,
} from './db';
import { runExternalRefresh } from './external-sources';
import { geocodeAddress } from './geocode';

const app = new Hono<{ Bindings: Bindings }>();

// ---- Hotel configuration ----
app.get('/api/hotel', async (c) => {
  const hotel = await getHotelConfig(c.env.DB);
  return c.json(hotel);
});

app.post('/api/hotel', async (c) => {
  const { name, latitude, longitude } = await c.req.json();
  if (!name || isNaN(Number(latitude)) || isNaN(Number(longitude))) {
    return c.json({ error: 'Invalid hotel data' }, 400);
  }
  const updated: HotelConfig = { name: String(name), latitude: Number(latitude), longitude: Number(longitude) };
  await updateHotelConfig(c.env.DB, updated);
  return c.json(updated);
});

// ---- Address geocoding (free, Japan-only, no API key) ----
app.get('/api/geocode', async (c) => {
  const address = c.req.query('q');
  if (!address || address.trim() === '') {
    return c.json({ error: 'q (address) parameter is required' }, 400);
  }
  try {
    const results = await geocodeAddress(address.trim());
    return c.json(results);
  } catch (e: any) {
    return c.json({ error: '住所検索に失敗しました', details: e?.message || String(e) }, 500);
  }
});

// ---- Local event calendar (auto-fetched, no reliable venue coordinates) ----
app.get('/api/events', async (c) => {
  return c.json(await getCalendarEvents(c.env.DB));
});

// ---- Spots CRUD ----
app.get('/api/spots', async (c) => {
  return c.json(await getSpotsWithComputedValues(c.env.DB));
});

app.post('/api/spots', async (c) => {
  const body = await c.req.json();
  const { type, source, name, description, latitude, longitude, tags, image_urls, event_start_at, event_end_at, status, google_maps_url } = body;

  if (!name?.ja || !latitude || !longitude) {
    return c.json({ error: 'Spot Japanese name, latitude, and longitude are required' }, 400);
  }

  const newSpot: Spot = {
    id: 'spot-' + Date.now(),
    type: type || 'restaurant',
    source: source || 'hotel_master',
    name,
    description: description || { ja: '', en: '', zh_cn: '', zh_tw: '', ko: '' },
    latitude: Number(latitude),
    longitude: Number(longitude),
    tags: Array.isArray(tags) ? tags : [],
    image_urls: Array.isArray(image_urls) ? image_urls : [],
    event_start_at: event_start_at || undefined,
    event_end_at: event_end_at || undefined,
    status: status || 'active',
    created_at: new Date().toISOString(),
    google_maps_url: google_maps_url || undefined,
  };

  await insertSpot(c.env.DB, newSpot);
  return c.json(newSpot, 201);
});

app.put('/api/spots/:id', async (c) => {
  const updated = await updateSpot(c.env.DB, c.req.param('id'), await c.req.json());
  if (!updated) return c.json({ error: 'Spot not found' }, 404);
  return c.json(updated);
});

app.delete('/api/spots/:id', async (c) => {
  const ok = await deleteSpot(c.env.DB, c.req.param('id'));
  if (!ok) return c.json({ error: 'Spot not found' }, 404);
  return c.json({ success: true, message: 'Deleted successfully' });
});

// ---- Stats ----
app.get('/api/stats', async (c) => {
  return c.json(await getStats(c.env.DB));
});

app.post('/api/stats/pv', async (c) => {
  const pvCount = await incrementPv(c.env.DB);
  return c.json({ success: true, pvCount });
});

// ---- Image upload (Cloudflare Workers KV) ----
app.post('/api/upload', async (c) => {
  const body = await c.req.parseBody();
  const file = body['image'];

  if (!(file instanceof File)) {
    return c.json({ error: '画像ファイルが見つかりません' }, 400);
  }
  if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) {
    return c.json({ error: '対応していない画像形式です（JPEG/PNG/WEBP/GIFのみ）' }, 400);
  }
  if (file.size > 15 * 1024 * 1024) {
    return c.json({ error: 'ファイルサイズは15MBまでです' }, 400);
  }

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const key = `spot-${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
  await c.env.IMAGES.put(key, await file.arrayBuffer(), {
    metadata: { contentType: file.type },
  });

  return c.json({ url: `/uploads/${key}` });
});

app.get('/uploads/:key', async (c) => {
  const result = await c.env.IMAGES.getWithMetadata(c.req.param('key'), 'arrayBuffer');
  if (!result.value) return c.notFound();
  const contentType = (result.metadata as { contentType?: string } | null)?.contentType;
  return new Response(result.value, {
    headers: {
      'Content-Type': contentType || 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
});

// ---- Auto-pickup of nearby event info without an AI API key (Dogo Onsen-area RSS feeds) ----
app.post('/api/spots/external-refresh', async (c) => {
  try {
    const result = await runExternalRefresh(c.env.DB);
    return c.json({ success: true, ...result });
  } catch (e: any) {
    console.error('[CONCIERGE SERVER] External refresh failed:', e);
    return c.json({ error: '周辺イベント情報の自動取得に失敗しました', details: e?.message || String(e) }, 500);
  }
});

export default {
  fetch: app.fetch,
  // Daily Cron Trigger (see wrangler.jsonc) keeps the local event calendar fresh automatically.
  async scheduled(_controller: ScheduledController, env: Bindings) {
    await runExternalRefresh(env.DB);
  },
} satisfies ExportedHandler<Bindings>;
