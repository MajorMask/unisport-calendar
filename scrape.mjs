// Calls UniSport's public timetable API directly and writes one docs/<feed>.ics
// (subscribe to each separately) plus a matching docs/<feed>.json per feed in config.json.
import fs from 'node:fs/promises';
import { DateTime } from 'luxon';
import { extractEvents, applyFilters, bookingLink, toICS } from './lib.mjs';

const cfg = JSON.parse(await fs.readFile(process.env.CONFIG || new URL('./config.json', import.meta.url)));
const zone = cfg.timezone || 'Europe/Helsinki';
const debug = process.argv.includes('--debug');
await fs.mkdir('docs', { recursive: true });
if (debug) await fs.mkdir('debug', { recursive: true });

// The booking URL (used for the per-class deep link) encodes the API query as path
// segments: .../reservations/{service_id}/{location_ids}/{group_ids}/-/-/-/
function parseSourceUrl(url) {
  const m = new URL(url).pathname.match(/\/reservations\/(\d+)\/([^/]*)\/([^/]*)/);
  if (!m) throw new Error(`Could not parse source url: ${url}`);
  const [, service_id, location_ids, group_ids] = m;
  const clean = (s) => (s === '-' ? '' : s);
  return { service_id, location_ids: clean(location_ids), group_ids: clean(group_ids) };
}

let anyFound = false;
for (const feed of cfg.feeds) {
  const { source } = feed;
  const { service_id, location_ids, group_ids } = parseSourceUrl(source.url);
  const from = DateTime.now().setZone(zone).toISODate();
  const to = DateTime.now().setZone(zone).plus({ days: cfg.daysAhead }).toISODate();
  const api = new URL('https://oma.enkora.fi/unisport/reservations2/apievents');
  api.search = new URLSearchParams({ date: `${from}--${to}`, service_id, location_ids, group_ids, instructor_ids: '' }).toString();

  let body = [];
  try {
    const res = await fetch(api, { headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    body = await res.json();
  } catch (err) {
    console.warn(`Could not fetch ${api}: ${err.message}`);
  }
  if (debug) await fs.writeFile(`debug/response-${source.label}.json`, JSON.stringify(body, null, 2));

  const found = extractEvents(body, zone).map((e) => ({ ...e, source: source.label, bookUrl: bookingLink(source.url, e.start, zone) }));
  console.log(`${source.label} ${from}..${to}: ${Array.isArray(body) ? body.length : 0} raw entries, ${found.length} class entries`);
  if (found.length > 0) anyFound = true;

  const jsonPath = `docs/${feed.filename.replace(/\.ics$/, '.json')}`;
  let previous = [];
  try { previous = JSON.parse(await fs.readFile(jsonPath, 'utf8')); } catch { /* first run */ }
  const cutoff = DateTime.utc().minus({ days: cfg.keepPastDays ?? 7 });
  const byKey = new Map();
  for (const e of [...previous, ...found]) {
    if (DateTime.fromISO(e.end) < cutoff) continue;
    byKey.set(`${e.name}|${e.start}|${e.location}`, e);
  }
  const fresh = applyFilters([...byKey.values()], cfg.filters, zone);

  if (found.length === 0 && previous.length === 0) {
    console.error(`${source.label}: no classes found and no previous data. Skipping write.`);
    continue;
  }
  await fs.writeFile(jsonPath, JSON.stringify(fresh, null, 2));
  await fs.writeFile(`docs/${feed.filename}`, toICS(fresh, { calendarName: feed.calendarName, reminderMinutesBefore: cfg.reminderMinutesBefore }));
  console.log(`Wrote ${fresh.length} classes to docs/${feed.filename}`);
}

if (!anyFound) {
  console.error('No classes found on any feed. Run with --debug and check the debug folder.');
  process.exitCode = 1;
}
