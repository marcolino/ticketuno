# Database Migrations

Migrations are applied automatically on startup.

## Creating a new migration

1. Create a new file: `XXXXX_description.sql` (e.g., `00003_add_bookings_table.sql`)
2. Write your SQL changes
3. On next deploy, it will auto-apply

## Migration files

- `00001_initial_schema.sql` - Initial tables (theaters, users, events, performances)
- `00002_add_indexes.sql` - Performance indexes

## Manual migration

If needed: `sqlite3 /data/theaters.db < migrations/XXXXX_name.sql`