import sqlite3 from 'sqlite3';
import { promises as fs } from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { Migrator } from './migrator';
import { User, NewUser } from '@ticketuno/shared';
import { Theater, TheaterStatus, EventStatus, SeatStatus, Seat, TheaterConflictDetails } from '@ticketuno/shared';
import { Layout, LayoutJSON } from '@ticketuno/shared';
import { Event, EventPerformance } from '@ticketuno/shared';
import { GeneratedSeat } from '@ticketuno/shared';
import { FullConsent } from '@ticketuno/shared';
import { Booking, BookingStatus, BookingQueryOptions, BookingEnriched, BookingDetail, SeatDetail } from '@ticketuno/shared';
import { GeneralSetupType } from '@ticketuno/shared';
import { ActiveBookingInfo, GuardedDeleteResult, GuardedDeleteResultBulk, GuardResult } from '@ticketuno/shared';
import { EventQueryOptions, PerformanceQueryOptions } from '@ticketuno/shared';
import { ROLES, type Role } from '@ticketuno/shared';
import { PaymentGateway } from '@ticketuno/shared/types/generalSetup';
import { tenantContext } from '../tenancy/tenantContext';
import { notify } from '../services/notificationService';
import config from '../config';

// ---------------------------------------------------------------------------
// Query option types
// ---------------------------------------------------------------------------

interface GetAllBookingsOptions {
  status?: string; // 'confirmed' | 'canceled' | 'refunded' | 'all' | undefined
  performanceDate?: string; // 'YYYY-MM-DD'
  eventId?: string;
}

// ---------------------------------------------------------------------------

class Database {
  private _db: sqlite3.Database | null = null;
  private tenantSlug: string = config.db.defaultTenantSlug; // TODO: why this tenantSlug is declared but its value is never read ??

  /** Safe accessor — throws if initialize() has not been called yet. */
  private get db(): sqlite3.Database {
    if (!this._db) throw new Error('Database not initialized. Call initialize() first.');
    return this._db;
  }

  uuid(): string {
    const fullUuid = uuidv4().replace(/-/g, '');
    const buffer = Buffer.from(fullUuid, 'hex');
    return buffer
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  async initialize(dbPath: string, tenantSlug: string): Promise<void> {
    this.tenantSlug = tenantSlug;
    const dir = path.dirname(dbPath);
    await fs.mkdir(dir, { recursive: true });

    return new Promise<void>((resolve, reject) => {
      this._db = new sqlite3.Database(dbPath, async (err) => {

  // async initialize(): Promise<void> {
  //   const dir = path.dirname(config.db.path);
  //   await fs.mkdir(dir, { recursive: true });

  //   return new Promise<void>((resolve, reject) => {
  //     this._db = new sqlite3.Database(config.db.path, async (err) => {
        if (err) {
          reject(err);
        } else {
          try {
            await this.initSchema();
            await this.runMigrations();
            await this.createDefaultUsers();
            await this.createDefaultSetup();
            resolve();
          } catch (error) {
            reject(error);
          }
        }
      });
    });
  }

  private async runMigrations(): Promise<void> {
    const migrationsPath = path.join(__dirname, 'migrations');
    const migrator = new Migrator(this.db, migrationsPath);
    await migrator.migrate();
  }

  private async initSchema(): Promise<void> {
    await execQuery(this.db, `PRAGMA foreign_keys = ON;`, 'PRAGMA foreign_keys');
    await execQuery(this.db, `PRAGMA foreign_key_check;`, 'PRAGMA foreign_key_check');

    await execQuery(this.db, `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL, -- UNIQUE,
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
        google_id TEXT, --UNIQUE,
        consent TEXT,
        language TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME,
        deleted_at DATETIME
      );
    `, 'CREATE users');

    await execQuery(this.db, `
      CREATE TABLE IF NOT EXISTS theaters (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        stage_type TEXT,
        address TEXT,
        website_url TEXT,
        contact_phone TEXT,
        contact_email TEXT,
        status TEXT NOT NULL,
        current_layout_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME,
        deleted_at DATETIME,
        FOREIGN KEY (current_layout_id) REFERENCES layouts(id)
      );
    `, 'CREATE theaters');

    await execQuery(this.db, `
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

    await execQuery(this.db, `
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

    await execQuery(this.db, `
      CREATE TABLE IF NOT EXISTS performances (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL,
        performance_date TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT,
        --status TEXT DEFAULT 'scheduled',
        --canceled INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME,
        deleted_at DATETIME,
        canceled_at DATETIME,
        FOREIGN KEY (event_id) REFERENCES events(id)
      );
    `, 'CREATE performances');

    await execQuery(this.db, `
      CREATE TABLE IF NOT EXISTS bookings (
        id TEXT PRIMARY KEY,
        booking_ref TEXT NOT NULL,
        user_id TEXT NOT NULL,
        performance_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'confirmed', -- pending_payment | confirmed | canceled | refunded
        total_price REAL NOT NULL DEFAULT 0,
        seat_count INTEGER NOT NULL DEFAULT 0,
        seat_ids TEXT NOT NULL DEFAULT '[]', -- JSON array, denormalised for quick ticket lookup
        payment_method TEXT DEFAULT 'stripe',
        payment_status TEXT DEFAULT 'pending',
        payment_intent_id TEXT,
        booked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        scanned_at DATETIME,
        scanned_by TEXT,
        updated_at DATETIME,
        canceled_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (performance_id) REFERENCES performances(id)
      );
    `, 'CREATE bookings');

    await execQuery(this.db, `
      CREATE TABLE IF NOT EXISTS seats (
        performance_id TEXT NOT NULL,
        seat_id TEXT NOT NULL,
        section_name TEXT NOT NULL,
        row_id TEXT NOT NULL,
        seat_number INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'available',
        price REAL,
        booking_id TEXT,
        booking_ref TEXT, -- unique ticket reference, set when seat is booked
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

    await execQuery(this.db, `
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

    await execQuery(this.db, `
      CREATE TABLE IF NOT EXISTS setup (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME
      );
    `, 'CREATE setup');

    await execQuery(this.db, `
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        endpoint TEXT NOT NULL UNIQUE,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        last_used_at TEXT
      );
    `, 'CREATE push_subscriptions');

    await execQuery(this.db, `
      CREATE INDEX IF NOT EXISTS idx_layouts_active
      ON layouts(theater_id)
      WHERE deleted_at IS NULL
    `, 'INDEX layouts_active');

    await execQuery(this.db, `
      CREATE INDEX IF NOT EXISTS idx_seats_performance ON seats(performance_id);
    `, 'INDEX seats_performance');

    await execQuery(this.db, `
      CREATE INDEX IF NOT EXISTS idx_seats_section ON seats(performance_id, section_name);
    `, 'INDEX seats_section');

    await execQuery(this.db, `
      CREATE INDEX IF NOT EXISTS idx_seats_status ON seats(performance_id, status);
    `, 'INDEX seats_status');

    await execQuery(this.db, `
      CREATE INDEX IF NOT EXISTS idx_seats_user ON seats(booked_by_user_id);
    `, 'INDEX seats_user');

    await execQuery(this.db, `
      CREATE INDEX IF NOT EXISTS idx_seats_booking ON seats(booking_id);
    `, 'INDEX seats_booking');

    await execQuery(this.db, `
      CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_ref ON bookings(booking_ref);
    `, 'INDEX bookings_ref');

    await execQuery(this.db, `
      CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
    `, 'INDEX bookings_user');

    await execQuery(this.db, `
      CREATE INDEX IF NOT EXISTS idx_bookings_performance ON bookings(performance_id);
    `, 'INDEX bookings_performance');

    await execQuery(this.db, `
      CREATE UNIQUE INDEX IF NOT EXISTS idx_tokens_token ON tokens(token);
    `, 'INDEX tokens_token');

    await execQuery(this.db, `
      CREATE INDEX IF NOT EXISTS idx_tokens_user ON tokens(user_id);
    `, 'INDEX tokens_user');

    await execQuery(this.db, `
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_active
      ON users(email)
      WHERE deleted_at IS NULL
    `, 'INDEX user_email_active');

    await execQuery(this.db, `
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id_active
      ON users(google_id)
      WHERE deleted_at IS NULL
    `, 'INDEX user_google_id_active');
  }

  // ---------------------------------------------------------------------------
  // User methods
  // ---------------------------------------------------------------------------

  async getAllUsers(): Promise<User[]> {
    const rows = await allQuery(this.db, `
      SELECT *
      FROM users
      WHERE deleted_at IS NULL
    `, [], 'get all users');
    return this.mapRowsToUsers(rows);
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
      id, user.email, user.password, user.firstName, user.lastName, user.phone || null, user.role,
      user.isVerified ? 1 : 0, user.verificationCode ?? null, user.verificationCodeExpiry ?? null,
      user.consent ? JSON.stringify(user.consent) : null,
      user.googleId ?? null, user.language ?? config.app.defaultLanguage,
    ];
    await runQuery(this.db, sql, params, 'create user');
    return id;
  }

  private mapRowToUser(row: Record<string, unknown>): User {
    let consent: FullConsent | null = null;
    if (row.consent && typeof row.consent === 'string') {
      try { consent = JSON.parse(row.consent); } catch { consent = null; }
    }
    return {
      id: row.id as string,
      email: row.email as string,
      password: row.password as string,
      firstName: row.first_name as string,
      lastName: row.last_name as string,
      phone: row.phone as string,
      role: (['admin', 'operator', 'user'].includes(row.role as string) ? row.role : 'user') as User['role'],
      isVerified: row.is_verified === 1,
      verificationCode: row.verification_code as string,
      verificationCodeExpiry: row.verification_code_expiry as string,
      resetPasswordCode: row.reset_password_code as string,
      resetPasswordCodeExpiry: row.reset_password_code_expiry as string,
      googleId: row.google_id as string,
      language: row.language as string,
      consent,
      accountId: row.stripe_account_id as string,
      stripeOnboardingCompleted: row.stripe_onboarding_completed as boolean,
      stripeAccountStatus: row.stripe_account_status as string,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }

  private mapRowsToUsers(rows: Record<string, unknown>[]): User[] {
    return rows.map(row => this.mapRowToUser(row));
  }

  async getUserByGoogleId(googleId: string): Promise<User | null> {
    const row = await getQuery<Record<string, unknown>>(
      this.db, `
        SELECT *
        FROM users
        WHERE google_id = ?
        AND deleted_at IS NULL
      `, [googleId], 'get user by google id'
    );
    return row ? this.mapRowToUser(row) : null;
  }

  async createDefaultUsers(): Promise<void> {
    const postfix = this.tenantSlug.toUpperCase().replace(/-/g, '_');

    const adminEmail = process.env[`ADMIN_USER_EMAIL_${postfix}`] ?? process.env.ADMIN_USER_EMAIL;
    const adminPassword = process.env[`ADMIN_USER_PASSWORD_${postfix}`] ?? process.env.ADMIN_USER_PASSWORD;
    const operatorEmail = process.env[`OPERATOR_USER_EMAIL_${postfix}`] ?? process.env.OPERATOR_USER_EMAIL;
    const operatorPassword = process.env[`OPERATOR_USER_PASSWORD_${postfix}`] ?? process.env.OPERATOR_USER_PASSWORD;

    if (!adminEmail || !adminPassword) {
      throw new Error(`ADMIN_USER_EMAIL_${postfix} (or ADMIN_USER_EMAIL) and ...PASSWORD must be set!`);
    }
    if (!operatorEmail || !operatorPassword) {
      throw new Error(`OPERATOR_USER_EMAIL_${postfix} (or OPERATOR_USER_EMAIL) and ...PASSWORD must be set!`);
    }

    try {
      await this.createDefaultUserIfNotExists(adminEmail, adminPassword, 'admin', 'Ammini', 'Stratore', config.app.defaultLanguage);
      await this.createDefaultUserIfNotExists(operatorEmail, operatorPassword, 'operator', 'Opera', 'Tore', config.app.defaultLanguage);
    } catch (error) {
      console.error('Error creating default users:', error);
      throw error;
    }
  }

  private async createDefaultUserIfNotExists(
    email: string, password: string, role: string,
    firstName: string, lastName: string, language: string,
  ): Promise<void> {
    const hashedPassword = await bcrypt.hash(password, 10);
    const id = this.uuid();
    const result = await runQuery(
      this.db, `
        INSERT OR IGNORE INTO users
        (id, email, password, first_name, last_name, role, language, is_verified)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1)
      `,
      [id, email, hashedPassword, firstName, lastName, role, language],
      `create default ${role} user`
    );
    if (result.changes > 0) {
      console.log(`Default ${role} user created successfully`);
    }
    // If changes === 0, the row already existed — silently skip.
  }

  private async createDefaultSetup(): Promise<void> {
    await runQuery(
      this.db, `
        INSERT OR IGNORE INTO setup
        (id, data)
        VALUES (1, ?)
      `,
      [JSON.stringify({
        currency: config.app.defaultCurrency,
        timeout: 10,
        enableNotifications: true,
        launchDate: null,
        time: null,
        apiKey: '',
      })],
      'INSERT default setup row'
    );
  }

  // ---------------------------------------------------------------------------
  // Audit log
  // ---------------------------------------------------------------------------

  async logAudit(entry: {
    action: string;
    actorUserId?: string | null;
    targetUserId?: string | null;
    ip?: string | null;
    userAgent?: string | null;
    metadata?: Record<string, unknown> | null;
  }): Promise<void> {
    const id = this.uuid();
    const params: SqlParam[] = [
      id,
      entry.action,
      entry.actorUserId ?? null,
      entry.targetUserId ?? null,
      entry.ip ?? null,
      entry.userAgent ?? null,
      entry.metadata ? JSON.stringify(entry.metadata) : null,
    ];
    await runQuery(
      this.db, `
        INSERT INTO audit_log
        (id, action, actor_user_id, target_user_id, ip, user_agent, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      params, 'insert audit log'
    );
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const row = await getQuery(this.db, `
      SELECT *
      FROM users
      WHERE email = ?
      AND deleted_at IS NULL
    `, [email], 'get user by email');
    return row ? this.mapRowToUser(row) : null;
  }

  async getUserById(id: string): Promise<User | null> {
    const row = await getQuery(this.db, `
      SELECT *
      FROM users
      WHERE id = ?
      AND deleted_at IS NULL
    `, [id], 'get user by id');
    return row ? this.mapRowToUser(row) : null;
  }

  async getUsersByIds(ids: string[]): Promise<User[]> {
    if (!ids.length) return [];
    const placeholders = ids.map(() => '?').join(',');
    const rows = await allQuery(this.db, `
      SELECT *
      FROM users
     WHERE id IN (${placeholders})
      AND deleted_at IS NULL
    `, ids, 'get users by ids');
    return this.mapRowsToUsers(rows);
  }

  async getUsersByRole(role: string): Promise<User[]> {
    if (!role) return [];
    const rows = await allQuery(this.db, `
      SELECT *
      FROM users
      WHERE role = ?
      AND deleted_at IS NULL
    `, [role], 'get users by role');
    return this.mapRowsToUsers(rows);
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
      accountId: 'stripe_account_id',
      stripeOnboardingCompleted: 'stripe_onboarding_completed',
      stripeAccountStatus: 'stripe_account_status',
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

    if (fields.length === 0) return false;

    values.push(id);
    const result = await runQuery(
      this.db, `
        UPDATE users
        SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      values,
      'update user'
    );
    return result.changes > 0;
  }

  async createToken(userId: string, type: string, expiresInDays: number = config.auth.tokenExpirationDays): Promise<string> {
    const id = this.uuid();
    const token = this.uuid();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    await runQuery(
      this.db, `
        INSERT INTO tokens
        (id, token, user_id, type, expires_at)
        VALUES (?, ?, ?, ?, ?)
      `,
      [id, token, userId, type, expiresAt.toISOString()],
      'create token'
    );
    return token;
  }

  async deleteToken(token: string): Promise<void> {
    await runQuery(
      this.db, `
        DELETE FROM tokens
        WHERE token = ?
      `,
      [token],
      'delete token'
    );
  }

  async getUserByToken(token: string, type?: string): Promise<User | null> {
    let sql = `
      SELECT user_id
      FROM tokens
      WHERE token = ?
      AND expires_at > CURRENT_TIMESTAMP
    `;
    const params: SqlParam[] = [token];
    if (type) {
      sql += ` AND type = ?`;
      params.push(type);
    }
    const row = await getQuery<{ user_id: string }>(this.db, sql, params, 'get user by token');
    if (!row) return null;
    return this.getUserById(row.user_id);
  }
  
  async deleteUsers(ids: string[]): Promise<GuardedDeleteResultBulk> {
    const results: Record<string, GuardedDeleteResult> = {};

    for (const id of ids) {
      const guard = await this.guardUser(id);
      if (!guard.safe) {
        results[id] = {
          deleted: false,
          reason: 'USER_HAS_ACTIVE_BOOKINGS',
          blockedBy: guard.bookings,
        };
        continue;
      }
      const result = await runQuery(
        this.db, `
          UPDATE users
          SET deleted_at = CURRENT_TIMESTAMP
          WHERE id = ?
          AND deleted_at IS NULL
        `,
        [id], 'soft delete user'
      );
      results[id] = {
        deleted: result.changes > 0,
        ...(result.changes === 0 && { reason: 'USER_NOT_FOUND' }),
      };
    }

    return {
      results,
      deleted: Object.values(results).filter(r => r.deleted).length,
      blocked: Object.values(results).filter(r => !r.deleted).length,
    };
  }
  
  async deleteUser(id: string) {
    const bulk = await this.deleteUsers([id]);
    return bulk.results[id];
  }

  /**
   * Checks if all given user ids exist and have a role strictly lower than `actorRole`.
   * @returns true if all ids are valid and every target role < actorRole
   */
  async canDeleteUsers(ids: string[], actorRole: Role): Promise<boolean> {
    // Roles that are NOT allowed (level >= actorRole)
    const actorIndex = ROLES.indexOf(actorRole);
    const forbiddenRoles = ROLES.slice(actorIndex + 1); // excludes actor's own role; e.g. ['admin'] if actor is operator

    const placeholders = ids.map(() => '?').join(',');
    const row = await getQuery(this.db, `
      SELECT
        COUNT(*) AS total_found,
        SUM(CASE WHEN role IN (${forbiddenRoles.map(() => '?').join(',')}) THEN 1 ELSE 0 END) AS forbidden_count
      FROM users
      WHERE id IN (${placeholders})
      AND deleted_at IS NULL
    `, [...ids, ...forbiddenRoles]);

    // All ids must exist AND none of them may have a forbidden role
    return row ? (row.total_found === ids.length && row.forbidden_count === 0) : false;
  }

  // ---------------------------------------------------------------------------
  // Theater methods
  // ---------------------------------------------------------------------------

  private mapRowToTheater(row: Record<string, unknown>): Theater {
    return {
      id: row.id as string,
      name: row.name as string,
      description: row.description as string,
      stageType: row.stage_type as string,
      address: row.address as string,
      websiteUrl: row.website_url as string,
      contactPhone: row.contact_phone as string,
      contactEmail: row.contact_email as string,
      status: row.status as TheaterStatus,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
      currentLayoutId: row.current_layout_id as string | undefined,
    };
  }

  private mapRowsToTheaters(rows: Record<string, unknown>[]): Theater[] {
    return rows.map(row => this.mapRowToTheater(row));
  }

  async getAllTheaters(): Promise<Theater[]> {
    const rows = await allQuery(
      this.db, `
        SELECT *
        FROM theaters
        WHERE deleted_at IS NULL
      `, [], 'get all theaters'
    );
    return this.mapRowsToTheaters(rows);
  }

  async getTheaterById(id: string): Promise<Theater | null> {
    const row = await getQuery(
      this.db, `
        SELECT *
        FROM theaters
        WHERE id = ?
        AND deleted_at IS NULL
      `,
      [id], 'get theater by id'
    );
    return row ? this.mapRowToTheater(row) : null;
  }

  async createTheater(theater: Theater): Promise<string> {
    const id = this.uuid();
    const sql = `
      INSERT INTO theaters (
        id, name, description, stage_type, address,
        website_url, contact_phone, contact_email, status, current_layout_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params: SqlParam[] = [
      id, theater.name, theater.description ?? null, theater.stageType ?? null,
      theater.address ?? null, theater.websiteUrl ?? null,
      theater.contactPhone || null, theater.contactEmail || null,
      theater.status, theater.currentLayoutId ?? null,
    ];
    await runQuery(this.db, sql, params, 'create theater');
    return id;
  }

  async updateTheater(
    id: string,
    updates: Partial<Theater>
  ): Promise<{ updated: boolean; reason?: string; blockedBy?: ActiveBookingInfo[] }> {
    
    // Guard: if layoutId is being changed, check for active bookings
    if (updates.currentLayoutId !== undefined) {
      // Fetch current theater to see if layoutId actually changes
      const current = await getQuery<{ current_layout_id: string }>(
        this.db, `
          SELECT current_layout_id
          FROM theaters
          WHERE id = ?
          AND deleted_at IS NULL
        `,
        [id],
        'updateTheater: get current layout'
      );
      if (current && current.current_layout_id !== updates.currentLayoutId) {
        const guard = await this.guardTheater(id);
        if (!guard.safe) {
          return {
            updated: false,
            reason: 'THEATER_HAS_ACTIVE_BOOKINGS',
            blockedBy: guard.bookings,
          };
        }
      }
    }

    // if (updates.currentLayoutId !== undefined) {
    //   const guard = await this.guardLayout(id);
    //   if (!guard.safe) {
    //     return {
    //       updated: false,
    //       reason: 'LAYOUT_HAS_ACTIVE_BOOKINGS',
    //       blockedBy: guard.bookings,
    //     };
    //   }
    // }
    
    const fields: string[] = [];
    const values: (string | number)[] = [];

    const fieldMap: Record<string, string> = {
      name: 'name',
      description: 'description',
      stageType: 'stage_type',
      address: 'address',
      websiteUrl: 'website_url',
      contactPhone: 'contact_phone',
      contactEmail: 'contact_email',
      status: 'status',
      currentLayoutId: 'current_layout_id',
    };

    Object.entries(updates).forEach(([key, value]) => {
      if (fieldMap[key] && value !== undefined) {
        fields.push(`${fieldMap[key]} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) return { updated: false };

    values.push(id);
    const result = await runQuery(
      this.db, `
        UPDATE theaters
        SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      values, 'update theater full'
    );
    return { updated: result.changes > 0 };
  }

  async deleteTheater(id: string):
    Promise<{ deleted: boolean; reason?: string; blockedBy?: ActiveBookingInfo[] }>
  {
    const guard = await this.guardTheater(id);
    if (!guard.safe) {
      return {
        deleted: false,
        reason: 'THEATER_HAS_ACTIVE_BOOKINGS',
        blockedBy: guard.bookings,
      };
    }

    const result = await runQuery(
      this.db, `
        UPDATE theaters
        SET deleted_at = CURRENT_TIMESTAMP
        WHERE id = ?
        AND deleted_at IS NULL
      `,
      [id], 'soft delete theater'
    );
    return {
      deleted: result.changes > 0,
      ...(result.changes === 0 && { reason: 'THEATER_NOT_FOUND' }),
    };
  }

  // ---------------------------------------------------------------------------
  // Layout methods (IMMUTABLE)
  // ---------------------------------------------------------------------------

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
    await runQuery(
      this.db, `
        INSERT INTO layouts
        (id, theater_id, name, description, json)
        VALUES (?, ?, ?, ?, ?)`,
      [id, layout.theaterId ?? null, layout.name ?? null, layout.description ?? null, layout.json],
      'create layout'
    );
    return id;
  }

  // async getLayoutById(id: string): Promise<Layout | null> {
  //   const row = await getQuery(
  //     this.db, `
  //       SELECT id, theater_id, name, description, json
  //       FROM layouts
  //       WHERE id = ?
  //       AND deleted_at IS NULL
  //     `,
  //     [id], 'get layout by id'
  //   );
  //   if (!row) return null;
  //   const layout = this.mapRowToLayout(row);
  //   // const lock = await this.getLayoutLockInfo(id);
  //   // layout.isEditable = lock.editable;
  //   // layout.lockInfo = lock.blockedBy ?? [];
  //   return layout;
  // }
  async getLayoutById(id: string): Promise<(Layout /*& { editable: boolean; blockedBy?: ActiveBookingInfo[] }*/) | null> {
    const row = await getQuery(
      this.db, `
        SELECT id, theater_id, name, description, json
        FROM layouts
        WHERE id = ?
        AND deleted_at IS NULL
      `,
      [id], 'get layout by id'
    );
    if (!row) return null;
    const layout = this.mapRowToLayout(row);
    const guard = await this.guardLayout(id);
    return { ...layout, /*editable: guard.safe, */blockedBy: guard.bookings };
  }

  async getLayoutByTheaterId(theaterId: string): Promise<Layout | null> {
    const row = await getQuery(
      this.db, `
        SELECT id, theater_id, name, description, json
        FROM layouts
        WHERE theater_id = ?
        AND deleted_at IS NULL
      `,
      [theaterId], 'get layout by theater id'
    );
    if (!row) return null;

    const layout = this.mapRowToLayout(row);
    // const lock = await this.getLayoutLockInfo(layout.id);
    // layout.isEditable = lock.editable;
    // layout.lockInfo = lock.blockedBy ?? [];
    return layout;
  }

  async getAllLayouts(): Promise<Layout[]> {
    const rows = await allQuery(
      this.db, `
        SELECT id, theater_id, name, description, json
        FROM layouts
        WHERE deleted_at IS NULL
      `,
      [], 'get all layouts'
    );
    const layouts = this.mapRowsToLayouts(rows);
    // await Promise.all(layouts.map(async l => {
    //   const lock = await this.getLayoutLockInfo(l.id);
    //   l.isEditable = lock.editable;
    //   l.lockInfo = lock.blockedBy ?? [];
    // }));
    return layouts;
  }

  // Guards
  private async queryActiveBookings(
    extraJoins: string,
    extraWhere: string,
    params: SqlParam[]
  ): Promise<ActiveBookingInfo[]> {
    const sql = `
      SELECT
        b.id AS bookingId,
        b.booking_ref AS bookingRef,
        b.seat_ids AS seatIds,
        b.total_price AS totalPrice,
        p.id AS performanceId,
        p.performance_date AS performanceDate,
        p.start_time AS startTime,
        e.id AS eventId,
        e.title AS eventTitle,
        th.name AS theaterName,
        u.id AS userId,
        u.first_name AS userFirstName,
        u.last_name AS userLastName,
        u.email AS userEmail
      FROM bookings b
      JOIN performances p ON p.id = b.performance_id
      JOIN events e ON e.id = p.event_id
      JOIN theaters th ON th.id = e.theater_id
      JOIN users u ON u.id = b.user_id
      ${extraJoins}
      WHERE b.status = 'confirmed'
        AND p.deleted_at IS NULL
        AND e.deleted_at IS NULL
        AND e.canceled = 0
        AND (
          p.performance_date > DATE('now')
          OR (p.performance_date = DATE('now') AND p.start_time > TIME('now'))
        )
        AND ${extraWhere}
      ORDER BY p.performance_date, p.start_time
    `;
    const rows = await allQuery<Record<string, unknown>>(
      this.db, sql, params, 'query active bookings'
    );
    return rows.map(r => ({
      bookingId: r.bookingId as string,
      bookingRef: r.bookingRef as string,
      performanceId: r.performanceId as string,
      performanceDate: r.performanceDate as string,
      startTime: r.startTime as string,
      eventId: r.eventId as string,
      eventTitle: r.eventTitle as string,
      theaterName: r.theaterName as string,
      userId: r.userId as string,
      userFirstName: r.userFirstName as string,
      userLastName: r.userLastName as string,
      userEmail: r.userEmail as string,
      seatIds: (() => { try { return JSON.parse(r.seatIds as string); } catch { return []; } })(),
      totalPrice: r.totalPrice as number,
    }));
  }

  private toGuardResult(bookings: ActiveBookingInfo[]): GuardResult {
    return { safe: bookings.length === 0, bookings };
  }

  async guardUser(userId: string): Promise<GuardResult> {
    return this.toGuardResult(
      await this.queryActiveBookings('', 'u.id = ?', [userId])
    );
  }
  
  async guardPerformance(performanceId: string): Promise<GuardResult> {
    return this.toGuardResult(
      await this.queryActiveBookings('', 'p.id = ?', [performanceId])
    );
  }

  async guardEvent(eventId: string): Promise<GuardResult> {
    return this.toGuardResult(
      await this.queryActiveBookings('', 'e.id = ?', [eventId])
    );
  }

  async guardTheater(theaterId: string): Promise<GuardResult> {
    return this.toGuardResult(
      await this.queryActiveBookings('', 'e.theater_id = ?', [theaterId])
    );
  }

  async guardLayout(layoutId: string): Promise<GuardResult> {
    return this.toGuardResult(
      await this.queryActiveBookings(
        '', //'JOIN theaters t ON t.id = e.theater_id',
        'th.current_layout_id = ?',
        [layoutId]
      )
    );
  }

  // /**
  //  * A layout is considered locked only when it has booked or reserved seats in
  //  * performances that are TODAY or in the FUTURE (past performances are ignored).
  //  */
  // async getLayoutLockInfo(layoutId: string): Promise<{
  //   editable: boolean;
  //   blockedBy?: Array<{ eventTitle: string; performanceDate: string; startTime: string; booked: number; reserved: number }>;
  // }> {
  //   const sql = `
  //     SELECT
  //       e.title AS eventTitle,
  //       p.performance_date AS performanceDate,
  //       p.start_time AS startTime,
  //       COUNT(CASE WHEN s.status = 'booked' THEN 1 END) AS booked,
  //       COUNT(CASE WHEN s.status = 'reserved' THEN 1 END) AS reserved
  //     FROM seats s
  //     JOIN performances p ON p.id = s.performance_id
  //     JOIN events e ON e.id = p.event_id
  //     JOIN theaters t ON t.id = e.theater_id
  //     WHERE t.current_layout_id = ?
  //       AND s.status IN ('booked', 'reserved')
  //       AND p.performance_date >= DATE('now')
  //       AND p.deleted_at IS NULL
  //     GROUP BY p.id
  //     ORDER BY p.performance_date, p.start_time
  //   `;
  //   const rows = await allQuery<LockInfoRow>(this.db, sql, [layoutId], 'get layout lock info');

  //   if (rows.length === 0) return { editable: true };

  //   return {
  //     editable: false,
  //     blockedBy: rows.map(r => ({
  //       eventTitle: r.eventTitle,
  //       performanceDate: r.performanceDate,
  //       startTime: r.startTime,
  //       booked: r.booked,
  //       reserved: r.reserved,
  //     })),
  //   };
  // }

  async updateLayout(id: string, updates: Partial<Layout>): Promise<{
    updated: boolean; reason?: string; blockedBy?: ActiveBookingInfo[]
  }> {
    // // Check if some seat data has been modified... If only name or description are to be modified, we can accept it...
    // Object.entries(updates).forEach(([key, value]) => {
    //   console.log('*** key:', key, 'value:', value);
    // });

    // Fetch current layout to compare structural changes
    const currentLayout = await this. getLayoutById(id);
    if (!currentLayout) {
      return { updated: false, reason: 'LAYOUT_NOT_FOUND' };
    }

    // Determine if the update contains structural changes to seats
    let hasStructuralChange = false;
    if (updates.json !== undefined) {
      try {
        const currentJson = JSON.parse(currentLayout.json);
        const newJson = JSON.parse(updates.json);
        hasStructuralChange = !areLayoutStructuresEqual(currentJson, newJson);
      } catch (error) {
        console.error(error);
        return { updated: false, reason: 'INVALID_LAYOUT' };
      }
    }
      
    if (hasStructuralChange) {
      const guard = await this.guardLayout(id);
      if (!guard.safe) {
        return {
          updated: false,
          reason: 'LAYOUT_HAS_ACTIVE_BOOKINGS',
          blockedBy: guard.bookings,
        };
      }
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

    if (fields.length === 0) return { updated: false };

    values.push(id);
    const result = await runQuery(
      this.db, `
        UPDATE layouts
        SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      values, 'update layout'
    );
    return { updated: result.changes > 0 };
  }

  async deleteLayout(id: string): Promise<{
    deleted: boolean; reason?: string; blockedBy?: ActiveBookingInfo[]
  }> {
    const guard = await this.guardLayout(id);
    if (!guard.safe) {
      return {
        deleted: false,
        reason: 'LAYOUT_HAS_ACTIVE_BOOKINGS',
        blockedBy: guard.bookings,
      };
    }

    const result = await runQuery(
      this.db, `
        UPDATE layouts
        SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        AND deleted_at IS NULL
      `,
      [id], 'soft delete layout'
    );

    if (result.changes > 0) {
      await runQuery(
        this.db, `
          UPDATE theaters
          SET current_layout_id = NULL
          WHERE current_layout_id = ?
        `,
        [id], 'unlink deleted layout from theaters'
      );
    }

    return {
      deleted: result.changes > 0,
      ...(result.changes === 0 && { reason: 'LAYOUT_NOT_FOUND' }),
    };
  }

  // ---------------------------------------------------------------------------
  // Event methods
  // ---------------------------------------------------------------------------

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
      //status: row.status as EventStatus,
      canceled: row.canceled as number,
      cancelationReason: row.cancelation_reason as string | undefined,
      maxCapacity: row.max_capacity as number,
      contentWarnings: row.content_warnings as string,
      acceptsCash: row.acceptsCash as boolean,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
      deletedAt: row.deleted_at as string,
    };
  }

  private mapRowsToEvents(rows: Record<string, unknown>[]): Event[] {
    return rows.map(row => this.mapRowToEvent(row));
  }

  /**
   * Derives the computed status from an event's dates.
   * The stored status column is always overwritten by this on read.
   */
  private getEventStatus(event: Event, now: Date = new Date()): EventStatus {
    const { openingDate, closingDate, canceled } = event;

    if (canceled) return 'canceled';

    const start = openingDate ? new Date(openingDate) : null;
    const end = closingDate ? new Date(closingDate) : null;

    if (!start && !end) return 'in progress';
    if (!start && end) return end >= now /*now <= end*/ ? 'in progress' : 'completed';
    if (start && !end) return start >= now /*now < start*/ ? 'scheduled' : 'in progress';

    // Both start and end are defined
    if (now < start!) return 'scheduled';
    if (now <= end!) return 'in progress';
    return 'completed';
  }

  /**
   * Builds additional WHERE clauses for event queries based on the provided options.
   *
   * pastToo: false (default) — excludes events whose closing_date is in the past.
   *   Events with no closing_date are NEVER considered past (they never expire).
   *
   * canceledToo: false (default) — excludes events where canceled = 1.
   */
  private buildEventFilterClauses(options: EventQueryOptions): string[] {
    const clauses: string[] = [];
    if (!options.pastToo) {
      clauses.push(`(closing_date IS NULL OR closing_date >= DATE('now'))`);
    }
    if (!options.canceledToo) {
      clauses.push(`canceled = 0`);
    }
    return clauses;
  }

  /**
   * Builds additional WHERE clauses for performance queries based on the provided options.
   *
   * pastToo: false (default) — excludes performances whose performance_date is before today.
   * canceledToo: false (default) — excludes performances with status = 'canceled'.
   */
  private buildPerformanceFilterClauses(options: PerformanceQueryOptions): string[] {
    const clauses: string[] = [];
    if (!options.pastToo) {
      clauses.push(`performance_date >= DATE('now')`);
    }
    if (!options.canceledToo) {
      //clauses.push(`status != 'canceled'`);
      clauses.push(`canceled != 1`);
    }
    return clauses;
  }

  async getAllEvents(options: EventQueryOptions = {}): Promise<Event[]> {
    const filterClauses = this.buildEventFilterClauses(options);
    const where = [`deleted_at IS NULL`, ...filterClauses].join(' AND ');
    const sql = `
      SELECT * FROM events
      WHERE ${where}
      ORDER BY canceled ASC, opening_date DESC, typical_start_time ASC, title DESC, description DESC
    `;
    const rows = await allQuery(this.db, sql, [], 'get all events');
    return rows.map(row => {
      const event = this.mapRowToEvent(row);
      event.status = this.getEventStatus(event);
      return event;
    });
  }

  async getEventById(id: string, options: EventQueryOptions = {pastToo: true, canceledToo: true}): Promise<Event | null> {
    const filterClauses = this.buildEventFilterClauses(options);
    const where = [`id = ?`, `deleted_at IS NULL`, ...filterClauses].join(' AND ');
    const row = await getQuery(this.db, `SELECT * FROM events WHERE ${where}`, [id], 'get event by id');
    if (!row) return null;
    const event = this.mapRowToEvent(row);
    event.status = this.getEventStatus(event);
    return event;
  }

  async createEvent(event: Event): Promise<string> {
    const id = this.uuid();
    const sql = `
      INSERT INTO events (
        id, title, description, genres, duration_minutes, intermission_count, rating, language,
        director, playwright, producer, choreographer, musical_director, cast_members,
        theater_id, stage_type, opening_date, closing_date, is_active, currency,
        base_ticket_price, is_sold_out, special_requirements, minimum_age, created_by_user_id,
        typical_start_time, typical_end_time, poster_image, trailer_url, website_url,
        social_media_links, status, cancelation_reason, max_capacity, content_warnings
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params: SqlParam[] = [
      id, event.title, event.description ?? null, JSON.stringify(event.genres ?? []),
      event.durationMinutes ?? null, event.intermissionCount ?? 0,
      event.rating ?? null, event.language ?? null, event.director ?? null,
      event.playwright ?? null, event.producer ?? null, event.choreographer ?? null,
      event.musicalDirector ?? null, JSON.stringify(event.cast ?? []),
      event.theaterId, event.stageType ?? null, event.openingDate ?? null, event.closingDate ?? null,
      event.isActive ? 1 : 0, event.currency, event.baseTicketPrice,
      event.isSoldOut ? 1 : 0, event.specialRequirements ?? null, event.minimumAge ?? null,
      event.createdByUserId ?? null, event.typicalStartTime ?? null, event.typicalEndTime ?? null,
      event.posterImage ?? null, event.trailerUrl ?? null, event.websiteUrl ?? null,
      event.socialMediaLinks ?? null, event.status ?? null, event.cancelationReason ?? null,
      event.maxCapacity ?? null, event.contentWarnings ?? null,
    ];
    await runQuery(this.db, sql, params, 'create event');
    return id;
  }

  async updateEvent(
    id: string,
    updates: Partial<Event>
  ): Promise<{ updated: boolean; reason?: string; blockedBy?: ActiveBookingInfo[] }> {
    // Guard: if theaterId is being changed, check for active bookings
    if (updates.theaterId !== undefined) {
      // Fetch current event to see if theaterId actually changes
      const current = await getQuery<{ theater_id: string }>(
        this.db, `
          SELECT theater_id
          FROM events
          WHERE id = ?
          AND deleted_at IS NULL
        `,
        [id],
        'updateEvent: get current theater'
      );
      if (current && current.theater_id !== updates.theaterId) {
        const guard = await this.guardEvent(id);
        if (!guard.safe) {
          return {
            updated: false,
            reason: 'EVENT_HAS_ACTIVE_BOOKINGS',
            blockedBy: guard.bookings,
          };
        }
      }
    }

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
      if (key === 'cast') {
        fields.push('cast_members = ?');
        values.push(JSON.stringify(value ?? []));
        return;
      }
      if (fieldMap[key] && value !== undefined) {
        fields.push(`${fieldMap[key]} = ?`);
        if (key === 'isActive' || key === 'isSoldOut' || key === 'canceled') {
          values.push(value ? 1 : 0);
        } else if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
          values.push(JSON.stringify(value));
        } else {
          values.push(toSqlParam(value));
        }
      }
    });

    if (fields.length === 0) return { updated: false };

    values.push(id);
    const result = await runQuery(
      this.db, `
        UPDATE events
        SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `,
      values, 'update event'
    );
    return { updated: result.changes > 0 };
  }

  async cancelEvent(id: string, reason?: string):
    Promise<{ canceled: boolean; reason?: string; blockedBy?: ActiveBookingInfo[] }>
  {
    const guard = await this.guardEvent(id);
    if (!guard.safe) return {
      canceled: false,
      reason: 'EVENT_HAS_ACTIVE_BOOKINGS',
      blockedBy: guard.bookings,
    };
    const result = await runQuery(
      this.db, `
        UPDATE events
        SET canceled = 1, cancelation_reason = ?, status = 'canceled'
        WHERE id = ?
        AND deleted_at IS NULL
        AND canceled = 0
      `,
      [reason ?? null, id], 'cancel event'
    );
    return { canceled: result.changes > 0 };
  }
  
  async deleteEvent(id: string):
    Promise<{ deleted: boolean; reason?: string; blockedBy?: ActiveBookingInfo[] }>
  {
    const guard = await this.guardEvent(id);
    if (!guard.safe) {
      return {
        deleted: false,
        reason: 'EVENT_HAS_ACTIVE_BOOKINGS',
        blockedBy: guard.bookings,
      };
    }
    
    const result = await runQuery(
      this.db, `
        UPDATE events
        SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        AND deleted_at IS NULL
      `,
      [id], 'soft delete event'
    );
    return { deleted: result.changes > 0 };
  }

  // ---------------------------------------------------------------------------
  // Performance methods
  // ---------------------------------------------------------------------------

  private mapRowToPerformance(row: Record<string, unknown>): EventPerformance {
    return {
      id: row.id as string,
      eventId: row.event_id as string,
      performanceDate: row.performance_date as string,
      startTime: row.start_time as string,
      endTime: row.end_time as string,
      //status: row.status as EventStatus,
      //canceled: row.canceled as number,
      //canceledAt: row.canceled_at as string,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }

  private mapRowsToPerformances(rows: Record<string, unknown>[]): EventPerformance[] {
    return rows.map(row => this.mapRowToPerformance(row));
  }

  async getPerformancesByEventId(eventId: string, options: PerformanceQueryOptions = {}): Promise<EventPerformance[]> {
    const filterClauses = this.buildPerformanceFilterClauses(options);
    const where = [`event_id = ?`, `deleted_at IS NULL`, ...filterClauses].join(' AND ');
    const rows = await allQuery(this.db, `
      SELECT *
      FROM performances
      WHERE ${where}
    `, [eventId], 'get performances by event id');
    return this.mapRowsToPerformances(rows);
  }

  async getPerformanceById(id: string, options: PerformanceQueryOptions = {pastToo: true}): Promise<EventPerformance | null> {
    const filterClauses = this.buildPerformanceFilterClauses(options);
    const where = [`id = ?`, `deleted_at IS NULL`, ...filterClauses].join(' AND ');
    const row = await getQuery(this.db, `
      SELECT *
      FROM performances
      WHERE ${where}
    `, [id], 'get performance by id');
    return row ? this.mapRowToPerformance(row) : null;
  }

  async createPerformance(performance: EventPerformance): Promise<string> {
    await this.checkTheaterPerformanceConflict(performance); 

    const id = this.uuid();
    await runQuery(
      this.db, `
        INSERT INTO performances
        (id, event_id, performance_date, start_time, end_time)
        VALUES (?, ?, ?, ?, ?)
      `,
      [id, performance.eventId, performance.performanceDate, performance.startTime,
       performance.endTime ?? null, /*performance.status*/],
      'create performance'
    );
    return id;
  }

  async updatePerformance(id: string, updates: Partial<EventPerformance>):
    Promise<{ updated: boolean; reason?: string; blockedBy?: ActiveBookingInfo[] }>
  {
    const isRescheduling = updates.performanceDate !== undefined || updates.startTime !== undefined;
    if (isRescheduling) {
      const guard = await this.guardPerformance(id);
      if (!guard.safe) {
        return {
          updated: false,
          reason: 'PERFORMANCE_HAS_ACTIVE_BOOKINGS',
          blockedBy: guard.bookings,
        };
      }
    }
    
    const fields: string[] = [];
    const values: (string | number)[] = [];

    const fieldMap: Record<string, string> = {
      performanceDate: 'performance_date',
      startTime: 'start_time',
      endTime: 'end_time',
    };

    Object.entries(updates).forEach(([key, value]) => {
      if (fieldMap[key] && value !== undefined) {
        fields.push(`${fieldMap[key]} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) {
      return { updated: false };
    }

    values.push(id);
    const result = await runQuery(
      this.db, `
        UPDATE performances
        SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `,
      values, 'update performance'
    );
    return { updated: result.changes > 0 };
  }

  async deletePerformanceById(performanceId: string):
    Promise<{ deleted: boolean; reason?: string; blockedBy?: ActiveBookingInfo[] }>
  {
    const guard = await this.guardPerformance(performanceId);
    if (!guard.safe) {
      return {
        deleted: false,
        reason: 'PERFORMANCE_HAS_ACTIVE_BOOKINGS',
        blockedBy: guard.bookings,
      };
    }
    
    const result = await runQuery(
      this.db, `
        UPDATE performances
        SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL
      `,
      [performanceId], 'soft delete performance'
    );
    return { deleted: result.changes > 0 };
  }

  // ---------------------------------------------------------------------------
  // Seat management methods
  // ---------------------------------------------------------------------------

  private mapRowToSeat(row: Record<string, unknown>): Seat {
    return {
      seatId: row.seat_id as string,
      sectionName: row.section_name as string,
      rowId: row.row_id as string,
      seatNumber: row.seat_number as number,
      status: row.status as SeatStatus,
      price: row.price as number,
      bookingId: row.booking_id as string | undefined,
      bookingRef: row.booking_ref as string | null,
      bookedByUserId: row.booked_by_user_id as string,
      bookedAt: row.booked_at as string,
      reservedUntil: row.reserved_until as string,
    };
  }

  private mapRowsToSeats(rows: Record<string, unknown>[]): Seat[] {
    return rows.map(row => this.mapRowToSeat(row));
  }

  async getSeatsByPerformanceId(performanceId: string): Promise<Seat[]> {
    const sql = `
      SELECT seat_id, section_name, row_id, seat_number, status, price,
             booking_id, booking_ref, booked_by_user_id, reserved_until, price
      FROM seats
      WHERE performance_id = ?
      ORDER BY section_name, row_id, seat_number
    `;
    const rows = await allQuery(this.db, sql, [performanceId], 'get seats by performance');
    return this.mapRowsToSeats(rows);
  }

  /**
   * Release expired reservations.
   * 
   * @returns a boolean value that indicates if any reservations were expired, and released
   * 
   * @deprecated, use releaseExpiredPendingBookings
   */
  async releaseExpiredReservations(): Promise<boolean> {
    const result = await runQuery(
      this.db, `
        UPDATE seats
        SET status = 'available', reserved_until = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE status = 'reserved'
        AND reserved_until < CURRENT_TIMESTAMP
      `,
      [], 'release expired seat reservations'
    );
    return result.changes > 0;
  }

  async bulkCreateSeats(
    performanceId: string,
    seats: GeneratedSeat[],
    //seatConditions: Record<string, SpecialCondition> = {}
  ): Promise<boolean> {
    // Filter out physically absent seats — they should never be bookable
    //const bookableSeats = seats.filter(s => seatConditions[s.seatId] !== 'Absent');
    const bookableSeats = seats;
    const placeholders = bookableSeats.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
    const values: (string | number)[] = [];

    bookableSeats.forEach(seat => {
      values.push(performanceId, seat.seatId, seat.sectionName, seat.rowId, seat.seatNumber, 'available');
    });

    const result = await runQuery(
      this.db, `
        INSERT OR IGNORE INTO seats
        (performance_id, seat_id, section_name, row_id, seat_number, status)
        VALUES ${placeholders}
      `,
      values, 'bulk create seats'
    );
    return result.changes > 0;
  }

  /**
   * Get seats grouped by section → row for UI rendering.
   */
  async getSeatsByPerformanceIdGroupedBySection(performanceId: string): Promise<{
    [sectionName: string]: { [rowId: string]: Seat[] }
  }> {
    const sql = `
      SELECT seat_id, section_name, row_id, seat_number, status, price
             booking_id, booking_ref, booked_by_user_id, reserved_until
      FROM seats
      WHERE performance_id = ?
      ORDER BY section_name, row_id, seat_number
    `;
    const rows = await allQuery<Record<string, unknown>>(this.db, sql, [performanceId], 'get seats grouped');
    const seats = this.mapRowsToSeats(rows);

    const grouped: { [section: string]: { [row: string]: Seat[] } } = {};
    seats.forEach(seat => {
      if (!grouped[seat.sectionName]) grouped[seat.sectionName] = {};
      if (!grouped[seat.sectionName][seat.rowId]) grouped[seat.sectionName][seat.rowId] = [];
      grouped[seat.sectionName][seat.rowId].push(seat);
    });
    return grouped;
  }

  async getSeatsBySection(performanceId: string, sectionName: string): Promise<Seat[]> {
    const sql = `
      SELECT seat_id, section_name, row_id, seat_number, status, price,
             booking_id, booking_ref, booked_by_user_id, reserved_until, price
      FROM seats
      WHERE performance_id = ? AND section_name = ?
      ORDER BY section_name, row_id, seat_number
    `;
    const rows = await allQuery(this.db, sql, [performanceId, sectionName], 'get seats by section');
    return this.mapRowsToSeats(rows);
  }

  /**
   * Get seat counts for a performance (calculated from the seats table).
   */
  async getSeatCountsByPerformanceId(performanceId: string): Promise<{
    available: number; booked: number; reserved: number
  }> {
    const row = await getQuery<{ available: number; booked: number; reserved: number }>(
      this.db,
      `SELECT
         COUNT(CASE WHEN status = 'available' THEN 1 END) AS available,
         COUNT(CASE WHEN status = 'booked'    THEN 1 END) AS booked,
         COUNT(CASE WHEN status = 'reserved'  THEN 1 END) AS reserved
       FROM seats WHERE performance_id = ?`,
      [performanceId], 'get seat counts'
    );
    return { available: row?.available || 0, booked: row?.booked || 0, reserved: row?.reserved || 0 };
  }

  async performanceHasBookings(performanceId: string): Promise<boolean> {
    const row = await getQuery<{ count: number }>(
      this.db, `
        SELECT COUNT(*) AS count
        FROM seats
        WHERE performance_id = ?
        AND status = 'booked'
      `,
      [performanceId], 'check performance bookings'
    );
    return (row?.count || 0) > 0;
  }

  async deleteSeatsForPerformance(performanceId: string): Promise<boolean> {
    const result = await runQuery(
      this.db, `
        DELETE FROM seats
        WHERE performance_id = ?
      `, [performanceId], 'delete seats for performance'
    );
    return result.changes > 0;
  }

  // ---------------------------------------------------------------------------
  // Booking methods
  // ---------------------------------------------------------------------------

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
      paymentIntentId: row.payment_intent_id as string,
      bookedAt: row.booked_at as string,
      scannedAt: row.scanned_at as Date | null,
      scannedBy: row.scanned_by as string | null,
      updatedAt: row.updated_at as string | undefined,
      canceledAt: row.canceled_at as string | undefined,
    };
  }

  private mapRowsToBookings(rows: Record<string, unknown>[]): Booking[] {
    return rows.map(row => this.mapRowToBooking(row));
  }

  /**
   * Atomic booking transaction.
   *
   * - Verifies all requested seats are 'available'.
   * - Creates one booking record per seat (each with a unique booking_ref).
   * - Stamps each seat with booking_id, booking_ref, booked_by_user_id, status = 'booked'.
   *
   * Returns booked seats with their refs on success, or the unavailable seat IDs on failure.
   * 
   * @deprecated Use bookSeatsWithPaymentMethod() instead.
   */
  async bookSeats(
    performanceId: string,
    seatIds: string[],
    userId: string,
    totalPrice: number = 0,
  ): Promise<{
    success: boolean;
    bookedCount: number;
    seats: Array<{ seatId: string; bookingRef: string }>;
    unavailableSeats?: string[];
  }> {
    await runQuery(this.db, 'BEGIN TRANSACTION', [], 'bookSeats begin');
    try {
      // Check all seats are available
      const placeholders = seatIds.map(() => '?').join(', ');
      const rows = await allQuery<{ seat_id: string; status: string }>(
        this.db, `
          SELECT seat_id, status
          FROM seats
          WHERE performance_id = ?
          AND seat_id IN (${placeholders})
        `,
        [performanceId, ...seatIds], 'bookSeats check availability'
      );

      const seatStatuses = new Map(rows.map(r => [r.seat_id, r.status]));
      const unavailable = seatIds.filter(id => seatStatuses.get(id) !== 'available');
      if (unavailable.length > 0) {
        await runQuery(this.db, 'ROLLBACK', [], 'bookSeats rollback unavailable');
        return { success: false, bookedCount: 0, seats: [], unavailableSeats: unavailable };
      }

      const perSeat: Array<{ seatId: string; bookingRef: string; bookingId: string }> = [];

      for (const seatId of seatIds) {
        const pricePerSeat = totalPrice / seatIds.length;
        const maxRetries = 3;
        let booked = false;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
          const bookingId = this.uuid(); // regenerate on every attempt
          const bookingRef = generateBookingRef();
          try {
            await runQuery(
              this.db,
              `INSERT INTO bookings
              (id, booking_ref, user_id, performance_id, status, total_price, seat_count, seat_ids)
              VALUES (?, ?, ?, ?, 'confirmed', ?, 1, ?)`,
              [bookingId, bookingRef, userId, performanceId, pricePerSeat, JSON.stringify([seatId])],
              'bookSeats insert booking'
            );
            perSeat.push({ seatId, bookingRef, bookingId });
            booked = true;
            break; // success — exit retry loop
          } catch (err) {
            const isUniqueViolation = err instanceof Error &&
              err.message.includes('UNIQUE constraint failed: bookings.booking_ref');
            if (isUniqueViolation && attempt < maxRetries - 1) continue;
            throw err;
          }
        }

        if (!booked) {
          throw new Error(`Failed to generate unique booking_ref after ${maxRetries} retries`);
        }
      }

      for (const { seatId, bookingRef, bookingId } of perSeat) {
        await runQuery(
          this.db, `
            UPDATE seats
            SET status = 'booked', booking_id = ?, booking_ref = ?,
                booked_by_user_id = ?, booked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE performance_id = ?
            AND seat_id = ?
          `,
          [bookingId, bookingRef, userId, performanceId, seatId],
          'bookSeats update seat'
        );
      }

      await runQuery(this.db, 'COMMIT', [], 'bookSeats commit');
      return {
        success: true,
        bookedCount: perSeat.length,
        seats: perSeat.map(({ seatId, bookingRef }) => ({ seatId, bookingRef })),
        unavailableSeats: [],
      };
    } catch (err) {
      await runQuery(this.db, 'ROLLBACK', [], 'bookSeats rollback on error');
      throw err;
    }
  }

  /**
   * Atomic booking transaction, with payment method.
   *
   * - Verifies all requested seats are 'available'.
   * - Creates one booking record per seat (each with a unique booking_ref).
   * - Stamps each seat with booking_id, booking_ref, booked_by_user_id, status = 'booked'.
   *
   * Returns booked seats with their refs on success, or the unavailable seat IDs on failure.
   */
  async bookSeatsWithPaymentMethod(
    performanceId: string,
    seatIds: string[],
    userId: string,
    totalPrice: number = 0,
    paymentMethod: PaymentGateway,
  ): Promise<{
    success: boolean;
    bookingIds: Array<string>;
    bookedCount: number;
    seats: Array<{ seatId: string; bookingRef: string }>;
    unavailableSeats?: string[];
  }> {
    await runQuery(this.db, 'BEGIN TRANSACTION', [], 'bookSeatsWithPaymentMethod begin');
    try {
      // Check all seats are available
      const placeholders = seatIds.map(() => '?').join(', ');
      const rows = await allQuery<{ seat_id: string; status: string }>(
        this.db, `
          SELECT seat_id, status
          FROM seats
          WHERE performance_id = ?
          AND seat_id IN (${placeholders})
        `,
        [performanceId, ...seatIds], 'bookSeatsWithPaymentMethod check availability'
      );

      const seatStatuses = new Map(rows.map(r => [r.seat_id, r.status]));
      const unavailable = seatIds.filter(id => seatStatuses.get(id) !== 'available');
      
      if (unavailable.length > 0) {
        await runQuery(this.db, 'ROLLBACK', [], 'bookSeatsWithPaymentMethod rollback unavailable');
        return { success: false, bookingIds: [], bookedCount: 0, seats: [], unavailableSeats: unavailable };
      }

      // Determine initial status based on payment method
      const initialStatus: BookingStatus = paymentMethod === 'cash' ? 'confirmed' : 'pending_payment';
      
      const perSeat: Array<{ seatId: string; bookingRef: string; bookingId: string }> = [];

      for (const seatId of seatIds) {
        const pricePerSeat = totalPrice / seatIds.length;
        const maxRetries = 3;
        let booked = false;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
          const bookingId = this.uuid();
          const bookingRef = generateBookingRef();
          try {
            await runQuery(
              this.db,
              `INSERT INTO bookings
              (id, booking_ref, user_id, performance_id, status, total_price, seat_count, seat_ids, payment_method, payment_status)
              VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
              [
                bookingId, bookingRef, userId, performanceId, 
                initialStatus, 
                pricePerSeat, 
                JSON.stringify([seatId]),
                paymentMethod,
                paymentMethod === 'cash' ? 'paid' : 'pending'
              ],
              'bookSeatsWithPaymentMethod insert booking'
            );
            perSeat.push({ seatId, bookingRef, bookingId });
            booked = true;
            break;
          } catch (err) {
            const isUniqueViolation = err instanceof Error &&
              err.message.includes('UNIQUE constraint failed: bookings.booking_ref');
            if (isUniqueViolation && attempt < maxRetries - 1) continue;
            throw err;
          }
        }

        if (!booked) {
          throw new Error(`Failed to generate unique booking_ref after ${maxRetries} retries`);
        }
      }

      // Update seat status
      for (const { seatId, bookingRef, bookingId } of perSeat) {
        const seatStatus = paymentMethod === 'cash' ? 'booked' : 'reserved';
        const reservedUntil = paymentMethod === 'stripe' 
          ? new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes reservation
          : null;
        
        await runQuery(
          this.db, `
            UPDATE seats
            SET status = ?, booking_id = ?, booking_ref = ?,
                booked_by_user_id = ?, booked_at = CURRENT_TIMESTAMP, 
                reserved_until = ?, updated_at = CURRENT_TIMESTAMP
            WHERE performance_id = ?
            AND seat_id = ?
          `,
          [seatStatus, bookingId, bookingRef, userId, reservedUntil, performanceId, seatId],
          'bookSeatsWithPaymentMethod update seat'
        );
      }

      await runQuery(this.db, 'COMMIT', [], 'bookSeatsWithPaymentMethod commit');
      return {
        success: true,
        bookingIds: perSeat.map(s => s.bookingId),
        bookedCount: perSeat.length,
        seats: perSeat.map(({ seatId, bookingRef }) => ({ seatId, bookingRef })),
        unavailableSeats: [],
      };
    } catch (err) {
      await runQuery(this.db, 'ROLLBACK', [], 'bookSeatsWithPaymentMethod rollback on error');
      throw err;
    }
  }

  // Add this method to confirm booking after Stripe payment
  async confirmBookingAfterPayment(bookingId: string): Promise<boolean> {
    await runQuery(this.db, 'BEGIN TRANSACTION', [], 'confirmBookingAfterPayment begin');
    try {
      // Get the booking
      const booking = await getQuery<{ status: string; performance_id: string }>(
        this.db,
        `SELECT status, performance_id FROM bookings WHERE id = ?`,
        [bookingId],
        'confirmBookingAfterPayment get booking'
      );

      if (!booking) {
        await runQuery(this.db, 'ROLLBACK', [], 'confirmBookingAfterPayment booking not found');
        return false;
      }

      if (booking.status !== 'pending_payment') {
        await runQuery(this.db, 'ROLLBACK', [], 'confirmBookingAfterPayment wrong status');
        return false;
      }

      // Update booking status
      await runQuery(
        this.db,
        `UPDATE bookings 
         SET status = 'confirmed', payment_status = 'paid', updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [bookingId],
        'confirmBookingAfterPayment update status'
      );

      // Update seat status from 'reserved' to 'booked'
      await runQuery(
        this.db,
        `UPDATE seats 
         SET status = 'booked', reserved_until = NULL, updated_at = CURRENT_TIMESTAMP 
         WHERE booking_id = ? AND status = 'reserved'`,
        [bookingId],
        'confirmBookingAfterPayment update seats'
      );

      await runQuery(this.db, 'COMMIT', [], 'confirmBookingAfterPayment commit');
      return true;
    } catch (err) {
      await runQuery(this.db, 'ROLLBACK', [], 'confirmBookingAfterPayment rollback');
      throw err;
    }
  }

  // Add this method to release expired pending bookings (run via cron job)
  async releaseExpiredPendingBookings(): Promise<number> {
    await runQuery(this.db, 'BEGIN TRANSACTION', [], 'releaseExpiredPendingBookings begin');
    try {
      // Release seats that have been reserved for more than 30 minutes
      const updateSeatsResult = await runQuery(
        this.db, `
          UPDATE seats
          SET status = 'available', booking_id = NULL, booking_ref = NULL,
              booked_by_user_id = NULL, booked_at = NULL, reserved_until = NULL,
              updated_at = CURRENT_TIMESTAMP
          WHERE status = 'reserved'
          AND reserved_until < CURRENT_TIMESTAMP
        `,
        [], 'releaseExpiredPendingBookings update seats'
      );

      // Cancel the associated pending bookings
      const updateBookingsResult = await runQuery(
        this.db, `
          UPDATE bookings
          SET status = 'canceled', canceled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
          WHERE status = 'pending_payment'
          AND id IN (
            SELECT booking_id FROM seats 
            WHERE status = 'available' 
            AND reserved_until IS NULL
            AND booking_id IS NOT NULL
          )
        `,
        [], 'releaseExpiredPendingBookings cancel bookings'
      );

      await runQuery(this.db, 'COMMIT', [], 'releaseExpiredPendingBookings commit');

      if (updateBookingsResult.changes > 0) {
        await notify(`🥀 ${updateBookingsResult.changes} pending payment booking reservations are expired, and then canceled`);
      }
      
      return updateSeatsResult.changes;
    } catch (err) {
      await runQuery(this.db, 'ROLLBACK', [], 'releaseExpiredPendingBookings rollback');
      throw err;
    }
  }

  // Get booking by payment intent ID
  async getBookingByPaymentIntentId(paymentIntentId: string): Promise<Booking | null> {
    // First, find the booking through the payments table
    // Or store payment_intent_id in the bookings table
    const row = await getQuery(
      this.db, `
        SELECT b.*
        FROM bookings b
        WHERE b.payment_intent_id = ?
        LIMIT 1
      `,
      [paymentIntentId], 'get booking by payment intent id'
    );
    return row ? this.mapRowToBooking(row) : null;
  }

  async getBookingById(bookingId: string): Promise<Booking | null> {
    const row = await getQuery(this.db, `
      SELECT *
      FROM bookings
      WHERE id = ?
    `, [bookingId], 'get booking by id');
    return row ? this.mapRowToBooking(row) : null;
  }

  async getBookingByRef(ref: string): Promise<Booking | null> {
    const row = await getQuery(this.db, `SELECT * FROM bookings WHERE booking_ref = ?`, [ref], 'get booking by ref');
    return row ? this.mapRowToBooking(row) : null;
  }

  async getBookingsByUserId(userId: string): Promise<Booking[]> {
    const rows = await allQuery(
      this.db, `
        SELECT *
        FROM bookings
        WHERE user_id = ?
        ORDER BY booked_at DESC
      `,
      [userId], 'get bookings by user'
    );
    return this.mapRowsToBookings(rows);
  }

  async getBookingsByPerformanceId(
    performanceId: string,
    options: BookingQueryOptions = { status: 'confirmed' }
  ): Promise<Booking[]> {
    let sql = `
      SELECT *
      FROM bookings
      WHERE performance_id = ?
    `;
    const params: SqlParam[] = [performanceId];
    if (options.status && options.status !== 'all') {
      sql += ` AND status = ?`;
      params.push(options.status);
    }
    sql += ` ORDER BY booked_at DESC`;
    const rows = await allQuery(this.db, sql, params, 'get bookings by performance');
    return this.mapRowsToBookings(rows);
  }

  // ---------------------------------------------------------------------------
  // Shared enriched-booking mapper
  // ---------------------------------------------------------------------------
  
  /**
   * Maps a flat JOIN row into BookingEnriched.
   * Used by getAllBookingsEnriched, getBookingsByUserIdEnriched, getBookingDetailById.
   */
  private mapRowToBookingEnriched(row: Record<string, unknown>): BookingEnriched {
    let seatIds: string[] = [];
    if (row.seat_ids && typeof row.seat_ids === 'string') {
      try { seatIds = JSON.parse(row.seat_ids as string); } catch { seatIds = []; }
    }
    return {
      id: row.id as string,
      bookingRef: row.booking_ref as string,
      userId: row.user_id as string,
      userFirstName: row.user_first_name as string,
      userLastName: row.user_last_name as string,
      userEmail: row.user_email as string,
      userPhone: (row.user_phone as string) ?? '',
      performanceId: row.performance_id as string,
      performanceDate: row.performance_date as string,
      startTime: row.start_time as string,
      endTime: (row.end_time as string) ?? null,
      eventId: row.event_id as string,
      eventTitle: row.event_title as string,
      currency: (row.currency as string) ?? '',
      theaterId: row.theater_id as string,
      theaterName: row.theater_name as string,
      status: row.status as BookingStatus,
      totalPrice: row.total_price as number,
      seatCount: row.seat_count as number,
      seatIds,
      bookedAt: row.booked_at as string,
      scannedAt: (row.scanned_at as string) ?? null,
      scannedBy: (row.scanned_by as string) ?? null,
      canceledAt: (row.canceled_at as string) ?? null,
      updatedAt: (row.updated_at as string) ?? null,
    };
  }
 
  // ---------------------------------------------------------------------------
  // Base SQL for enriched booking queries (all columns, all JOINs).
  // Callers append WHERE / ORDER BY as needed.
  // ---------------------------------------------------------------------------
  private enrichedBookingSelectSQL = `
    SELECT
      b.id,
      b.booking_ref,
      b.user_id,
      u.first_name AS user_first_name,
      u.last_name AS user_last_name,
      u.email AS user_email,
      u.phone AS user_phone,
      b.performance_id,
      p.performance_date,
      p.start_time,
      p.end_time,
      e.id AS event_id,
      e.title AS event_title,
      e.currency,
      t.id AS theater_id,
      t.name AS theater_name,
      b.status,
      b.total_price,
      b.seat_count,
      b.seat_ids,
      b.booked_at,
      b.scanned_at,
      b.scanned_by,
      b.canceled_at,
      b.updated_at
    FROM bookings b
    JOIN users u ON u.id  = b.user_id
    JOIN performances p ON p.id  = b.performance_id
    JOIN events e ON e.id  = p.event_id
    JOIN theaters t ON t.id  = e.theater_id
    WHERE p.deleted_at IS NULL
      AND e.deleted_at IS NULL
  `;
 
  // ---------------------------------------------------------------------------
  // getAllBookingsEnriched
  // ---------------------------------------------------------------------------
  async getAllBookingsEnriched(options: GetAllBookingsOptions = {}): Promise<BookingEnriched[]> {
    const clauses: string[] = [];
    const params: SqlParam[] = [];
  
    if (options.status && options.status !== 'all') {
      clauses.push(`b.status = ?`);
      params.push(options.status);
    }
    if (options.performanceDate) {
      clauses.push(`p.performance_date = ?`);
      params.push(options.performanceDate);
    }
    if (options.eventId) {
      clauses.push(`e.id = ?`);
      params.push(options.eventId);
    }
  
    const extraWhere = clauses.length ? `AND ${clauses.join(' AND ')}` : '';
    const sql = `${this.enrichedBookingSelectSQL} ${extraWhere} ORDER BY b.booked_at DESC`;
  
    const rows = await allQuery<Record<string, unknown>>(this.db, sql, params, 'get all bookings enriched');
    return rows.map(r => this.mapRowToBookingEnriched(r));
  }
  
  // ---------------------------------------------------------------------------
  // getBookingsByUserIdEnriched
  // ---------------------------------------------------------------------------
  
  async getBookingsByUserIdEnriched(userId: string): Promise<BookingEnriched[]> {
    const sql = `${this.enrichedBookingSelectSQL} AND b.user_id = ? ORDER BY b.booked_at DESC`;
    const rows = await allQuery<Record<string, unknown>>(
      this.db, sql, [userId], 'get bookings by user enriched'
    );
    return rows.map(r => this.mapRowToBookingEnriched(r));
  }
  
  // ---------------------------------------------------------------------------
  // getBookingDetailById
  // ---------------------------------------------------------------------------
  
  /**
   * Returns a single enriched booking plus the physical seat data for that ticket.
   * Because one booking = one seat (see bookSeats()), seatDetail will always be
   * a single object (or null if the seat row has been deleted).
   */
  async getBookingDetailById(bookingId: string): Promise<BookingDetail | null> {
    const sql = `${this.enrichedBookingSelectSQL} AND b.id = ? LIMIT 1`;
    const row = await getQuery<Record<string, unknown>>(
      this.db, sql, [bookingId], 'get booking detail by id'
    );
    if (!row) return null;
  
    const enriched = this.mapRowToBookingEnriched(row);
  
    // Fetch the physical seat row linked to this booking
    const seatRow = await getQuery<Record<string, unknown>>(
      this.db, `
        SELECT seat_id, section_name, row_id, seat_number, price, booking_ref
        FROM seats
        WHERE booking_id = ?
        LIMIT 1
      `,
      [bookingId],
      'get booking detail seat'
    );
  
    const seat: SeatDetail | null = seatRow
      ? {
          seatId: seatRow.seat_id as string,
          bookingRef: seatRow.booking_ref as string,
          sectionName: seatRow.section_name as string,
          rowId: seatRow.row_id as string,
          seatNumber: seatRow.seat_number as number,
          price: seatRow.price as number,
        }
      : null;
  
    return { ...enriched, seat };
  }

  /**
   * Atomically marks booking as used (physical entry)
   * Used when: QR code is scanned at theater entrance
   * Returns true if it was just now marked; false if already scanned, canceled, or not found.
   */
  async markBookingUsed(ref: string, byDevice?: string): Promise<boolean> {
    try {
      const result = await runQuery(
        this.db, `
          UPDATE bookings
          SET scanned_at = CURRENT_TIMESTAMP, scanned_by = ?
          WHERE booking_ref = ?
          AND scanned_at IS NULL
          AND status = 'confirmed'
        `,
        [byDevice ?? null, ref],
        'mark booking used'
      );
      return result.changes > 0;
    } catch (error) {
      console.error('Error marking booking used:', error);
      return false;
    }
  }

  /**
   * Update booking status with payment reference
   * Convenience method - combines status + payment intent
   */
  async confirmBookingWithPayment(
    bookingId: string, 
    paymentIntentId: string
  ): Promise<boolean> {
    try {
      const result = await runQuery(
        this.db,
        `UPDATE bookings 
        SET status = 'confirmed', 
            payment_intent_id = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
        [paymentIntentId, bookingId],
        'confirm booking with payment'
      );
      return result.changes > 0;
    } catch (error) {
      console.error('Error confirming booking with payment:', error);
      return false;
    }
  }

  /**
   * Cancel a booking and release its seats back to 'available'.
   * Only the owning user (or an admin, enforced at the route level) should call this.
   */
  async cancelBooking(bookingId: string): Promise<{ success: boolean; reason?: string }> {
    await runQuery(this.db, 'BEGIN TRANSACTION', [], 'cancelBooking begin');
    try {
      const booking = await getQuery<{ id: string; status: string }>(
        this.db, `
          SELECT id, status
          FROM bookings
          WHERE id = ?
        `,
        [bookingId], 'cancelBooking fetch'
      );

      if (!booking) {
        await runQuery(this.db, 'ROLLBACK', [], 'cancelBooking rollback not found');
        return { success: false, reason: 'BOOKING_NOT_FOUND' };
      }
      if (booking.status !== 'confirmed') {
        await runQuery(this.db, 'ROLLBACK', [], 'cancelBooking rollback already canceled');
        return { success: false, reason: 'BOOKING_ALREADY_CANCELED_OR_REFUNDED' };
      }

      await runQuery(
        this.db, `
          UPDATE bookings
          SET status = 'canceled', canceled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        [bookingId], 'cancelBooking update status'
      );
      await runQuery(
        this.db, `
          UPDATE seats
          SET status = 'available', booking_id = NULL, booking_ref = NULL,
              booked_by_user_id = NULL, booked_at = NULL, reserved_until = NULL,
              updated_at = CURRENT_TIMESTAMP
          WHERE booking_id = ?
        `,
        [bookingId], 'cancelBooking release seats'
      );

      await runQuery(this.db, 'COMMIT', [], 'cancelBooking commit');
      return { success: true };
    } catch (err) {
      await runQuery(this.db, 'ROLLBACK', [], 'cancelBooking rollback on error');
      throw err;
    }
  }

  /**
   * Update booking status (administrative)
   * Used for: payment confirmation, cancellation, refund
   */
  async updateBookingStatus(bookingId: string, status: BookingStatus): Promise<boolean> {
    try {
      const result = await runQuery(
        this.db,
        `UPDATE bookings 
        SET status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
        [status, bookingId],
        'update booking status'
      );
      return result.changes > 0;
    } catch (error) {
      console.error('Error updating booking status:', error);
      return false;
    }
  }

  /**
   * Store payment intent ID for tracking
   * Used when: payment_intent.succeeded webhook received
   */
  async updateBookingPaymentIntent(bookingId: string, paymentIntentId: string): Promise<boolean> {
    try {
      const result = await runQuery(
        this.db,
        `UPDATE bookings 
        SET payment_intent_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
        [paymentIntentId, bookingId],
        'update payment intent'
      );
      return result.changes > 0;
    } catch (error) {
      console.error('Error updating payment intent:', error);
      return false;
    }
  }

  /**
   * Store checkout session ID for tracking
   * Used when: checkout.session.completed webhook received
   */
  async updateBookingCheckoutSession(bookingId: string, sessionId: string): Promise<boolean> {
    try {
      const result = await runQuery(
        this.db,
        `UPDATE bookings 
        SET checkout_session_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
        [sessionId, bookingId],
        'update checkout session'
      );
      return result.changes > 0;
    } catch (error) {
      console.error('Error updating checkout session:', error);
      return false;
    }
  }

  /**
   * Cancel a booking and release its seats back to 'available'.
   * Only the owning user (or an admin, enforced at the route level) should call this.
   */
  async cancelBookingsByRefs(bookingRefs: string[]): Promise<void> {
    const placeholders = bookingRefs.map(() => '?').join(', ');
    await this.db.run(`
      UPDATE seats
      SET status = 'available', booking_ref = NULL, booked_by_user_id = NULL, booked_at = NULL
      WHERE booking_ref IN (${placeholders})
        AND status = 'pending_payment'
      `, ...bookingRefs
    );
  }

  // ---------------------------------------------------------------------------
  // Setup methods
  // ---------------------------------------------------------------------------

  async loadSetup(): Promise<GeneralSetupType | null> {
    const row = await getQuery<{ data: string }>(
      this.db, `SELECT data FROM setup WHERE id = 1`, [], 'load setup'
    );
    if (!row) return null;
    try { return JSON.parse(row.data) as GeneralSetupType; }
    catch { return null; }
  }

  async saveSetup(data: unknown): Promise<void> {
    await runQuery(
      this.db, `
        INSERT INTO setup
        (id, data)
        VALUES (1, ?)
        ON CONFLICT(id) DO UPDATE SET
        data = excluded.data, updated_at = CURRENT_TIMESTAMP
      `,
      [JSON.stringify(data)], 'save setup'
    );
  }

  // ---------------------------------------------------------------------------
  // Guards
  // ---------------------------------------------------------------------------
  /**
   * Checks whether the theater linked to performance.eventId has any existing
   * performance that overlaps the requested date/time window.
   *
   * Two intervals [s1, e1] and [s2, e2] overlap when: s1 < e2 AND s2 < e1.
   * Null end_time is treated as open-ended ("runs until closing").
   */
  private async checkTheaterPerformanceConflict(
    performance: EventPerformance
  ): Promise<void> {
    // Resolve the theater that hosts this event.
    const event = await getQuery<{ theater_id: string }>(
      this.db,
      `SELECT theater_id FROM events WHERE id = ? AND deleted_at IS NULL`,
      [performance.eventId],
      'checkTheaterPerformanceConflict: get event'
    );
    if (!event) throw new Error(`Event not found: ${performance.eventId}`);

    // Find any performance at the same theater on the same date whose time
    //    window overlaps the requested one.
    //
    //    Overlap condition (both legs must be true):
    //      a) existing starts before new one ends → p.start_time < :newEnd
    //      b) new one starts before existing ends → :newStart < p.end_time
    //
    //    Null handling:
    //      - newEnd IS NULL → treat as '23:59' (fills the rest of the day)
    //      - p.end_time IS NULL → existing is open-ended, so (b) is always true
    const newEnd = performance.endTime ?? '23:59';

    const conflicting = await getQuery<{
      id: string;
      start_time: string;
      end_time: string | null;
      theater_name: string | null
    }>(
      this.db, `
        SELECT p.id, p.event_id, p.start_time, p.end_time, t.name as theater_name
        FROM performances p
        JOIN events e ON e.id = p.event_id
        JOIN theaters t on t.id = e.theater_id
        WHERE e.theater_id = ?
        AND p.performance_date = ?
        AND p.deleted_at IS NULL
        AND e.deleted_at IS NULL
        AND p.start_time < ?
        AND (p.end_time IS NULL OR ? < p.end_time)
        LIMIT 1
      `,
      [event.theater_id, performance.performanceDate, newEnd, performance.startTime],
      'checkTheaterPerformanceConflict: find conflict'
    );

    if (conflicting) {
      const error = new Error('THEATER_SCHEDULING_CONFLICT') as Error & { details?: TheaterConflictDetails };
      error.details = {
        performanceDate: performance.performanceDate,
        requestedStartTime: performance.startTime,
        requestedEndTime: newEnd,
        existingPerformanceStartTime: conflicting.start_time,
        existingPerformanceEndTime: conflicting.end_time,
        theaterId: event.theater_id,
        theaterName: conflicting.theater_name
      }
      throw error;
    }
  }

  // ---------------------------------------------------------------------------
  // Push subscription methods
  // ---------------------------------------------------------------------------

  async upsertPushSubscription(
    userId: string,
    endpoint: string,
    p256dh: string,
    auth: string
  ): Promise<void> {
    await runQuery(
      this.db,
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(endpoint) DO UPDATE SET
        p256dh = excluded.p256dh,
        auth = excluded.auth,
        last_used_at = datetime('now')`,
      [userId, endpoint, p256dh, auth],
      'upsert push subscription'
    );
  }

  async deletePushSubscription(endpoint: string): Promise<void> {
    await runQuery(
      this.db,
      `DELETE FROM push_subscriptions WHERE endpoint = ?`,
      [endpoint],
      'delete push subscription'
    );
  }

  async getPushSubscriptionsByUserId(userId: string): Promise<Array<{ endpoint: string; p256dh: string; auth: string }>> {
    return allQuery(
      this.db,
      `SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?`,
      [userId],
      'get push subscriptions by user'
    ) as Promise<Array<{ endpoint: string; p256dh: string; auth: string }>>;
  }

  async touchPushSubscription(endpoint: string): Promise<void> {
    await runQuery(
      this.db,
      `UPDATE push_subscriptions SET last_used_at = datetime('now') WHERE endpoint = ?`,
      [endpoint],
      'touch push subscription'
    );
  }

  // ---------------------------------------------------------------------------
  // Reminder job query
  // ---------------------------------------------------------------------------

  async getBookingsForReminder(fromIso: string, toIso: string): Promise<Array<{
    booking_id: string;
    user_id: string;
    booking_ref: string;
    performance_id: string;
    seat_ids: string;
    event_title: string;
    performance_date: string;
    event_id: string;
    start_time: string;
  }>> {
    // performances.performance_date + start_time are stored as separate TEXT columns
    // We reconstruct an ISO datetime for range comparison
    return allQuery(
      this.db, `
      SELECT
        b.id AS booking_id,
        b.user_id,
        b.booking_ref,
        b.performance_id,
        b.seat_ids,
        e.title AS event_title,
        p.performance_date,
        p.event_id,
        p.start_time
      FROM bookings b
      JOIN performances p ON p.id = b.performance_id
      JOIN events e ON e.id = p.event_id
      WHERE b.status = 'confirmed'
        AND b.reminder_24h_sent = 0
        AND p.deleted_at IS NULL
        AND p.canceled_at IS NULL
        AND e.deleted_at IS NULL
        AND e.canceled = 0
        AND (p.performance_date || 'T' || p.start_time) BETWEEN ? AND ?
      `,
      [fromIso, toIso],
      'get bookings for reminder'
    ) as Promise<Array<{
      booking_id: string;
      user_id: string;
      booking_ref: string;
      performance_id: string;
      seat_ids: string;
      event_title: string;
      performance_date: string;
      event_id: string;
      start_time: string;
    }>>;
  }

  async markReminderSent(bookingId: string): Promise<void> {
    await runQuery(
      this.db,
      `UPDATE bookings SET reminder_24h_sent = 1 WHERE id = ?`,
      [bookingId],
      'mark reminder sent'
    );
  }

} // end of Database class


// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

/**
 * Execute a SQL script without parameters.
 * Use for: CREATE TABLE, ALTER TABLE, multiple statements, schema initialization.
 */
const execQuery = (db: sqlite3.Database, sql: string, context = ''): Promise<void> =>
  new Promise((resolve, reject) => {
    db.exec(sql, err => {
      if (err) reject(new Error(`${context}: ${err.message}`));
      else resolve();
    });
  });

/**
 * Run a parameterized query (INSERT, UPDATE, DELETE).
 * Returns RunResult with lastID and changes.
 * 
 * Note: These functions are tested for SQLite DB. They should normalize responses for other DBs.
 *       For example: 'changes' field is expected in UPDATEs, but not all DBs return it...
 */
type SqlParam = string | number | Buffer | null;

const runQuery = (
  db: sqlite3.Database, sql: string, params: SqlParam[] = [], context = ''
): Promise<sqlite3.RunResult> =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(new Error(`${context}: ${err.message}`));
      else resolve(this);
    });
  });

const getQuery = <T extends Record<string, unknown> = Record<string, unknown>>(
  db: sqlite3.Database, sql: string, params: SqlParam[] = [], context = ''
): Promise<T | undefined> =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(new Error(`${context}: ${err.message}`));
      else resolve(row as T);
    });
  });

const allQuery = <T extends Record<string, unknown> = Record<string, unknown>>(
  db: sqlite3.Database, sql: string, params: SqlParam[] = [], context = ''
): Promise<T[]> =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(new Error(`${context}: ${err.message}`));
      else resolve(rows as T[]);
    });
  });

function toSqlParam(value: unknown): string | number | null {
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (value === null || typeof value === 'number' || typeof value === 'string') return value as string | number;
  return JSON.stringify(value);
}

function generateBookingRef(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O, 1/I
  const id = Array.from({ length: 7 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `TK-${id}`;
}

/**
 * Compares only the seat structure (sections, rows, rowId, seatCount, curve, stretch).
 * Other properties (stage, origin, spacing, labels, etc.) can change freely.
 */
function areLayoutStructuresEqual(oldJson: LayoutJSON, newJson: LayoutJSON): boolean {
  const oldSections = oldJson?.sections;
  const newSections = newJson?.sections;

  if (!oldSections || !newSections) return oldSections === newSections;
  if (oldSections.length !== newSections.length) return false;

  for (let i = 0; i < oldSections.length; i++) {
    const oldSec = oldSections[i];
    const newSec = newSections[i];

    // Section identity matters (bookings reference section id)
    if (oldSec.id !== newSec.id) return false;

    const oldRows = oldSec.rows;
    const newRows = newSec.rows;
    if (!oldRows || !newRows) return oldRows === newRows;
    if (oldRows.length !== newRows.length) return false;

    for (let j = 0; j < oldRows.length; j++) {
      const oldRow = oldRows[j];
      const newRow = newRows[j];
      if (oldRow.rowId !== newRow.rowId) return false;
      if (oldRow.seatCount !== newRow.seatCount) return false;
      if (oldRow.curve !== newRow.curve) return false;
      if (oldRow.stretch !== newRow.stretch) return false;
    }
  }

  return true;
}

const getActiveDb = (): Database => {
  const ctx = tenantContext.getStore();
  if (!ctx) {
    throw new Error(
      'Database accessed outside of a tenant context. Wrap this code path with runWithTenant() ' +
      '(this happens automatically for HTTP requests via middleware; cron/background jobs must do it explicitly).'
    );
  }
  return ctx.db;
}

const database = new Proxy({} as Database, {
  get(_target, prop: string | symbol) {
    const db = getActiveDb();
    const value = (db as unknown as Record<string | symbol, unknown>)[prop as string];
    return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(db) : value;
  },
}) as Database;


export { Database, database };
