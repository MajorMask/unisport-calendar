# UniSport classes → your calendar

This project publishes **8 separate calendar links** — one per location/sport combination — so you can subscribe to only the ones you want and give each a different color in your calendar app. Each class event has a **Book** link that opens UniSport's timetable on that day, so the class is one tap away.

It runs for free on GitHub. Every 3 hours, GitHub calls UniSport's public timetable API and updates all 8 calendar files.

## One-time setup (about 10 minutes, easiest on a computer)

1. **Create a GitHub account** at github.com if you don't have one.
2. **Create a new repository.** Click **+ → New repository**, name it `unisport-calendar`, choose **Public** and click **Create**.
3. **Upload the files.** Click **uploading an existing file**, then drag in everything from this folder, including the hidden `.github` folder. Click **Commit changes**.
   - If `.github` doesn't upload, use **Add file → Create new file**, type `.github/workflows/update.yml` as the name and paste in that file's contents.
4. **Allow the bot to save.** Go to **Settings → Actions → General → Workflow permissions**, choose **Read and write permissions** and click **Save**.
5. **Run it once.** Go to **Actions → Update UniSport calendar → Run workflow**. Tick **debug** and run it. When it turns green, the `.ics` files appear under `docs/` in the repository.
6. **Publish the link.** Go to **Settings → Pages**. Under **Source**, choose **Deploy from a branch**, select branch `master` and folder `/docs`, then click **Save**. After a minute your links are live at:

   `https://YOUR-GITHUB-NAME.github.io/unisport-calendar/<filename>.ics`

## The 8 feeds

| Feed | File |
|---|---|
| Group Exercise – Kluuvi | `group-exercise-kluuvi.ics` |
| Group Exercise – Kumpula | `group-exercise-kumpula.ics` |
| Group Exercise – Meilahti | `group-exercise-meilahti.ics` |
| Group Exercise – Otaniemi | `group-exercise-otaniemi.ics` |
| Group Exercise – University campuses | `group-exercise-campuses.ics` |
| Ball Games – Kumpula | `ball-games-kumpula.ics` |
| Ball Games – Otaniemi | `ball-games-otaniemi.ics` |
| Take a Break (all locations) | `take-a-break.ics` |

"Group Exercise" mixes every class type at that location (yoga, spin, dance, BODYPUMP, etc.) — it's not split further by sport. "Ball Games" mixes floorball/volleyball/basketball drop-ins at that location.

## Subscribe

Subscribe to each feed separately so your calendar app treats them as distinct calendars with their own color:

- **Google Calendar:** on a computer, open calendar.google.com, click **Other calendars + → From URL**, paste a feed's link and click **Add calendar**. Repeat per feed. Then click the three dots next to each new calendar in the sidebar → pick a color.
- **Apple Calendar (iPhone):** go to **Settings → Calendar → Accounts → Add Account → Other → Add Subscribed Calendar**, paste a feed's link. Repeat per feed, then tap each calendar in the Calendars list to set its color.
- **TickTick:** go to **Settings → Calendar → Subscribe Calendar → URL**, paste a feed's link. Repeat per feed; TickTick lets you set a color per subscribed calendar when adding it.

Google refreshes subscribed calendars on its own schedule, often every few hours or more. Apple and TickTick usually refresh more often.

## Choose what shows up, or add more feeds

Edit `config.json` on GitHub using the pencil icon. Each entry in `feeds` is one calendar file:

```json
{
  "filename": "group-exercise-kluuvi.ics",
  "calendarName": "UniSport Group Exercise – Kluuvi",
  "source": { "label": "Group Exercise Kluuvi", "url": "https://oma.enkora.fi/unisport/reservations2/reservations/3/1/-/-/-/-/" }
}
```

To add another feed (e.g. a specific sport, or Gym Guidance), open UniSport's timetable, apply the filter you want, and copy the resulting address as `source.url`. To merge locations into one feed, use a comma-separated location id list in the URL (e.g. `3,5` for Kumpula and Otaniemi together) instead of adding separate feed entries.

The shared `filters` block at the bottom of `config.json` applies to every feed (optional, empty = no filtering):

| Setting | Example | Effect |
|---|---|---|
| `nameIncludes` | `["yin", "hatha"]` | only classes whose name contains one of these words |
| `nameExcludes` | `["vinyasa"]` | hide these |
| `locationIncludes` | `["Kluuvi"]` | only these locations |
| `weekdays` | `["Mon", "Wed"]` | only these days |
| `earliestTime` / `latestTime` | `"16:00"` / `"20:00"` | only classes starting in this window |
| `reminderMinutesBefore` | `60` | phone reminder before each class (`0` for none), set at the top level of `config.json` |
| `daysAhead` | `14` | how far ahead to look, set at the top level of `config.json` |

## If a calendar is empty

This reads UniSport's public API directly. If UniSport changes it, the action may fail or find 0 classes for a feed — the previous file for that feed is kept. To fix it, run the workflow again with **debug** ticked, download the **debug** file from the run page and send it to Claude.

## Good to know

- Booking opens 6 days before a class, and you can hold 7 bookings at once.
- Cancel at least 2 hours before a class to avoid the €5 fee.
- The free-spot counts are from the last refresh, so check UniSport before you go.
- This is an unofficial tool and isn't connected to UniSport.
