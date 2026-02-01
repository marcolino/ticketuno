// database.ts
import sqlite3 from 'sqlite3';
import { promises as fs } from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { Migrator } from './migrator';
import { User } from '../shared/types/user';
import { Theater } from '../shared/types/theater';
import { Layout } from '../shared/types/layout';
import { Show } from '../shared/types/show';
import { Event, EventPerformance } from '../shared/types/event';
import config from '../config';

class Database {
  private db: sqlite3.Database | null = null;

  async initialize() {
    const dir = path.dirname(config.dbPath);
    await fs.mkdir(dir, { recursive: true });

    return new Promise<void>((resolve, reject) => {
      this.db = new sqlite3.Database(config.dbPath, async (err) => {
        if (err) return reject(err);

        try {
          await Promise.all([
            this.createTables(),
            this.createDefaultAdminUser(),
            this.runMigrations()
          ]);
          resolve();
        } catch (e) {
          reject(e);
        }
      });
    });
  }

  private async runMigrations(): Promise<void> {
    const migrationsPath = path.join(__dirname, 'migrations');
    const migrator = new Migrator(this.db!, migrationsPath);
    await migrator.migrate();
  }

  private createTables(): Promise<void> {
    return new Promise((resolve, reject) => {
      const sql = `
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          first_name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          phone TEXT,
          role TEXT NOT NULL,
          is_verified INTEGER DEFAULT 0,
          verification_code TEXT,
          verification_code_expiry TEXT,
          reset_password_code TEXT,
          reset_password_code_expiry TEXT,
          google_id TEXT UNIQUE,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS theaters (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          stage_type TEXT,
          address TEXT,
          website_url TEXT,
          status TEXT NOT NULL,
          current_layout_id TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (current_layout_id) REFERENCES layouts(id)
        );

        CREATE TABLE IF NOT EXISTS layouts (
          id TEXT PRIMARY KEY,
          theater_id TEXT NOT NULL,
          name TEXT,
          description TEXT,
          json TEXT NOT NULL,
          created_at TEXT NOT NULL,
          deleted_at TEXT,
          FOREIGN KEY (theater_id) REFERENCES theaters(id)
        );

        CREATE TABLE IF NOT EXISTS shows (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT,
          genre TEXT
        );

        CREATE TABLE IF NOT EXISTS events (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT,
          genre TEXT,
          duration_minutes INTEGER,
          intermission_count INTEGER DEFAULT 1,
          rating TEXT,
          language TEXT,
          director TEXT,
          playwright TEXT,
          producer TEXT,
          choreographer TEXT,
          musical_director TEXT,
          theater_id TEXT NOT NULL,
          layout_id TEXT NOT NULL,
          show_id TEXT NOT NULL,
          stage_type TEXT,
          opening_date TEXT,
          closing_date TEXT,
          is_active INTEGER DEFAULT 1,
          base_ticket_price REAL NOT NULL,
          currency TEXT DEFAULT 'USD',
          is_sold_out INTEGER DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          created_by_user_id TEXT,
          FOREIGN KEY (theater_id) REFERENCES theaters(id),
          FOREIGN KEY (layout_id) REFERENCES layouts(id),
          FOREIGN KEY (show_id) REFERENCES shows(id),
          FOREIGN KEY (created_by_user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS performances (
          id TEXT PRIMARY KEY,
          event_id TEXT NOT NULL,
          performance_date TEXT NOT NULL,
          start_time TEXT NOT NULL,
          end_time TEXT,
          status TEXT DEFAULT 'scheduled',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (event_id) REFERENCES events(id)
        );

        CREATE TABLE IF NOT EXISTS seats (
          performance_id TEXT NOT NULL,
          seat_id TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'available',
          reserved_until TEXT,
          PRIMARY KEY (performance_id, seat_id),
          FOREIGN KEY (performance_id) REFERENCES performances(id)
        );

        CREATE INDEX IF NOT EXISTS idx_layouts_active
          ON layouts(theater_id)
          WHERE deleted_at IS NULL;

        CREATE INDEX IF NOT EXISTS idx_events_layout_id
          ON events(layout_id);
      `;
      this.db!.exec(sql, err => err ? reject(err) : resolve());
    });
  }

  // --------------------
  // Layouts (IMMUTABLE)
  // --------------------

  async createLayout(layout: Layout): Promise<string> {
    const id = uuidv4();
    const now = new Date().toISOString();

    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO layouts (
          id, theater_id, name, description, json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `;
      this.db!.run(
        sql,
        [
          id,
          layout.theaterId,
          layout.name ?? '',
          layout.description ?? '',
          layout.json,
          now
        ],
        err => err ? reject(err) : resolve(id)
      );
    });
  }

  async deleteLayoutSoft(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE layouts
        SET deleted_at = ?
        WHERE id = ?
          AND id NOT IN (SELECT layout_id FROM events)
      `;
      this.db!.run(sql, [new Date().toISOString(), id], err =>
        err ? reject(err) : resolve()
      );
    });
  }

  async getLayoutsByTheaterId(theaterId: string): Promise<Layout[]> {
    return new Promise((resolve, reject) => {
      this.db!.all(
        `
        SELECT *
        FROM layouts
        WHERE theater_id = ?
          AND deleted_at IS NULL
        ORDER BY created_at DESC
        `,
        [theaterId],
        (err, rows) =>
          err ? reject(err) : resolve(rows.map(this.mapRowToLayout))
      );
    });
  }

  private mapRowToLayout = (row: any): Layout => ({
    id: row.id,
    theaterId: row.theater_id,
    name: row.name,
    description: row.description,
    json: row.json
  });

  // --------------------
  // Theater
  // --------------------

  async setCurrentLayout(theaterId: string, layoutId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE theaters
        SET current_layout_id = ?, updated_at = ?
        WHERE id = ?
      `;
      this.db!.run(sql, [layoutId, new Date().toISOString(), theaterId], err =>
        err ? reject(err) : resolve()
      );
    });
  }

  async getCurrentLayout(theaterId: string): Promise<Layout | null> {
    return new Promise((resolve, reject) => {
      this.db!.get(
        `
        SELECT l.*
        FROM theaters t
        JOIN layouts l ON l.id = t.current_layout_id
        WHERE t.id = ?
        `,
        [theaterId],
        (err, row) =>
          err ? reject(err) : resolve(row ? this.mapRowToLayout(row) : null)
      );
    });
  }

  // --------------------
  // Events (layout frozen)
  // --------------------

  async createEvent(event: Event): Promise<void> {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO events (
          id, title, theater_id, layout_id, show_id,
          opening_date, closing_date,
          base_ticket_price, currency,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      this.db!.run(sql, [
        event.id,
        event.title,
        event.theaterId,
        event.layoutId,
        event.showId,
        event.openingDate,
        event.closingDate,
        event.baseTicketPrice,
        event.currency,
        event.createdAt,
        event.updatedAt
      ], err => err ? reject(err) : resolve());
    });
  }
}

export const database = new Database();
