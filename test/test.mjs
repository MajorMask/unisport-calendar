import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { extractEvents, applyFilters, bookingLink, toICS } from '../lib.mjs';

const zone = 'Europe/Helsinki';
// Shape A: flat list with local times
const a = { data: [
  { id: 101, name: 'Yin Yoga', start_time: '2026-10-05 17:00:00', end_time: '2026-10-05 18:00:00', location: { name: 'Kluuvi' }, instructor: 'Anna', free: 4, capacity: 25 },
  { id: 102, name: 'Hatha Yoga', start_time: '2026-10-06 07:30:00', end_time: '2026-10-06 08:30:00', location: { name: 'Otaniemi' }, free: 0 },
]};
// Shape B: nested service name, ISO with offset, duration in minutes
const b = { days: [{ events: [
  { event_id: 'x9', service: { name: 'Vinyasa Flow' }, start: '2026-10-07T16:00:00+03:00', duration: 75, resource: 'Meilahti' },
]}]};
// Shape C: noise that must be ignored
const c = { user: null, settings: { from: 'x', to: 'y' }, news: [{ title: 'Hello', date: '2026-10-05' }] };

const evA = extractEvents(a, zone), evB = extractEvents(b, zone), evC = extractEvents(c, zone);
assert.equal(evA.length, 2); assert.equal(evB.length, 1); assert.equal(evC.length, 0);
assert.equal(evA[0].start, '2026-10-05T14:00:00.000Z'); // 17:00 Helsinki (EEST) = 14:00 UTC
assert.equal(evA[0].location, 'Kluuvi'); assert.equal(evA[0].free, 4);
assert.equal(evB[0].name, 'Vinyasa Flow'); assert.equal(evB[0].end, '2026-10-07T14:15:00.000Z');

const src = 'https://oma.enkora.fi/unisport/reservations2/reservations/3/1,13,3,4,5,7/1/-/-/-/';
assert.equal(bookingLink(src, evA[0].start, zone), src + '~date=2026-10-05');

const all = [...evA, ...evB].map((e) => ({ ...e, bookUrl: bookingLink(src, e.start, zone) }));
assert.equal(applyFilters(all, { locationIncludes: ['kluuvi'] }, zone).length, 1);
assert.equal(applyFilters(all, { earliestTime: '09:00' }, zone).length, 2);
assert.equal(applyFilters(all, { weekdays: ['Mon', 'Wednesday'] }, zone).length, 2);
assert.equal(applyFilters(all, { nameExcludes: ['yin'] }, zone).length, 2);

const ics = toICS(all, { calendarName: 'UniSport Yoga', reminderMinutesBefore: 60, now: '2026-10-02T10:00:00Z' });
await fs.writeFile('test/sample.ics', ics);
assert.match(ics, /DTSTART:20261005T140000Z/);
assert.ok(ics.split('\r\n').every((l) => Buffer.byteLength(l) <= 75));
console.log('All tests passed');
