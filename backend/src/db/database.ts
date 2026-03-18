import sqlite3 from 'sqlite3';
import { promises as fs } from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { Migrator } from './migrator';
import { User, NewUser } from '../shared/types/user';
import { Theater, TheaterStatus, EventStatus, SeatStatus/*, Section*/, Seat } from '../shared/types/theater';
import { Layout, LockInfoRow } from '../shared/types/layout';
import { Event, EventPerformance } from '../shared/types/event';
import { GeneratedSeat, SpecialCondition } from '../shared/types/layoutToSeats';
import { FullConsent } from '../shared/types/consent';
import { Booking, BookingStatus } from '../shared/types/booking';
import { GeneralSetupType } from '../shared/types/generalSetup';
import config from '../config';

class Database {
  private db: sqlite3.Database | null = null;

  uuid() {
    const fullUuid = uuidv4().replace(/-/g, '');
    const buffer = Buffer.from(fullUuid, 'hex');
    return buffer
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }
  
  async initialize() {
    const dir = path.dirname(config.db.path);
    await fs.mkdir(dir, { recursive: true });

    return new Promise<void>((resolve, reject) => {
      this.db = new sqlite3.Database(config.db.path, async (err) => {
        if (err) {
          reject(err);
        } else {
          try {
            // Run all initialization tasks in sequence
            await this.initSchema();
            await this.runMigrations();
            await this.createDefaultUsers();
            await this.createDefaultSetup();
            resolve(); // Single resolve call after ALL tasks complete
          } catch (error) {
            reject(error);
          }
        }
      });
    });
  }
  
  // Helper method for migrations
  private async runMigrations(): Promise<void> {
    const migrationsPath = path.join(__dirname, 'migrations');
    const migrator = new Migrator(this.db!, migrationsPath);
    await migrator.migrate();
  }

  private async initSchema(): Promise<void> {
    await execQuery(this.db!, `PRAGMA foreign_keys = ON;`, 'PRAGMA foreign_keys');
    await execQuery(this.db!, `PRAGMA foreign_key_check;`, 'PRAGMA foreign_key_check');

    await execQuery(this.db!, `
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
        consent TEXT,
        language TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME,
        deleted_at DATETIME
      );
    `, 'CREATE users');

    await execQuery(this.db!, `
      CREATE TABLE IF NOT EXISTS theaters (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        stage_type TEXT,
        address TEXT,
        website_url TEXT,
        status TEXT NOT NULL,
        current_layout_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME,
        deleted_at DATETIME,
        FOREIGN KEY (current_layout_id) REFERENCES layouts(id)
      );
    `, 'CREATE theaters');

    await execQuery(this.db!, `
      CREATE TABLE IF NOT EXISTS layouts (
        id TEXT PRIMARY KEY,
        theater_id TEXT,
        name TEXT,
        description TEXT,
        json TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME,
        deleted_at DATETIME,
        FOREIGN KEY (theater_id) REFERENCES theaters(id)
      );
    `, 'CREATE layouts');

    await execQuery(this.db!, `
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        genres TEXT,
        duration_minutes INTEGER,
        intermission_count INTEGER DEFAULT 1,
        rating TEXT,
        language TEXT,
        director TEXT,
        playwright TEXT,
        producer TEXT,
        choreographer TEXT,
        musical_director TEXT,
        cast_members TEXT,
        theater_id TEXT,
        stage_type TEXT,
        opening_date TEXT,
        closing_date TEXT,
        is_active INTEGER DEFAULT 1,
        currency TEXT,
        base_ticket_price REAL NOT NULL,
        is_sold_out INTEGER DEFAULT 0,
        special_requirements TEXT,
        minimum_age INTEGER,
        created_by_user_id TEXT,
        typical_start_time TEXT,
        typical_end_time TEXT,
        poster_image TEXT,
        trailer_url TEXT,
        website_url TEXT,
        social_media_links TEXT,
        canceled INTEGER DEFAULT 0,
        status TEXT DEFAULT 'scheduled',
        cancelation_reason TEXT,
        max_capacity INTEGER,
        content_warnings TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME,
        deleted_at DATETIME,
        FOREIGN KEY (theater_id) REFERENCES theaters(id),
        FOREIGN KEY (created_by_user_id) REFERENCES users(id)
      );
    `, 'CREATE events');

    await execQuery(this.db!, `
      CREATE TABLE IF NOT EXISTS performances (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL,
        performance_date TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT,
        status TEXT DEFAULT 'scheduled',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME,
        FOREIGN KEY (event_id) REFERENCES events(id)
      );
    `, 'CREATE performances');

    await execQuery(this.db!, `
      CREATE TABLE IF NOT EXISTS bookings (
        id TEXT PRIMARY KEY,
        booking_ref TEXT NOT NULL,
        user_id TEXT NOT NULL,
        performance_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'confirmed', -- confirmed | cancelled | refunded
        total_price  REAL NOT NULL DEFAULT 0,
        seat_count INTEGER NOT NULL DEFAULT 0,
        seat_ids TEXT NOT NULL DEFAULT '[]', -- JSON array, denormalised for quick ticket lookup
        booked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        used_at DATETIME,
        used_by TEXT,
        updated_at DATETIME,
        cancelled_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (performance_id) REFERENCES performances(id)
      );
    `, 'CREATE bookings');

    await execQuery(this.db!, `
      CREATE TABLE IF NOT EXISTS seats (
        performance_id TEXT NOT NULL,
        seat_id TEXT NOT NULL,
        section_name TEXT NOT NULL,
        row_id TEXT NOT NULL,
        seat_number INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'available',
        booking_id TEXT, -- links seat to its booking
        booked_by_user_id TEXT,
        booked_at DATETIME,
        reserved_until TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME,
        PRIMARY KEY (performance_id, seat_id),
        FOREIGN KEY (performance_id) REFERENCES performances(id) ON DELETE CASCADE,
        FOREIGN KEY (booked_by_user_id) REFERENCES users(id),
        FOREIGN KEY (booking_id) REFERENCES bookings(id)
      );
    `, 'CREATE seats');
    
    await execQuery(this.db!, `
      CREATE TABLE IF NOT EXISTS tokens (
        id TEXT PRIMARY KEY,
        token TEXT UNIQUE NOT NULL,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `, 'CREATE tokens');

    await execQuery(this.db!, `
      CREATE TABLE IF NOT EXISTS setup (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME
      );
    `, 'CREATE setup');

    await execQuery(this.db!, `
      CREATE INDEX IF NOT EXISTS idx_layouts_active
      ON layouts(theater_id)
      WHERE deleted_at IS NULL;
    `, 'INDEX layouts_active');

    await execQuery(this.db!, `
      CREATE INDEX IF NOT EXISTS idx_seats_performance ON seats(performance_id);
    `, 'INDEX seats_performance');

    await execQuery(this.db!, `
      CREATE INDEX IF NOT EXISTS idx_seats_section ON seats(performance_id, section_name);
    `, 'INDEX seats_section');
    
    await execQuery(this.db!, `
      CREATE INDEX IF NOT EXISTS idx_seats_status ON seats(performance_id, status);
    `, 'INDEX seats_status');

    await execQuery(this.db!, `
      CREATE INDEX IF NOT EXISTS idx_seats_user ON seats(booked_by_user_id);
    `, 'INDEX seats_user');

    await execQuery(this.db!, `
      CREATE INDEX IF NOT EXISTS idx_seats_booking ON seats(booking_id);
    `, 'INDEX seats_booking');

    await execQuery(this.db!, `
      CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_ref ON bookings(booking_ref);
    `, 'INDEX bookings_ref');

    await execQuery(this.db!, `
      CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
    `, 'INDEX bookings_user');

    await execQuery(this.db!, `
      CREATE INDEX IF NOT EXISTS idx_bookings_performance ON bookings(performance_id);
    `, 'INDEX bookings_performance');

    await execQuery(this.db!, `
      CREATE UNIQUE INDEX IF NOT EXISTS idx_tokens_token ON tokens(token);
    `, 'INDEX tokens_token');

    await execQuery(this.db!, `
      CREATE INDEX IF NOT EXISTS idx_tokens_user ON tokens(user_id);
    `, 'INDEX tokens_user');
  }
  
  // User methods //////////////////////////////////////////////////////////////////////
  async getAllUsers(): Promise<User[] | null> {
    const sql = `SELECT * FROM users`;
    const params: SqlParam[] = [];
    const rows = await allQuery(this.db!, sql, params, 'get all users');
    return rows ? this.mapRowsToUsers(rows) : null;
  }
  
  async createUser(user: NewUser): Promise<string> {
    const id = this.uuid();
    const sql = `
      INSERT INTO users (
        id, email, password, first_name, last_name, phone, role,
        is_verified, verification_code, verification_code_expiry, consent,
        google_id, language
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params: SqlParam[] = [
      id, user.email, user.password, user.firstName, user.lastName, user.phone || '', user.role,
      user.isVerified ? 1 : 0, user.verificationCode ?? '', user.verificationCodeExpiry ?? '',
      user.consent ? JSON.stringify(user.consent) : null,
      user.googleId ?? null, user.language ?? config.app.defaultLanguage
    ];
    await runQuery(this.db!, sql, params, 'create user');
    return id;
  }

  private mapRowToUser(row: Record<string, unknown>): User {
    let consent: FullConsent | null = null;
    if (row.consent && typeof row.consent === "string") {
      try {
        consent = JSON.parse(row.consent);
      } catch {
        consent = null;
      }
    }
    
    return {
      id: row.id as string,
      email: row.email as string,
      password: row.password as string,
      firstName: row.first_name as string,
      lastName: row.last_name as string,
      phone: row.phone as string,
      role: (["admin", "operator", "user"].includes(row.role as string) ? row.role : "user") as User["role"],
      isVerified: row.is_verified === 1,
      verificationCode: row.verification_code as string,
      verificationCodeExpiry: row.verification_code_expiry as string,
      resetPasswordCode: row.reset_password_code as string,
      resetPasswordCodeExpiry: row.reset_password_code_expiry as string,
      googleId: row.google_id as string,
      language: row.language as string,
      consent,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }

  private mapRowsToUsers(rows: Record<string, unknown>[]): User[] {
    return rows.map(row => this.mapRowToUser(row));
  }

  // Get user by Google ID
  async getUserByGoogleId(googleId: string): Promise<User | null> {
    const sql = `SELECT * FROM users WHERE google_id = ?`;
    const params = [googleId];
    const row = await getQuery<Record<string, unknown>>(this.db!, sql, params, 'create user');
    return row ? this.mapRowToUser(row) : null;
  }

  async createDefaultAdminUser_DO_NOT_USE(): Promise<string|undefined> {
    try {
      // First, check if an admin user already exists
      const adminUsers = await this.getUsersByRole('admin');
      // If no admin exists, create one
      if (!adminUsers || adminUsers.length === 0) {
        const hashedPassword = await bcrypt.hash(process.env.ADMIN_USER_PASSWORD!, 10);
        const adminUser: User = {
          id: '',
          email: process.env.ADMIN_USER_EMAIL!,
          password: hashedPassword,
          firstName: 'Charles',
          lastName: 'Darwin',
          phone: undefined,
          role: 'admin',
          isVerified: true,
          consent: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        return await this.createUser(adminUser);
      }
    } catch (error) {
      console.error('Error creating default admin user:', error);
      throw error;
    }
  }

  async createDefaultUsers(): Promise<void> {
    const adminEmail = process.env.ADMIN_USER_EMAIL;
    const adminPassword = process.env.ADMIN_USER_PASSWORD;
    const operatorEmail = process.env.OPERATOR_USER_EMAIL;
    const operatorPassword = process.env.OPERATOR_USER_PASSWORD;
    if (!adminEmail || !adminPassword) {
      throw new Error('ADMIN_USER_EMAIL and ADMIN_USER_PASSWORD must be set in environment!');
    }
    if (!operatorEmail || !operatorPassword) {
      throw new Error('OPERATOR_USER_EMAIL and OPERATOR_USER_PASSWORD must be set in environment!');
    }

    try {
      await this.createDefaultUserIfNotExists(
        adminEmail,
        adminPassword,
        'admin',
        'Ammini',
        'Stratore',
        config.app.defaultLanguage,
      );
      await this.createDefaultUserIfNotExists(
        operatorEmail,
        operatorPassword,
        'operator',
        'Opera',
        'Tore',
        config.app.defaultLanguage,
      );
    } catch (error) {
      console.error('Error creating default users:', error);
      throw error;
    }
  }

  private async createDefaultUserIfNotExists(
    email: string,
    password: string,
    role: string,
    firstName: string,
    lastName: string,
    language: string,
  ): Promise<void> {
    const hashedPassword = await bcrypt.hash(password, 10);
    const id = this.uuid();

    // INSERT OR IGNORE is atomic, no race condition possible
    const sql = `
      INSERT OR IGNORE INTO users (
        id, email, password, first_name, last_name, role, language, is_verified
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `;

    const result = await runQuery(this.db!, sql, [
      id, email, hashedPassword, firstName, lastName, role, language
    ], `create default ${role} user`);

    if (result.changes > 0) {
      console.log(`Default ${role} user created successfully`);
    }
    // If changes === 0, the row already existed, silently skip
  }

  private async createDefaultSetup(): Promise<void> {
    await runQuery(
      this.db!, `
        INSERT OR IGNORE INTO setup (id, data)
        VALUES (1, ?);
      `, [
        JSON.stringify(
          {
            currency: config.app.defaultCurrency,
            timeout: 10,
            enableNotifications: true,
            launchDate: null,
            time: null,
            apiKey: "",
          }
        ),
      ],
      'INSERT default setup row'
    );
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const sql = `SELECT * FROM users WHERE email = ?`;
    const params = [email];
    const row = await getQuery(this.db!, sql, params, 'get user by email');
    return row ? this.mapRowToUser(row) : null;
  }

  async getUserById(id: string): Promise<User | null> {
    const sql = `SELECT * FROM users WHERE id = ?`;
    const params = [id];
    const row = await getQuery(this.db!, sql, params, 'get user by id');
    return row ? this.mapRowToUser(row) : null;
  }

  async getUsersByRole(role: string): Promise<User[] | null> {
    const sql = `SELECT * FROM users WHERE role = ?`;
    const params = [role];
    const rows = await allQuery(this.db!, sql, params, 'get user by id');
    return rows ? this.mapRowsToUsers(rows) : null;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<boolean> {
    const fields: string[] = [];
    const values: (string | number | null)[] = [];
    
    const fieldMap: Record<string, string> = {
      firstName: 'first_name',
      lastName: 'last_name',
      phone: 'phone',
      email: 'email',
      role: 'role',
      password: 'password',
      isVerified: 'is_verified',
      verificationCode: 'verification_code',
      verificationCodeExpiry: 'verification_code_expiry',
      resetPasswordCode: 'reset_password_code',
      resetPasswordCodeExpiry: 'reset_password_code_expiry',
      googleId: 'google_id',
      language: 'language',
      consent: 'consent',
    };

    Object.entries(updates).forEach(([key, value]) => {
      if (fieldMap[key] && value !== undefined) {
        fields.push(`${fieldMap[key]} = ?`);
        if (key === 'isVerified') {
          values.push(value ? 1 : 0);
        } else if (key === 'consent') {
          values.push(value ? JSON.stringify(value) : null);
        } else {
          values.push(typeof value === 'boolean' ? (value ? 1 : 0) : value as string | number | null);
        }
      }
    });
    
    if (fields.length === 0) {
      return false;
    }

    values.push(id);
    
    const sql = `
      UPDATE users
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    const result = await runQuery(this.db!, sql, values, 'update user');
    return result.changes > 0;
  }

  // Create a new token for a user (returns the token string)
  async createToken(userId: string, type: string, expiresInDays: number = 7): Promise<string> { // TODO: 7 in config
    const id = this.uuid(); // primary key
    const token = this.uuid(); // the actual token (unique)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const sql = `
      INSERT INTO tokens (id, token, user_id, type, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `;
    await runQuery(this.db!, sql, [id, token, userId, type, expiresAt.toISOString()], 'create token');
    return token;
  }

  async getUserByToken(token: string, type?: string): Promise<User | null> {
    let sql = `
      SELECT user_id
      FROM tokens
      WHERE
        token = ? AND
        expires_at > CURRENT_TIMESTAMP
    `;
    const params: SqlParam[] = [token];
    if (type) {
      sql += ` AND type = ?`;
      params.push(type);
    }

    const row = await getQuery<{ user_id: string }>(this.db!, sql, params, 'get user by token');
    if (!row) {
      return null;
    }
    return this.getUserById(row.user_id);
  }

  // Theater methods //////////////////////////////////////////////////////////////////////
  private mapRowToTheater(row: Record<string, unknown>): Theater {
    return {
      id: row.id as string,
      name: row.name as string,
      description: row.description as string,
      stageType: row.stage_type as string,
      address: row.address as string,
      websiteUrl: row.website_url as string,
      status: row.status as TheaterStatus,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
      currentLayoutId: row.current_layout_id as string | undefined,
    };
  }

  private mapRowsToTheaters(rows: Record<string, unknown>[]): Theater[] {
    return rows.map(row => this.mapRowToTheater(row));
  }

  // TODO: in all get* add `AND !deleted_at` ...
  async getAllTheaters(): Promise<Theater[] | null> {
    const sql = `
      SELECT *
      FROM theaters
      WHERE deleted_at IS NULL
    `;
    const params: SqlParam[] = [];
    const rows = await allQuery(this.db!, sql, params, 'get all theaters');
    return rows ? this.mapRowsToTheaters(rows) : null;
  }

  async getTheaterById(id: string): Promise<Theater | null> {
    const sql = `
      SELECT *
      FROM theaters
      WHERE id = ?
      AND deleted_at IS NULL
    `;
    const params = [id];
    const row = await getQuery(this.db!, sql, params, 'get theater by id');
    return row ? this.mapRowToTheater(row) : null;
  }

  async createTheater(theater: Theater): Promise<string> {
    const id = this.uuid();
    const sql = `
      INSERT INTO theaters (
        id, name, description, stage_type, address, website_url, status,
        current_layout_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params: SqlParam[] = [
      id, theater.name, theater.description ?? '', theater.stageType ?? '',
      theater.address ?? '', theater.websiteUrl ?? '', theater.status,
      theater.currentLayoutId ?? ''
    ];
    await runQuery(this.db!, sql, params, 'create theater');
    return id;
  }

  async updateTheaterFull(id: string, updates: Partial<Theater>): Promise<boolean> {
    const fields: string[] = [];
    const values: (string | number)[] = [];
    
    const fieldMap: Record<string, string> = {
      name: 'name',
      description: 'description',
      stageType: 'stage_type',
      address: 'address',
      websiteUrl: 'website_url',
      status: 'status',
      currentLayoutId: 'current_layout_id',
    };

    Object.entries(updates).forEach(([key, value]) => {
      if (fieldMap[key] && value !== undefined) {
        fields.push(`${fieldMap[key]} = ?`);
        values.push(value);
      }
    });
    
    if (fields.length === 0) {
      return false;
    }

    values.push(id);

    const sql = `
      UPDATE theaters
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    const result = await runQuery(this.db!, sql, values, 'update theater full');
    return result.changes > 0;
  }

  async deleteTheater(id: string): Promise<{ deleted: boolean; reason?: string }> {
    const sql = `
      UPDATE theaters
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE id = ? AND deleted_at IS NULL
    `;

    const params = [id];
    const result = await runQuery(this.db!, sql, params, 'soft delete theater');

    return {
      deleted: result.changes > 0,
      ...(result.changes === 0 && { reason: 'THEATER_NOT_FOUND' })
    };

    // const linked = await getQuery<{ count: number }>(
    //   this.db!, `
    //     SELECT COUNT(*) AS count
    //     FROM events
    //     WHERE theater_id = ?
    //     AND deleted_at IS NULL
    //   `,
    //   [id], 'check theater dependencies'
    // );

    // if ((linked?.count ?? 0) > 0) {
    //   return {
    //     deleted: false,
    //     reason: 'THEATER_HAS_LINKED_EVENTS'
    //   };
    // }

    // const sql = `
    //   DELETE
    //   FROM theaters
    //   WHERE id = ?
    // `;
    // const params = [id];
    // const result = await runQuery(this.db!, sql, params, 'delete theater');
    // return {
    //   deleted: result.changes > 0,
    //   ...(result.changes === 0 && { reason: 'THEATER_NOT_FOUND' })
    // };
  }

  // Layout methods (IMMUTABLE) //////////////////////////////////////////////////////////////////
  private mapRowToLayout(row: Record<string, unknown>): Layout {
    return {
      id: row.id as string,
      theaterId: row.theater_id as string,
      name: row.name as string,
      description: row.description as string,
      json: row.json as string,
    };
  }

  private mapRowsToLayouts(rows: Record<string, unknown>[]): Layout[] {
    return rows.map(row => this.mapRowToLayout(row));
  }
  
  async createLayout(layout: Layout): Promise<string> {
    const id = this.uuid();
    const sql = `
      INSERT INTO layouts (
        id, theater_id, name, description, json
      ) VALUES (
        ?, ?, ?, ?, ?
      )
    `;
    const params = [
      id,
      layout.theaterId ?? null,
      layout.name ?? '',
      layout.description ?? '',
      layout.json,
    ];
    await runQuery(this.db!, sql, params, 'create layout');
    return id;
  }

  async getLayoutById(id: string): Promise<Layout | null> {
    const sql = `
      SELECT id, name, description, json
      FROM layouts
      WHERE id = ?
      AND deleted_at is NULL
    `;
    const params = [id];
    const row = await getQuery(this.db!, sql, params, 'get layout by id');
    if (!row) return null;
    
    const layout = this.mapRowToLayout(row);
    const lock = await this.getLayoutLockInfo(id);
    layout.isEditable = lock.editable;
    layout.lockInfo = lock.blockedBy ?? [];
    return layout;
  }

  async getLayoutsByTheaterId(theaterId: string): Promise<Layout | null> {
     const sql = `
      SELECT id, name, description, json
      FROM layouts
      WHERE theater_id = ?
      AND deleted_at is NULL
    `;
    const params = [theaterId];
    const row = await getQuery(this.db!, sql, params, 'get layout by theater id');
    if (!row) return null;

    const layout = this.mapRowToLayout(row);
    const lock = await this.getLayoutLockInfo(layout.id);
    layout.isEditable = lock.editable;
    layout.lockInfo = lock.blockedBy ?? [];
    return layout;
  }

  async getAllLayouts(): Promise<Array<{ id: string; json: string }> | null> {
     const sql = `
      SELECT id, name, description, json
      FROM layouts
      WHERE deleted_at is NULL
    `;
    const params: SqlParam[] = [];
    const rows = await allQuery(this.db!, sql, params, 'get all layouts');
    if (!rows) return null;

    const layouts = this.mapRowsToLayouts(rows);
    await Promise.all(layouts.map(async l => {
      const lock = await this.getLayoutLockInfo(l.id);
      l.isEditable = lock.editable;
      l.lockInfo = lock.blockedBy ?? [];
    }));
    return layouts;
  }

  async getLayoutLockInfo(layoutId: string): Promise<{
    editable: boolean;
    blockedBy?: Array<{ eventTitle: string; performanceDate: string; startTime: string; booked: number; reserved: number; }>
  }> {
    const sql = `
      SELECT
        e.title AS eventTitle,
        p.performance_date AS performanceDate,
        p.start_time AS startTime,
        COUNT(CASE WHEN s.status = 'booked' THEN 1 END) AS booked,
        COUNT(CASE WHEN s.status = 'reserved' THEN 1 END) AS reserved
      FROM seats s
      JOIN performances p ON p.id = s.performance_id
      JOIN events e ON e.id = p.event_id
      JOIN theaters t ON t.id = e.theater_id
      WHERE t.current_layout_id = ?
        AND s.status IN ('booked', 'reserved')
      GROUP BY p.id
      ORDER BY p.performance_date, p.start_time
    `;
    const rows = await allQuery<LockInfoRow>(this.db!, sql, [layoutId], 'get layout lock info');

    if (!rows || rows.length === 0) return { editable: true };

    return {
      editable: false,
      blockedBy: rows.map(r => ({
        eventTitle: r.eventTitle,
        performanceDate: r.performanceDate,
        startTime: r.startTime,
        booked: r.booked,
        reserved: r.reserved,
      }))
    };
  }

  async updateLayout(id: string, updates: Partial<Layout>): Promise<{ updated: boolean; reason?: string, blockedBy?: LockInfoRow[]}> {
    // Guard: refuse if layout is locked
    const lock = await this.getLayoutLockInfo(id);
    if (!lock.editable) {
      return {
        updated: false, // TODO: all 'reason's should be CODEs, and be translated on frontend
        reason: 'LAYOUT_IS_LOCKED_SINCE_IT_HAS_RESERVED_OR_BOOKED_PERFORMANCE_SEATS',
        blockedBy: lock.blockedBy,
      };
    }
  
    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    const fieldMap: Record<string, string> = {
      name: 'name',
      description: 'description',
      json: 'json',
    };

    Object.entries(updates).forEach(([key, value]) => {
      if (fieldMap[key] && value !== undefined) {
        fields.push(`${fieldMap[key]} = ?`);
        values.push(toSqlParam(value));
      }
    });
    
    if (fields.length === 0) {
      return {
        updated: false,
      };
    }

    values.push(id);

    const sql = `
      UPDATE layouts
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    const result = await runQuery(this.db!, sql, values, 'update layout');
    return {
      updated: result.changes > 0,
    };
  }

  async deleteLayoutSoft(id: string): Promise<boolean> {
    const sql = `
      UPDATE layouts
      SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND deleted_at IS NULL
    `;
    const result = await runQuery(this.db!, sql, [id], 'soft delete layout');

    if (result.changes > 0) { // Unlink from any theater that references it
      await runQuery(
        this.db!,
        `UPDATE theaters SET current_layout_id = NULL WHERE current_layout_id = ?`,
        [id],
        'unlink deleted layout from theaters'
      );
    }

    return result.changes > 0;
  }

  // Event methods //////////////////////////////////////////////////////////////////////
  private mapRowToEvent(row: Record<string, unknown>): Event {
    return {
      id: row.id as string,
      title: row.title as string,
      description: row.description as string,
      genres: row.genres ? JSON.parse(row.genres as string) : [],
      durationMinutes: row.duration_minutes as number,
      intermissionCount: row.intermission_count as number,
      rating: row.rating as string,
      language: row.language as string,
      director: row.director as string,
      playwright: row.playwright as string,
      producer: row.producer as string,
      choreographer: row.choreographer as string,
      musicalDirector: row.musical_director as string,
      cast: row.cast_members ? JSON.parse(row.cast_members as string) : [],
      theaterId: row.theater_id as string,
      stageType: row.stage_type as string,
      openingDate: row.opening_date as string,
      closingDate: row.closing_date as string,
      isActive: row.is_active === 1,
      baseTicketPrice: row.base_ticket_price as number,
      currency: row.currency as string,
      isSoldOut: row.is_sold_out === 1,
      specialRequirements: row.special_requirements as string,
      minimumAge: row.minimum_age as number,
      createdByUserId: row.created_by_user_id as string,
      typicalStartTime: row.typical_start_time as string,
      typicalEndTime: row.typical_end_time as string,
      posterImage: row.poster_image as string,
      trailerUrl: row.trailer_url as string,
      websiteUrl: row.website_url as string,
      socialMediaLinks: row.social_media_links as string,
      status: row.status as EventStatus,
      canceled: row.canceled as number,
      cancelationReason: row.cancelation_reason as string | undefined,
      maxCapacity: row.max_capacity as number,
      contentWarnings: row.content_warnings as string,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
      deletedAt: row.deleted_at as string,
    };
  }

  private mapRowsToEvents(rows: Record<string, unknown>[]): Event[] {
    return rows.map(row => this.mapRowToEvent(row));
  }

  async getAllEvents(): Promise<Event[] | null> {
    const sql = `
      SELECT *
      FROM events
      WHERE deleted_at IS NULL
      ORDER BY
        canceled ASC,
        opening_date DESC,
        typical_start_time ASC,
        title DESC
    `;
    const params: (string | number)[]  = [];
    const rows = await allQuery(this.db!, sql, params, 'get all events');

    const rowsWithStatus = rows.map(row => {
      const event = this.mapRowToEvent(row);
      event.status = this.getEventStatus(event);
      return event;
    });
    return rowsWithStatus;
  }

  async getEventById(id: string): Promise<Event | null> {
    const sql = `
      SELECT *
      FROM events
      WHERE id = ?
      AND deleted_at IS NULL
    `;
    const params = [id];
    const row = await getQuery(this.db!, sql, params, 'get event by id');
    return row ? this.mapRowToEvent(row) : null;
  }

  async createEvent(event: Event): Promise<string> {
    const id = this.uuid();
    const sql = `
      INSERT INTO events (
        id, title, description, genres, duration_minutes, intermission_count, rating, language,
        director, playwright, producer, choreographer, musical_director, cast_members, theater_id, stage_type,
        opening_date, closing_date, is_active, currency, base_ticket_price, currency, is_sold_out,
        special_requirements, minimum_age, created_by_user_id,
        typical_start_time, typical_end_time, poster_image, trailer_url, website_url,
        social_media_links, status, cancelation_reason, max_capacity, content_warnings
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params: SqlParam[] = [
      id, event.title, event.description ?? '', JSON.stringify(event.genres ?? []),
      event.durationMinutes ?? '', event.intermissionCount ?? 0,
      event.rating ?? '', event.language ?? '', event.director ?? '',
      event.playwright ?? '', event.producer ?? '', event.choreographer ?? '',
      event.musicalDirector ?? '', JSON.stringify(event.cast ?? []),
      event.theaterId, event.stageType ?? '', event.openingDate ?? '', event.closingDate ?? '',
      event.isActive ? 1 : 0, event.currency, event.baseTicketPrice, event.currency, event.isSoldOut ? 1 : 0,
      event.specialRequirements ?? '', event.minimumAge ?? '', event.createdByUserId ?? '',
      event.typicalStartTime ?? '', event.typicalEndTime ?? '', event.posterImage ?? '',
      event.trailerUrl ?? '', event.websiteUrl ?? '', event.socialMediaLinks ?? '',
      event.status, event.cancelationReason ?? '', event.maxCapacity ?? '', event.contentWarnings ?? ''
    ];
    await runQuery(this.db!, sql, params, 'create event');
    return id;
  }

  async updateEvent(id: string, updates: Partial<Event>): Promise<boolean> {
    const fields: string[] = [];
    const values: (string | number | Buffer | null)[] = [];

    const fieldMap: Record<string, string> = {
      title: 'title',
      description: 'description',
      genres: 'genres',
      durationMinutes: 'duration_minutes',
      intermissionCount: 'intermission_count',
      rating: 'rating',
      language: 'language',
      director: 'director',
      playwright: 'playwright',
      producer: 'producer',
      choreographer: 'choreographer',
      musicalDirector: 'musical_director',
      theaterId: 'theater_id',
      cast: 'cast_members',
      stageType: 'stage_type',
      openingDate: 'opening_date',
      closingDate: 'closing_date',
      isActive: 'is_active',
      currency: 'currency',
      baseTicketPrice: 'base_ticket_price',

      isSoldOut: 'is_sold_out',
      specialRequirements: 'special_requirements',
      minimumAge: 'minimum_age',
      typicalStartTime: 'typical_start_time',
      typicalEndTime: 'typical_end_time',
      posterImage: 'poster_image',
      trailerUrl: 'trailer_url',
      websiteUrl: 'website_url',
      socialMediaLinks: 'social_media_links',
      status: 'status',
      canceled: 'canceled',
      cancelationReason: 'cancelation_reason',
      maxCapacity: 'max_capacity',
      contentWarnings: 'content_warnings',
    };

    Object.entries(updates).forEach(([key, value]) => {
      if (fieldMap[key] && value !== undefined) {
        fields.push(`${fieldMap[key]} = ?`);
        if (key === 'isActive' || key === 'isSoldOut' || key === 'isVerified' || key === 'canceled') {
          // Convert booleans to 0/1
          values.push(value ? 1 : 0);
        } else if (key === 'cast') {
          // Always JSON-stringify arrays/objects for SQL
          values.push(JSON.stringify(value));
        } else if (Array.isArray(value) || typeof value === 'object') {
          // Safeguard: stringify anything else that's object/array
          values.push(JSON.stringify(value));
        } else {
          // string | number | null
          //values.push(value);
          values.push(toSqlParam(value));
        }
      }
    });
    
    if (fields.length === 0) {
      return false;
    }

    values.push(id);

    const sql = `
      UPDATE events
      SET ${ fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    const result = await runQuery(this.db!, sql, values, 'update event');
    return result.changes > 0;
  }

  async deleteEvent(id: string): Promise<boolean> {
    const sql = `
      UPDATE events
      SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND deleted_at IS NULL
    `;
    const result = await runQuery(this.db!, sql, [id], 'soft delete event');
    return result.changes > 0;
  }

  getEventStatus = (event: Event, now: Date = new Date()): EventStatus => {
    const { openingDate, closingDate, canceled } = event;

    if (canceled) {
      return 'canceled';
    }

    const today = now;
    const start = openingDate ? new Date(openingDate) : null;
    const end = closingDate ? new Date(closingDate) : null;

    // Open event: no start & no end
    if (!start && !end) return 'in progress';
    // Open start, only end defined
    if (!start && end) {
      return today <= end ? 'in progress' : 'completed';
    }

    // Open end, only start defined
    if (start && !end) {
      return today < start ? 'scheduled' : 'in progress';
    }

    // Fully defined start & end
    if (start && end) {
      if (today < start) return 'scheduled';
      if (today >= start && today <= end) return 'in progress';
      return 'completed';
    }

    return 'scheduled';
  };

  // Performance methods //////////////////////////////////////////////////////////////////////
  private mapRowToPerformance(row: Record<string, unknown>): EventPerformance {
    return {
      id: row.id as string,
      eventId: row.event_id as string,
      performanceDate: row.performance_date as string,
      startTime: row.start_time as string,
      endTime: row.end_time as string,
      status: row.status as EventStatus,
      canceled: row.canceled as number,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string
    };
  }

  private mapRowsToPerformances(rows: Record<string, unknown>[]): EventPerformance[] {
    return rows.map(row => this.mapRowToPerformance(row));
  }

  async getPerformancesByEventId(eventId: string): Promise<EventPerformance[] | null> {
    const sql = `SELECT * FROM performances WHERE event_id = ?`;
    const params = [eventId];
    const rows = await allQuery(this.db!, sql, params, 'get performances by event id');
    return rows ? this.mapRowsToPerformances(rows) : null;
  }

  async getPerformanceById(id: string): Promise<EventPerformance | null> {
    const sql = `SELECT * FROM performances WHERE id = ?`;
    const params = [id];
    const row = await getQuery(this.db!, sql, params, 'get performance by id');
    return row ? this.mapRowToPerformance(row) : null;
  }

  async createPerformance(performance: EventPerformance): Promise<string> {
    const id = this.uuid();
    const sql = `
      INSERT INTO performances (
        id, event_id, performance_date, start_time, end_time, status
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;
    const params: SqlParam[] = [
      id, performance.eventId, performance.performanceDate, performance.startTime,
      performance.endTime ?? '', performance.status,
    ];
    await runQuery(this.db!, sql, params, 'create performance');
    return id;
  }

  async updatePerformance(id: string, updates: Partial<EventPerformance>): Promise<boolean> {
    const fields: string[] = [];
    const values: (string | number)[] = [];
    
    const fieldMap: Record<string, string> = {
      performanceDate: 'performance_date',
      startTime: 'start_time',
      endTime: 'end_time',
      status: 'status',
    };

    Object.entries(updates).forEach(([key, value]) => {
      if (fieldMap[key] && value !== undefined) {
        fields.push(`${fieldMap[key]} = ?`);
        values.push(value);
      }
    });
    
    if (fields.length === 0) {
      return false;
    }

    values.push(id);

    const sql = `
      UPDATE performances
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    const result = await runQuery(this.db!, sql, values, 'update performance');
    return result.changes > 0;
  }

  async deletePerformanceById(performanceId: string): Promise<boolean> {
    const sql = `DELETE FROM performances WHERE id = ?`;
    const params = [performanceId];
    const result = await runQuery(this.db!, sql, params, 'delete performance for event');
    return result.changes > 0;
  }

  // Seat management methods //////////////////////////////////////////////////////////////////////
  private mapRowToSeat(row: Record<string, unknown>): Seat {
    return {
      seatId: row.seat_id as string,
      sectionName: row.section_name as string,
      rowId: row.row_id as string,
      seatNumber: row.seat_number as number,
      status: row.status as SeatStatus,
      bookingId: row.booking_id as string | undefined,
      bookedByUserId: row.booked_by_user_id as string,
      bookedAt: row.booked_at as string,
      reservedUntil: row.reserved_until as string,
      price: row.price as number,
    };
  }

  private mapRowsToSeats(rows: Record<string, unknown>[]): Seat[] {
    return rows.map(row => this.mapRowToSeat(row));
  }

  async getSeatsByPerformanceId(performanceId: string): Promise<Seat[]> {
    const sql = `
      SELECT 
        seat_id,
        section_name,
        row_id,
        seat_number,
        status,
        booked_by_user_id,
        reserved_until,
        price
      FROM seats 
      WHERE performance_id = ?
      ORDER BY section_name, row_id, seat_number
    `;
    const params = [performanceId];
    const rows = await allQuery(this.db!, sql, params, 'get seats by performance');
    return rows ? this.mapRowsToSeats(rows) : [];
  }

  async releaseExpiredReservations(): Promise<boolean> {
    const sql = `
      UPDATE seats 
      SET status = 'available', reserved_until = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE status = 'reserved' AND reserved_until < CURRENT_TIMESTAMP
    `;
    const result = await runQuery(this.db!, sql, [], 'release expired seat reservations');
    return result.changes > 0;
  }

  async bulkCreateSeats(
    performanceId: string,
    seats: GeneratedSeat[],
    seatConditions: Record<string, SpecialCondition> = {} 
  ): Promise<boolean> {
    // Filter out physically absent seats — they should never be bookable
    const bookableSeats = seats.filter(
      s => seatConditions[s.seatId] !== 'Absent'
    );
    const placeholders = bookableSeats.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
    const values: (string | number)[] = [];
    
    bookableSeats.forEach(seat => {
      values.push(
        performanceId,
        seat.seatId,
        seat.sectionName,
        seat.rowId,
        seat.seatNumber,
        'available'
      );
    });

    const sql = `
      INSERT OR IGNORE INTO seats (
        performance_id, seat_id, section_name, row_id, seat_number, status
      ) VALUES ${placeholders}
    `;
    
    const result = await runQuery(this.db!, sql, values, 'bulk create seats');
    return result.changes > 0;
  }

  /**
   * Get seats grouped by section for UI
   */
  async getSeatsByPerformanceIdGroupedBySection(performanceId: string): Promise<{
    [sectionName: string]: { [rowId: string]: Seat[] }
  }> {
    const sql = `
      SELECT 
        seat_id,
        section_name,
        row_id,
        seat_number,
        status,
        booked_by_user_id,
        reserved_until
      FROM seats 
      WHERE performance_id = ?
      ORDER BY section_name, row_id, seat_number
    `;
    
    const rows = await allQuery<Record<string, unknown>>(this.db!, sql, [performanceId], 'get seats grouped');
    const seats = this.mapRowsToSeats(rows);
    
    // Group by section, then by row
    const grouped: { [section: string]: { [row: string]: Seat[] } } = {};
    
    seats.forEach(seat => {
      if (!grouped[seat.sectionName]) {
        grouped[seat.sectionName] = {};
      }
      if (!grouped[seat.sectionName][seat.rowId]) {
        grouped[seat.sectionName][seat.rowId] = [];
      }
      grouped[seat.sectionName][seat.rowId].push(seat);
    });
    
    return grouped;
  }

  // Get seats for a specific section
  async getSeatsBySection(
    performanceId: string, 
    sectionName: string
  ): Promise<Seat[]> {
    const sql = `
      SELECT 
        seat_id,
        section_name,
        row_id,
        seat_number,
        status,
        booked_by_user_id,
        reserved_until,
        price
      FROM seats 
      WHERE performance_id = ? AND section_name = ?
      ORDER BY section_name, row_id, seat_number
    `;
    
    const rows = await allQuery(
      this.db!, 
      sql, 
      [performanceId, sectionName], 
      'get seats by section'
    );
    return this.mapRowsToSeats(rows);
  }
  
  /**
   * Get seat counts for a performance (calculated from seats table)
   */
  async getSeatCountsByPerformanceId(
    performanceId: string
  ): Promise<{ available: number; booked: number; reserved: number }> {
    const sql = `
      SELECT 
        COUNT(CASE WHEN status = 'available' THEN 1 END) as available,
        COUNT(CASE WHEN status = 'booked' THEN 1 END) as booked,
        COUNT(CASE WHEN status = 'reserved' THEN 1 END) as reserved
      FROM seats 
      WHERE performance_id = ?
    `;
    const params = [performanceId];
    //const row = await getQuery(this.db!, sql, params, 'get seat counts');
    const row = await getQuery<{
      available: number
      booked: number
      reserved: number
    }>(this.db!, sql, params, 'get seat counts');
    return {
      available: row?.available || 0,
      booked: row?.booked || 0,
      reserved: row?.reserved || 0
    };
  }

  /**
   * Check if a performance has any booked seats
   */
  async performanceHasBookings(performanceId: string): Promise<boolean> {
    const sql = `
      SELECT COUNT(*) AS count 
      FROM seats 
      WHERE performance_id = ? AND status = 'booked'
    `;
    const params = [performanceId];
    const row = await getQuery<{ count: number }>(this.db!, sql, params, 'check performance bookings');
    return (row?.count || 0) > 0;
  }

  /**
   * Delete seats for a performance
   */
  async deleteSeatsForPerformance(performanceId: string): Promise<boolean> {
    const sql = `DELETE FROM seats WHERE performance_id = ?`;
    const params = [performanceId];
    const result = await runQuery(this.db!, sql, params, 'delete seats for performance');
    return result.changes > 0;
  }

  // Booking methods //////////////////////////////////////////////////////////////////////
  private mapRowToBooking(row: Record<string, unknown>): Booking {
    let seatIds: string[] = [];
    if (row.seat_ids && typeof row.seat_ids === 'string') {
      try { seatIds = JSON.parse(row.seat_ids); } catch { seatIds = []; }
    }
    return {
      id: row.id as string,
      bookingRef: row.booking_ref as string,
      userId: row.user_id as string,
      performanceId: row.performance_id as string,
      status: row.status as BookingStatus,
      totalPrice: row.total_price as number,
      seatCount: row.seat_count as number,
      seatIds,
      bookedAt: row.booked_at as string,
      usedAt: row.used_at as Date | null,
      usedBy: row.used_by as string | null,
      updatedAt: row.updated_at as string | undefined,
      cancelledAt: row.cancelled_at as string | undefined,
    };
  }

  private mapRowsToBookings(rows: Record<string, unknown>[]): Booking[] {
    return rows.map(row => this.mapRowToBooking(row));
  }

  /**
   * Atomic booking transaction.
   *
   * - Verifies all requested seats are 'available'
   * - Creates a booking record
   * - Stamps each seat with booking_id, booked_by_user_id, status = 'booked'
   *
   * Returns the new bookingId on success, or the list of unavailable seat IDs on failure.
   */
  async bookSeats(
    performanceId: string,
    seatIds: string[],
    userId: string,
    totalPrice: number = 0,
  ): Promise<{
    success: boolean;
    bookingRef?: string;
    bookedCount: number;
    seats: string[];
    unavailableSeats?: string[];
  }> {
    return new Promise((resolve, reject) => {
      const db = this.db!;
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // Check all seats are available
        const placeholders = seatIds.map(() => '?').join(',');
        const checkSql = `
          SELECT seat_id, status 
          FROM seats 
          WHERE performance_id = ? AND seat_id IN (${placeholders})
        `;

        db.all(checkSql, [performanceId, ...seatIds], (err, rows: Record<string, unknown>[]) => {
          if (err) {
            db.run('ROLLBACK');
            return reject(err);
          }

          // Find unavailable seats
          const seatStatuses = new Map(rows.map(r => [r.seat_id, r.status]));
          const unavailable = seatIds.filter(id => seatStatuses.get(id) !== 'available');
          if (unavailable.length > 0) {
            db.run('ROLLBACK');
            return resolve({
              success: false,
              bookedCount: 0,
              seats: [],
              unavailableSeats: unavailable,
            });
          }

          // Create the booking record
          const bookingRef = generateBookingRef();
          const status = 'confirmed';
          const insertBookingSql = `
            INSERT INTO bookings (booking_ref, user_id, performance_id, status, total_price, seat_count, seat_ids)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `;

          db.run(
            insertBookingSql,
            [bookingRef, userId, performanceId, status, totalPrice, seatIds.length, JSON.stringify(seatIds)],
            (err) => {
              if (err) {
                db.run('ROLLBACK');
                return reject(err);
              }

              // Stamp seats with the bookingRef
              const updateSeatsSql = `
                UPDATE seats 
                SET
                  status = 'booked',
                  booking_ref = ?,
                  booked_by_user_id = ?,
                  booked_at = CURRENT_TIMESTAMP,
                  updated_at = CURRENT_TIMESTAMP
                WHERE performance_id = ? AND seat_id IN (${placeholders})
              `;

              const params = [bookingRef, userId, performanceId, ...seatIds];
              db.run(updateSeatsSql, params, (err) => {
                if (err) {
                  db.run('ROLLBACK');
                  return reject(err);
                }

                db.run('COMMIT', (err) => {
                  if (err) {
                    return reject(err);
                  }
                  resolve({
                    success: true,
                    bookingRef,
                    bookedCount: seatIds.length,
                    seats: seatIds,
                    unavailableSeats: [],
                  });
                });
              });
            }
          );
        });
      });
    });
  }

  async getBookingById(bookingId: string): Promise<Booking | null> {
    const sql = `SELECT * FROM bookings WHERE id = ?`;
    const row = await getQuery(this.db!, sql, [bookingId], 'get booking by id');
    return row ? this.mapRowToBooking(row) : null;
  }

  async getBookingByRef(ref: string): Promise<Booking | null> {
    const sql = `SELECT * FROM bookings WHERE booking_ref = ?`;
    const row = await getQuery(this.db!, sql, [ref], 'get booking by ref');
    return row ? this.mapRowToBooking(row) : null;
  }

  async getBookingsByUserId(userId: string): Promise<Booking[]> {
    const sql = `
      SELECT * FROM bookings
      WHERE user_id = ?
      ORDER BY booked_at DESC
    `;
    const rows = await allQuery(this.db!, sql, [userId], 'get bookings by user');
    return this.mapRowsToBookings(rows);
  }

  async getBookingsByPerformanceId(performanceId: string): Promise<Booking[]> {
    const sql = `
      SELECT * FROM bookings
      WHERE performance_id = ?
      ORDER BY booked_at DESC
    `;
    const rows = await allQuery(this.db!, sql, [performanceId], 'get bookings by performance');
    return this.mapRowsToBookings(rows);
  }

  /**
 * Atomically marks a booking as used.
 * Returns the row if it was just now marked, null if already used or not found.
 */
  async markBookingUsed(ref: string, usedBy?: string): Promise<boolean> {
    const sql = `
      UPDATE bookings
      SET
        used_at = CURRENT_TIMESTAMP,
        used_by = ?
      WHERE booking_ref = ?
      AND used_at IS NULL
      AND status = 'confirmed' -- never admit a cancelled/refunded ticket
    `;
    const values = [usedBy ?? null, ref];
    const result = await runQuery(this.db!, sql, values, 'mark booking used');
    return result.changes > 0;
  }

  /**
   * Cancel a booking and release its seats back to 'available'.
   * Only the owning user (or an admin, enforced at the route level) should call this.
   */
  async cancelBooking(bookingId: string): Promise<{
    success: boolean;
    reason?: string;
  }> {
    return new Promise((resolve, reject) => {
      const db = this.db!;
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // Fetch the booking first to validate it exists and is cancellable
        db.get(
          `SELECT id, status FROM bookings WHERE id = ?`,
          [bookingId],
          (err, row: Record<string, unknown> | undefined) => {
            if (err) { db.run('ROLLBACK'); return reject(err); }
            if (!row) {
              db.run('ROLLBACK');
              return resolve({ success: false, reason: 'BOOKING_NOT_FOUND' });
            }
            if (row.status !== 'confirmed') {
              db.run('ROLLBACK');
              return resolve({ success: false, reason: 'BOOKING_ALREADY_CANCELLED_OR_REFUNDED' });
            }

            // Mark booking as cancelled
            db.run(
              `UPDATE bookings
               SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
               WHERE id = ?`,
              [bookingId],
              (err) => {
                if (err) { db.run('ROLLBACK'); return reject(err); }

                // Release seats back to available
                db.run(
                  `UPDATE seats
                   SET status = 'available', booking_id = NULL,
                       booked_by_user_id = NULL, booked_at = NULL, updated_at = CURRENT_TIMESTAMP
                   WHERE booking_id = ?`,
                  [bookingId],
                  (err) => {
                    if (err) { db.run('ROLLBACK'); return reject(err); }
                    db.run('COMMIT', (err) => {
                      if (err) return reject(err);
                      resolve({ success: true });
                    });
                  }
                );
              }
            );
          }
        );
      });
    });
  }

  // Setup table methods /////////////////////////////////////////////////////////
  async loadSetup(): Promise<GeneralSetupType | null> {
    const sql = `
      SELECT data
      FROM setup
      WHERE id = 1
    `;
    const row = await getQuery<{ data: string }>(this.db!, sql, [], 'load setup');
    if (!row) return null;

    try {
      return JSON.parse(row.data) as GeneralSetupType;
    } catch {
      return null;
    }
  }

  async saveSetup(data: unknown): Promise<void> {
    const json = JSON.stringify(data);

    const sql = `
      INSERT INTO setup (id, data)
      VALUES (1, ?)
      ON CONFLICT(id)
      DO UPDATE SET
        data = excluded.data,
        updated_at = CURRENT_TIMESTAMP
    `;
    await runQuery(this.db!, sql, [json], 'save setup');
  }
}

/**
 * Execute SQL script without parameters
 * Use for: CREATE TABLE, ALTER TABLE, multiple statements, schema initialization
 */
const execQuery = (
  db: sqlite3.Database,
  sql: string,
  context: string = '',
): Promise<void> =>
  new Promise((resolve, reject) => {
    db.exec(sql, err => {
      if (err) reject(new Error(`${context}: ${err.message}`));
      else resolve();
    });
  });

/**
 * Run parameterized query (INSERT, UPDATE, DELETE)
 * Returns RunResult with lastID and changes
 */
type SqlParam = string | number | Buffer | null;

const runQuery = (
  db: sqlite3.Database,
  sql: string,
  params: SqlParam[] = [],
  context = ''
): Promise<sqlite3.RunResult> =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(new Error(`${context}: ${err.message}`));
      else resolve(this);
    });
  });

const getQuery = <T extends Record<string, unknown> = Record<string, unknown>>(
  db: sqlite3.Database,
  sql: string,
  params: SqlParam[] = [],
  context = ''
): Promise<T | undefined> =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(new Error(`${context}: ${err.message}`));
      else resolve(row as T);
    });
  });

const allQuery = <T extends Record<string, unknown> = Record<string, unknown>>(
  db: sqlite3.Database,
  sql: string,
  params: SqlParam[] = [],
  context = ''
): Promise<T[]> =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(new Error(`${context}: ${err.message}`));
      else resolve(rows as T[]);
    });
  });

function toSqlParam(value: unknown): string | number | null {
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (value === null || typeof value === 'number' || typeof value === 'string') return value;
  return JSON.stringify(value);
}

function generateBookingRef(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O, 1/I
  const id = Array.from({ length: 7 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
  return `TK-${id}`;
}

// release expired reservations, continuously
setInterval(async () => { // TODO: move to /backend/src/scheduled/jobs.ts
  await database.releaseExpiredReservations();
}, 60 * 1000); // TODO: to config
 
export const database = new Database();
