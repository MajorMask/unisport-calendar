// Pure helpers: find class events inside captured JSON, filter them, and write an .ics file.
import { DateTime } from 'luxon';

const START_KEYS = /^(start|starts|start_?time|start_?date|start_?at|begin|begins|alku|from|time_?start|reservation_?start|event_?start)$/i;
const END_KEYS = /^(end|ends|end_?time|end_?date|end_?at|finish|loppu|to|time_?end|reservation_?end|event_?end)$/i;
const DURATION_KEYS = /^(duration|length|kesto|duration_?min(utes)?)$/i;
const NAME_KEYS = /^(name|title|nimi|activity_?name|service_?name|event_?name|description|label)$/i;
const LOCATION_KEYS = /^(location|location_?name|venue|place|paikka|resource|resource_?name|room|hall|sali|facility|unit|unit_?name)$/i;
const INSTRUCTOR_KEYS = /^(instructor|instructors|teacher|ohjaaja|trainer|coach)$/i;
const FREE_KEYS = /^(free|free_?spots|available|available_?spots|vapaa|vapaita|places_?left|remaining|free_?places)$/i;
const CAPACITY_KEYS = /^(capacity|max|max_?participants|quota|size|kapasiteetti)$/i;
const ID_KEYS = /^(id|event_?id|reservation_?event_?id|uuid)$/i;

function text(v) {
  if (v == null) return '';
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number') return String(v);
  if (Array.isArray(v)) return v.map(text).filter(Boolean).join(', ');
  if (typeof v === 'object') {
    for (const k of Object.keys(v)) if (NAME_KEYS.test(k) && typeof v[k] === 'string') return v[k].trim();
    for (const k of ['fi', 'en', 'sv']) if (typeof v[k] === 'string') return v[k].trim();
  }
  return '';
}

export function parseTime(v, zone) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') {
    const ms = v > 1e12 ? v : v > 1e9 ? v * 1000 : null;
    return ms ? DateTime.fromMillis(ms, { zone }) : null;
  }
  if (typeof v !== 'string') return null;
  const s = v.trim();
  if (!/\d{4}-\d{2}-\d{2}[ T]\d{1,2}:\d{2}/.test(s) && !/^\d{1,2}\.\d{1,2}\.\d{4} \d{1,2}[:.]\d{2}/.test(s)) return null;
  let dt = DateTime.fromISO(s.replace(' ', 'T'), { zone, setZone: /[zZ]|[+-]\d{2}:?\d{2}$/.test(s) });
  if (!dt.isValid) dt = DateTime.fromFormat(s, 'd.M.yyyy H:mm', { zone });
  if (!dt.isValid) dt = DateTime.fromFormat(s, 'd.M.yyyy H.mm', { zone });
  return dt.isValid ? dt : null;
}

function pick(obj, re) {
  for (const k of Object.keys(obj)) if (re.test(k)) return obj[k];
  return undefined;
}

// Walk any JSON shape and collect objects that look like a scheduled class.
export function extractEvents(json, zone = 'Europe/Helsinki') {
  const out = [];
  const seen = new Set();
  const walk = (node, parentName) => {
    if (Array.isArray(node)) { node.forEach((n) => walk(n, parentName)); return; }
    if (!node || typeof node !== 'object') return;
    const nested = pick(node, /^(service|activity|event_?type|product|class|lesson|course)$/i);
    const ownName = text(pick(node, NAME_KEYS)) || (nested && typeof nested === 'object' ? text(nested) : '');
    const start = parseTime(pick(node, START_KEYS), zone);
    if (start) {
      let end = parseTime(pick(node, END_KEYS), zone);
      const dur = Number(pick(node, DURATION_KEYS));
      if (!end && dur > 0 && dur < 600) end = start.plus({ minutes: dur });
      const name = ownName || parentName;
      if (end && name && end > start && end.diff(start, 'hours').hours <= 12) {
        const free = pick(node, FREE_KEYS);
        const ev = {
          id: text(pick(node, ID_KEYS)),
          name,
          start: start.toUTC().toISO(),
          end: end.toUTC().toISO(),
          location: text(pick(node, LOCATION_KEYS)),
          instructor: text(pick(node, INSTRUCTOR_KEYS)),
          free: typeof free === 'number' || /^\d+$/.test(String(free ?? '')) ? Number(free) : null,
          capacity: Number(pick(node, CAPACITY_KEYS)) || null,
        };
        const key = `${ev.name}|${ev.start}|${ev.location}`;
        if (!seen.has(key)) { seen.add(key); out.push(ev); }
      }
    }
    for (const v of Object.values(node)) if (v && typeof v === 'object') walk(v, ownName || parentName);
  };
  walk(json, '');
  return out;
}

export function applyFilters(events, f = {}, zone = 'Europe/Helsinki') {
  const has = (list, s) => !list?.length || list.some((w) => s.toLowerCase().includes(w.toLowerCase()));
  const hasNot = (list, s) => !list?.length || !list.some((w) => s.toLowerCase().includes(w.toLowerCase()));
  return events.filter((e) => {
    const local = DateTime.fromISO(e.start).setZone(zone);
    const hhmm = local.toFormat('HH:mm');
    if (!has(f.nameIncludes, e.name) || !hasNot(f.nameExcludes, e.name)) return false;
    if (!has(f.locationIncludes, e.location)) return false;
    if (f.weekdays?.length && !f.weekdays.map((d) => d.toLowerCase().slice(0, 3)).includes(local.setLocale('en').toFormat('ccc').toLowerCase())) return false;
    if (f.earliestTime && hhmm < f.earliestTime) return false;
    if (f.latestTime && hhmm > f.latestTime) return false;
    return true;
  });
}

// Link that opens the same timetable on the class's day, one tap from the class itself.
export function bookingLink(sourceUrl, startIso, zone) {
  const day = DateTime.fromISO(startIso).setZone(zone).toISODate();
  const base = sourceUrl.split('~')[0].split('?')[0].replace(/\/?$/, '/');
  return `${base}~date=${day}`;
}

const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const stamp = (iso) => DateTime.fromISO(iso).toUTC().toFormat("yyyyMMdd'T'HHmmss'Z'");
function fold(line) {
  const parts = [];
  let s = line;
  while (Buffer.byteLength(s) > 75) {
    let n = 74;
    while (Buffer.byteLength(s.slice(0, n)) > 74) n--;
    parts.push(s.slice(0, n));
    s = ' ' + s.slice(n);
  }
  parts.push(s);
  return parts.join('\r\n');
}

export function toICS(events, { calendarName, reminderMinutesBefore, now = DateTime.utc().toISO() }) {
  const L = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//unisport-calendar//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    `X-WR-CALNAME:${esc(calendarName)}`, 'X-WR-TIMEZONE:Europe/Helsinki', 'REFRESH-INTERVAL;VALUE=DURATION:PT3H', 'X-PUBLISHED-TTL:PT3H',
  ];
  for (const e of [...events].sort((a, b) => a.start.localeCompare(b.start))) {
    const uid = `${(e.id || `${e.name}-${e.start}-${e.location}`).replace(/[^\w.-]+/g, '-')}@unisport-calendar`;
    const spots = e.free != null ? `Free spots when last checked: ${e.free}${e.capacity ? ` / ${e.capacity}` : ''}` : '';
    const desc = [`Book: ${e.bookUrl}`, e.instructor && `Instructor: ${e.instructor}`, spots,
      'Booking opens 6 days before. Cancel at least 2 h before to avoid the 5 EUR fee.'].filter(Boolean).join('\n');
    L.push('BEGIN:VEVENT', `UID:${uid}`, `DTSTAMP:${stamp(now)}`, `DTSTART:${stamp(e.start)}`, `DTEND:${stamp(e.end)}`,
      `SUMMARY:${esc(e.name)}`);
    if (e.location) L.push(`LOCATION:${esc(e.location)}`);
    L.push(`DESCRIPTION:${esc(desc)}`, `URL:${e.bookUrl}`);
    if (reminderMinutesBefore > 0) L.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(e.name)}`, `TRIGGER:-PT${reminderMinutesBefore}M`, 'END:VALARM');
    L.push('END:VEVENT');
  }
  L.push('END:VCALENDAR');
  return L.map(fold).join('\r\n') + '\r\n';
}
