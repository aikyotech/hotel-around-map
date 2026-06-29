CREATE TABLE IF NOT EXISTS calendar_events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  link TEXT,
  summary TEXT,
  published_at TEXT,
  fetched_at TEXT NOT NULL
);

ALTER TABLE hotel ADD COLUMN shop_categories TEXT NOT NULL DEFAULT '["restaurant","cafe","izakaya"]';

-- Remove previously auto-fetched RSS events that were (incorrectly) stored as map-pinned
-- spots with a guessed/jittered location. They now live in calendar_events instead.
DELETE FROM spots WHERE id LIKE 'spot-event-%';
