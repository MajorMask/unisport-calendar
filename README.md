# UniSport classes → your calendar

This project gives you a calendar link with UniSport group exercise classes, ball game groups and Take a Break sessions. You can subscribe to it in Google Calendar, Apple Calendar or TickTick. Each class event has a **Book** link that opens UniSport's timetable on that day, so the class is one tap away.

It runs for free on GitHub. Every 3 hours, GitHub opens the public UniSport timetable, reads the classes and updates the calendar file.

## One-time setup (about 10 minutes, easiest on a computer)

1. **Create a GitHub account** at github.com if you don't have one.
2. **Create a new repository.** Click **+ → New repository**, name it `unisport-calendar`, choose **Public** and click **Create**.
3. **Upload the files.** Click **uploading an existing file**, then drag in everything from this folder, including the hidden `.github` folder. Click **Commit changes**.
   - If `.github` doesn't upload, use **Add file → Create new file**, type `.github/workflows/update.yml` as the name and paste in that file's contents.
4. **Allow the bot to save.** Go to **Settings → Actions → General → Workflow permissions**, choose **Read and write permissions** and click **Save**.
5. **Run it once.** Go to **Actions → Update UniSport calendar → Run workflow**. Tick **debug** and run it. When it turns green, `docs/unisport.ics` appears in the repository.
6. **Publish the link.** Go to **Settings → Pages**. Under **Source**, choose **Deploy from a branch**, select branch `main` and folder `/docs`, then click **Save**. After a minute your link is:

   `https://YOUR-GITHUB-NAME.github.io/unisport-calendar/unisport.ics`

## Subscribe

- **Google Calendar:** on a computer, open calendar.google.com, click **Other calendars + → From URL**, paste the link and click **Add calendar**. The calendar then shows up on your phone too.
- **Apple Calendar (iPhone):** go to **Settings → Calendar → Accounts → Add Account → Other → Add Subscribed Calendar** and paste the link.
- **TickTick:** go to **Settings → Calendar → Subscribe Calendar → URL** and paste the link.

Google refreshes subscribed calendars on its own schedule, often every few hours or more. Apple and TickTick usually refresh more often.

## Choose what shows up

Edit `config.json` on GitHub using the pencil icon. Every filter is optional, and an empty list means "everything":

| Setting | Example | Effect |
|---|---|---|
| `nameIncludes` | `["yin", "hatha"]` | only classes whose name contains one of these words |
| `nameExcludes` | `["vinyasa"]` | hide these |
| `locationIncludes` | `["Kluuvi", "Otaniemi"]` | only these locations |
| `weekdays` | `["Mon", "Wed"]` | only these days |
| `earliestTime` / `latestTime` | `"16:00"` / `"20:00"` | only classes starting in this window |
| `reminderMinutesBefore` | `60` | phone reminder before each class (`0` for none) |
| `daysAhead` | `14` | how far ahead to look |

To add another sport, open UniSport's timetable, filter it the way you want, and copy the address into `sources` with its own label.

## If the calendar is empty

This reads UniSport's website the way a browser would. If UniSport changes the site, the action may fail or find 0 classes. When that happens, the previous calendar is kept. To fix it, run the workflow again with **debug** ticked, download the **debug** file from the run page and send it to Claude.

## Good to know

- Booking opens 6 days before a class, and you can hold 7 bookings at once.
- Cancel at least 2 hours before a class to avoid the €5 fee.
- The free-spot counts are from the last refresh, so check UniSport before you go.
- This is an unofficial tool and isn't connected to UniSport.
