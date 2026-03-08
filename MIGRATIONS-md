# Handling database migrations with stale frontend versions

## The Core Problem
You can have 3+ versions of your frontend "alive" simultaneously:

Users with the old SW (haven't accepted update yet)
Users mid-session (page open, SW just updated in background)
Users with the new SW

Your backend + DB is only ever one version. So migrations must never break older frontends that are still sending requests.

 - Rule #1:
Never make breaking migrations directly
The golden rule is: expand, then contract (also called the two-phase migration pattern).
Instead of ALTER TABLE items DROP COLUMN foo in one deploy, you do it across two:
   - Deploy 1 — Expand: Add new columns/tables, keep old ones. Both old and new frontend work fine.
   - Deploy 2 — Contract: Once you're confident no old frontend clients are around (or they've all updated), drop the old column/table.
For a field rename, it becomes three phases:
   - Add the new column, write to both old + new
   - Migrate data, switch reads to new column
   - Drop old column

 - Rule #2:
Version your API
Add a version header or URL prefix (/api/v2/...) and teach your backend to accept requests from multiple frontend versions simultaneously. When you receive a request, you know which "shape" of data to expect.
A lightweight approach is a custom header:
```js
// Frontend — set on every request
headers: { 'X-App-Version': APP_VERSION }
```
```js
// Backend — log it, and use it to route/validate
const clientVersion = req.headers['x-app-version'];
```
This lets you deprecate old API shapes gracefully rather than hard-breaking them.

 - Rule #3:
Make your API accept partial/extra fields gracefully
Your backend should be liberal in what it accepts:
   - Ignore unknown fields (don't throw on extra columns the new schema doesn't have)
   - Treat missing fields as null/default, not as errors
If you're using something like Zod or Joi for validation, use .passthrough() or .strip() rather than erroring on unknown keys.

 - Rule #4:
Force SW updates for breaking changes
When a deploy truly is breaking and you can't avoid it, you need a way to force clients off the old version.
Two approaches:
   - A) Version polling: The frontend periodically pings /api/version and compares to its own build hash. If they differ, show a non-dismissable "Please refresh to get the latest version" banner.
```js
// In your SW or main app
setInterval(async () => {
  const { version } = await fetch('/api/version').then(r => r.json());
  if (version !== APP_VERSION) showUpdateBanner();
}, 60_000);
```
   - B) API response header: Piggyback on every API response:
```js
// Backend — add to every response
res.setHeader('X-App-Version', SERVER_VERSION);
```
```js
// Frontend — check on every fetch response
if (res.headers.get('X-App-Version') !== APP_VERSION) showUpdateBanner();
```
This is elegant because it requires zero extra requests.

 - Rule #5:
Handle 4xx/5xx gracefully in the UI
Even with all the above, edge cases slip through. Your frontend should:
    - Catch 400/422 errors and show "Something went wrong — your app may be outdated. Please refresh."
    - Never silently lose user data — if a save fails, keep the data in memory or localStorage and retry after refresh

 - Rule #6:
Make migrations idempotent and backwards-compatible in your runner
Your migration runner on server start should:
    - Use IF NOT EXISTS / IF EXISTS guards
    - Never rename a column in place — add new, copy, drop old (in separate deploys)
    - Log the migration version in a _migrations table and never re-run

## Practical checklist for each deploy
    
| Change type         | Safe to do directly? | Strategy                                                      |
|---------------------|----------------------|---------------------------------------------------------------|
| Add nullable column | ✅ Yes               | Just add it                                                   |
| Add NOT NULL column | ⚠️                   | Add nullable first, backfill, then add constraint             |
| Remove column       | ❌ No                | Stop using it in code first, deploy, then drop in next deploy |
| Rename column       | ❌ No                | Add new, dual-write, migrate, drop old                        |
| Add table           | ✅ Yes               | Safe                                                          |
| Remove table        | ❌ No                | Stop referencing it first, then drop next deploy              |
| Change column type  | ❌ No                | New column + migration                                        |

### Fly.io specific note
On Fly.io, if you're running multiple instances, migrations can race. Protect yourself with a simple lock:
 #### In your migration runner
  ```js
  await db.run(`CREATE TABLE IF NOT EXISTS _migration_lock (locked INTEGER)`);
  const lock = await db.get(`SELECT locked FROM _migration_lock`);
  if (lock?.locked) { console.log('Migration already running'); return; }
  await db.run(`INSERT INTO _migration_lock VALUES (1)`);
  // ... run migrations ...
  await db.run(`DELETE FROM _migration_lock`);
  ```
Or use Fly's [deploy] release command with only_one_instance = true to ensure migrations only run on one machine before traffic is routed.

### TL;DR:
Treat your DB schema and API as append-only during a deploy window, and clean up in a follow-up deploy once you're sure old clients are gone. The version-check header pattern is cheap to implement and solves 90% of the user-experience friction.