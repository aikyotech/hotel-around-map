/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Auto-pickup of nearby event info that doesn't depend on a paid AI API key:
 * - Local events: RSS feeds from two Dogo Onsen-area sites (real, verified syndication feeds)
 */

import { XMLParser } from 'fast-xml-parser';
import type { CalendarEvent } from '../types';
import { replaceCalendarEvents, touchStatsUpdated } from './db';

// Verified live RSS feeds, run by two different operators, covering the Dogo Onsen area:
// - dogo.or.jp: the official area guide (tourism association), "event" category
// - dogo.jp: the Dogo Onsen Consortium, which directly operates Honkan / Asuka-no-yu /
//   Tsubaki-no-yu, so it covers bathhouse-specific notices (fee changes, closures, art
//   exhibitions) that the area guide doesn't always carry.
const EVENT_FEED_URLS = [
  'https://www.dogo.or.jp/event_news-category/event/feed/',
  'https://dogo.jp/feed/',
];

function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

// Some WordPress feeds (including this one) emit numeric character references like "&#038;"
// for "&" inside <link> query strings instead of plain text, which would otherwise end up
// literally embedded in the href.
function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, '&');
}

// Many of this feed's titles embed the actual event date in Japanese, e.g. "（6月28日）",
// which is the only reliable signal for whether the event itself is still upcoming (the
// RSS pubDate is just when the announcement was posted, often weeks/months earlier).
const JP_DATE_IN_TITLE = /(\d{1,2})月(\d{1,2})日/;

function resolveEventDate(title: string, pubDate: Date | null): Date | null {
  const match = title.match(JP_DATE_IN_TITLE);
  if (!match) return null;

  const month = Number(match[1]);
  const day = Number(match[2]);
  const baseYear = (pubDate ?? new Date()).getFullYear();
  let candidate = new Date(baseYear, month - 1, day);

  // If the parsed date is more than ~2 months before the post date, it's almost certainly
  // referring to next year (e.g. a December post announcing a January event).
  if (pubDate && candidate.getTime() < pubDate.getTime() - 60 * 24 * 60 * 60 * 1000) {
    candidate = new Date(baseYear + 1, month - 1, day);
  }
  return candidate;
}

interface ParsedRssItem {
  title: string;
  link: string;
  summary: string;
  pubDate: Date | null;
  eventDate: Date | null;
  isUpcoming: boolean;
}

async function fetchSingleRssFeed(feedUrl: string): Promise<ParsedRssItem[]> {
  const res = await fetch(feedUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HotelConciergeBot/1.0)' },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    throw new Error(`RSS feed fetch failed (${feedUrl}) with status ${res.status}`);
  }

  const xml = await res.text();
  const parser = new XMLParser();
  const parsed = parser.parse(xml);
  const rawItems = parsed?.rss?.channel?.item;
  const items = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const recentCutoff = today.getTime() - 21 * 24 * 60 * 60 * 1000; // 3-week grace window

  return items.map((item: Record<string, unknown>): ParsedRssItem => {
    const title = decodeHtmlEntities(stripHtml(String(item.title ?? ''))) || '道後温泉エリアのイベント';
    const link = decodeHtmlEntities(String(item.link ?? '').trim());
    const summary = decodeHtmlEntities(stripHtml(String(item.description ?? ''))).slice(0, 200);
    const pubDateRaw = item.pubDate ? new Date(String(item.pubDate)) : null;
    const pubDate = pubDateRaw && !isNaN(pubDateRaw.getTime()) ? pubDateRaw : null;
    const eventDate = resolveEventDate(title, pubDate);

    return {
      title, link, summary, pubDate, eventDate,
      // If the title has no parseable date, fall back to how recently it was announced
      // as a proxy for whether the event is still relevant.
      isUpcoming: eventDate ? eventDate.getTime() >= today.getTime() : !pubDate || pubDate.getTime() >= recentCutoff,
    };
  });
}

// Returned as calendar listings (title/date/link only) rather than map-pinned spots, because
// these RSS feeds don't include reliable per-event venue coordinates. Guessing/anchoring a
// location for these previously caused event pins to show up at the wrong place on the map.
export async function fetchEventsFromRss(feedUrls: string[] = EVENT_FEED_URLS): Promise<CalendarEvent[]> {
  const results = await Promise.allSettled(feedUrls.map(fetchSingleRssFeed));

  const seenTitles = new Set<string>();
  const merged: ParsedRssItem[] = [];
  for (const result of results) {
    if (result.status !== 'fulfilled') {
      console.error('[external-refresh] RSS feed failed:', result.reason);
      continue;
    }
    for (const item of result.value) {
      if (seenTitles.has(item.title)) continue; // dedupe events reported by both feeds
      seenTitles.add(item.title);
      merged.push(item);
    }
  }

  if (merged.length === 0 && results.every((r) => r.status === 'rejected')) {
    throw new Error('All event RSS feeds failed: ' + results.map((r) => (r as PromiseRejectedResult).reason?.message || String((r as PromiseRejectedResult).reason)).join(' | '));
  }

  return merged
    .filter((e) => e.isUpcoming)
    .sort((a, b) => (b.pubDate?.getTime() ?? 0) - (a.pubDate?.getTime() ?? 0))
    .slice(0, 10)
    .map((e, index): CalendarEvent => ({
      id: `calendar-event-${index}`,
      title: e.title,
      link: e.link || undefined,
      summary: e.summary || undefined,
      publishedAt: e.pubDate ? e.pubDate.toISOString() : undefined,
    }));
}

export interface ExternalRefreshResult {
  eventCount: number;
  eventError?: string;
}

export async function runExternalRefresh(db: D1Database): Promise<ExternalRefreshResult> {
  const result: ExternalRefreshResult = { eventCount: 0 };
  try {
    const calendarEvents = await fetchEventsFromRss();
    await replaceCalendarEvents(db, calendarEvents);
    result.eventCount = calendarEvents.length;
  } catch (e: any) {
    console.error('[external-refresh] RSS fetch failed:', e);
    result.eventError = e?.message || String(e);
  }
  await touchStatsUpdated(db);
  return result;
}
