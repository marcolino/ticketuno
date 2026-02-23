import sqlite3 from 'sqlite3';
import { promises as fs } from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { Migrator } from './migrator';
import { User, NewUser } from '../shared/types/user';
import { Theater, TheaterStatus, EventStatus, SeatStatus/*, Section*/, Seat } from '../shared/types/theater';
import { Layout } from '../shared/types/layout';
import { Event, EventPerformance } from '../shared/types/event';
import { GeneratedSeat } from '../shared/types/layoutToSeats';
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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME,
        FOREIGN KEY (theater_id) REFERENCES theaters(id)
      );
    `, 'CREATE layouts');

    await execQuery(this.db!, `
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
        cast_members TEXT,
        theater_id TEXT,
        stage_type TEXT,
        opening_date TEXT,
        closing_date TEXT,
        is_active INTEGER DEFAULT 1,
        base_ticket_price REAL NOT NULL,
        currency TEXT DEFAULT 'USD',
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
        status TEXT DEFAULT 'scheduled',
        cancellation_reason TEXT,
        max_capacity INTEGER,
        content_warnings TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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
        -- REMOVED: available_seats INTEGER,
        -- REMOVED: booked_seats INTEGER,
        -- REMOVED: seat_data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (event_id) REFERENCES events(id)
      );
    `, 'CREATE performances');

    await execQuery(this.db!, `
      CREATE TABLE IF NOT EXISTS seats (
        performance_id TEXT NOT NULL,
        seat_id TEXT NOT NULL,
        section_name TEXT NOT NULL,
        row_id TEXT NOT NULL,
        seat_number INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'available',
        booked_by_user_id TEXT,
        booked_at DATETIME,
        reserved_until TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (performance_id, seat_id),
        FOREIGN KEY (performance_id) REFERENCES performances(id) ON DELETE CASCADE,
        FOREIGN KEY (booked_by_user_id) REFERENCES users(id)
      );
    `, 'CREATE seats');
    //booked_by_user_id TEXT NULL if not booked,
    
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
        is_verified, verification_code, verification_code_expiry,
        google_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params: SqlParam[] = [
      id, user.email, user.password, user.firstName, user.lastName, user.phone || '', user.role,
      user.isVerified ? 1 : 0, user.verificationCode ?? '', user.verificationCodeExpiry ?? '',
      user.googleId ?? ''
    ];
    await runQuery(this.db!, sql, params, 'create user');
    return id;
  }

  private mapRowToUser(row: Record<string, unknown>): User {
    return {
      id: row.id as string,
      email: row.email as string,
      password: row.password as string,
      firstName: row.first_name as string,
      lastName: row.last_name as string,
      phone: row.phone as string,
      //role: row.role as "admin" | "operator" | "user",
      role: (["admin", "operator", "user"].includes(row.role as string) ? row.role : "user") as User["role"],
      isVerified: row.is_verified === 1,
      verificationCode: row.verification_code as string,
      verificationCodeExpiry: row.verification_code_expiry as string,
      resetPasswordCode: row.reset_password_code as string,
      resetPasswordCodeExpiry: row.reset_password_code_expiry as string,
      googleId: row.google_id as string,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }

  // Array mapper
  // private mapRowsToUsers(rows: User[]): User[] {
  //   return rows.map(row => this.mapRowToUser(row));
  // }
  // private mapRowsToUsers(rows: Record<string, unknown>[]): User[] {
  //   return rows.map(row => this.mapRowToUser(row));
  // }
  private mapRowsToUsers(rows: Record<string, unknown>[]): User[] {
    return rows.map(row => this.mapRowToUser(row));
  }
  // private mapRowsToUsers(rows: any[]): User[] {
  //   return rows.map(row => this.mapRowToUser(row));
  // }

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
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        //console.log('Default admin user created successfully');
        return await this.createUser(adminUser);
      }
    } catch (error) {
      console.error('Error creating default admin user:', error);
      throw error;
    }
  }

  // async createDefaultUsers(): Promise<void> {
  //   try {
  //     // Check if an admin user already exists
  //     const adminUsers = await this.getUsersByRole('admin');
      
  //     // If no admin exists, create one
  //     if (!adminUsers || adminUsers.length === 0) {
  //       const hashedPassword = await bcrypt.hash(process.env.ADMIN_USER_PASSWORD!, 10);
  //       const adminUser: User = {
  //         id: '',
  //         email: process.env.ADMIN_USER_EMAIL!,
  //         password: hashedPassword,
  //         firstName: 'Ammini',
  //         lastName: 'Stratore',
  //         phone: undefined,
  //         role: 'admin',
  //         isVerified: true,
  //         createdAt: new Date().toISOString(),
  //         updatedAt: new Date().toISOString()
  //       };
        
  //       await this.createUser(adminUser);
  //       console.log('Default admin user created successfully');
  //     }

  //     // Check if an operator user already exists
  //     const operatorUsers = await this.getUsersByRole('operator');
      
  //     // If no operator exists, create one
  //     if (!operatorUsers || operatorUsers.length === 0) {
  //       const hashedPassword = await bcrypt.hash(process.env.OPERATOR_USER_PASSWORD!, 10);
  //       const operatorUser: User = {
  //         id: '',
  //         email: process.env.OPERATOR_USER_EMAIL!,
  //         password: hashedPassword,
  //         firstName: 'Opera',
  //         lastName: 'Tore',
  //         phone: undefined,
  //         role: 'operator',
  //         isVerified: true,
  //         createdAt: new Date().toISOString(),
  //         updatedAt: new Date().toISOString()
  //       };
        
  //       await this.createUser(operatorUser);
  //       console.log('Default operator user created successfully');
  //     }
  //   } catch (error) {
  //     console.error('Error creating default admin user:', error);
  //     throw error;
  //   }
  // }

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
      );
      await this.createDefaultUserIfNotExists(
        operatorEmail,
        operatorPassword,
        'operator',
        'Opera',
        'Tore',
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
  ): Promise<void> {
    const hashedPassword = await bcrypt.hash(password, 10);
    const id = this.uuid();
    const now = new Date().toISOString();

    // INSERT OR IGNORE is atomic — no race condition possible
    const sql = `
      INSERT OR IGNORE INTO users (
        id, email, password, first_name, last_name, role, is_verified, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
    `;

    const result = await runQuery(this.db!, sql, [
      id, email, hashedPassword, firstName, lastName, role, now, now,
    ], `create default ${role} user`);

    if (result.changes > 0) {
      console.log(`Default ${role} user created successfully`);
    }
    // If changes === 0, the row already existed — silently skip
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
    const values: (string | number)[] = [];
    
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
    };

    Object.entries(updates).forEach(([key, value]) => {
      if (fieldMap[key] && value !== undefined) {
        fields.push(`${fieldMap[key]} = ?`);
        if (key === 'isVerified') {
          values.push(value ? 1 : 0);
        } else {
          values.push(typeof value === 'boolean' ? (value ? 1 : 0) : value);
        }
      }
    });
    
    if (fields.length === 0) {
      return false;
    }

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);
    
    const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
    const result = await runQuery(this.db!, sql, values, 'update user');
    return result.changes > 0;
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

  // Array mapper
  private mapRowsToTheaters(rows: Record<string, unknown>[]): Theater[] {
    return rows.map(row => this.mapRowToTheater(row));
  }

  async getAllTheaters(): Promise<Theater[] | null> {
    const sql = `SELECT * FROM theaters`;
    const params: SqlParam[] = [];
    const rows = await allQuery(this.db!, sql, params, 'get all theaters');
    return rows ? this.mapRowsToTheaters(rows) : null;
  }

  async getTheaterById(id: string): Promise<Theater | null> {
    const sql = `SELECT * FROM theaters WHERE id = ?`;
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
      id, theater.name, theater.description ?? '', /*JSON.stringify(theater.sections),*/
      theater.stageType ?? '', theater.address ?? '', theater.websiteUrl ?? '', theater.status,
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

    // fields.push('updated_at = ?');
    // values.push(new Date().toISOString());
    values.push(id);

    const sql = `
      UPDATE theaters
      SET ${fields.join(', ')}
      WHERE id = ?
    `;
    const result = await runQuery(this.db!, sql, values, 'update theater full');
    return result.changes > 0;
  }

  async deleteTheater(id: string): Promise<boolean> {
    const sql = `DELETE FROM theaters WHERE id = ?`;
    const params = [id];
    const result = await runQuery(this.db!, sql, params, 'delete theater');
    return result.changes > 0;
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

  // Array mapper
  private mapRowsToLayouts(rows: Record<string, unknown>[]): Layout[] {
    return rows.map(row => this.mapRowToLayout(row));
  }
  
  async createLayout(layout: Layout): Promise<string> {
    const id = this.uuid();
    //const now = new Date().toISOString(); // TODO: now should be not needed, 
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
    `;
    const params = [id];
    const row = await getQuery(this.db!, sql, params, 'get layout by id');
    return row ? this.mapRowToLayout(row) : null;
  }

  async getLayoutsByTheaterId(theaterId: string): Promise<Layout | null> {
     const sql = `
      SELECT id, name, description, json
      FROM layouts
      WHERE id = ?
    `;
    const params = [theaterId];
    const row = await getQuery(this.db!, sql, params, 'get layout by theater id');
    return row ? this.mapRowToLayout(row) : null;
  }

  async getAllLayouts(): Promise<Array<{ id: string; json: string }> | null> {
     const sql = `
      SELECT id, name, description, json
      FROM layouts
      WHERE deleted_at is NULL
    `;
    const params: SqlParam[] = [];
    const rows = await allQuery(this.db!, sql, params, 'get all layouts');
    return rows ? this.mapRowsToLayouts(rows) : null;
  }

  async updateLayout(id: string, updates: Partial<Layout>): Promise<boolean> {
    const fields: string[] = [];
    const values: (string | number)[] = [];
    
    const fieldMap: Record<string, string> = {
      name: 'name',
      description: 'description',
      json: 'json',
    };

    Object.entries(updates).forEach(([key, value]) => {
      if (fieldMap[key] && value !== undefined) {
        fields.push(`${fieldMap[key]} = ?`);
        values.push(value!);
      }
    });
    
    if (fields.length === 0) {
      return false;
    }

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    const sql = `
      UPDATE layouts
      SET ${fields.join(', ')}
      WHERE id = ?`;
    const result = await runQuery(this.db!, sql, values, 'update layout');
    return result.changes > 0;
  }

  async deleteLayoutSoft(id: string): Promise<boolean> {
    const now = new Date().toISOString();
    const sql = `
      UPDATE layouts
      SET deleted_at = ?
      WHERE id = ?
      AND id NOT IN (SELECT current_layout_id FROM theaters)
    `;
    const params = [now, id];
    const result = await runQuery(this.db!, sql, params, 'soft delete layout');
    return result.changes > 0;
  }

  // Event methods //////////////////////////////////////////////////////////////////////
  private mapRowToEvent(row: Record<string, unknown>): Event {
    return {
      id: row.id as string,
      title: row.title as string,
      description: row.description as string,
      genre: row.genre as string,
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
      cancellationReason: row.cancellation_reason as string | undefined,
      maxCapacity: row.max_capacity as number,
      contentWarnings: row.content_warnings as string,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }

  // Array mapper
  private mapRowsToEvents(rows: Record<string, unknown>[]): Event[] {
    return rows.map(row => this.mapRowToEvent(row));
  }

  async getAllEvents(): Promise<Event[] | null> {
    const sql = `
      SELECT *
      FROM events
      ORDER BY opening_date DESC
    `;
    const params: (string | number)[]  = [];
    const rows = await allQuery(this.db!, sql, params, 'get all events');
    return rows ? this.mapRowsToEvents(rows) : null;
  }

  async getEventById(id: string): Promise<Event | null> {
    const sql = `
      SELECT *
      FROM events
      WHERE id = ?
    `;
    const params = [id];
    const row = await getQuery(this.db!, sql, params, 'get event by id');
    return row ? this.mapRowToEvent(row) : null;
  }

  async createEvent(event: Event): Promise<string> {
    const id = this.uuid();
    const sql = `
      INSERT INTO events (
        id, title, description, genre, duration_minutes, intermission_count, rating, language,
        director, playwright, producer, choreographer, musical_director, cast_members, theater_id, stage_type,
        opening_date, closing_date, is_active, base_ticket_price, currency, is_sold_out,
        special_requirements, minimum_age, created_by_user_id,
        typical_start_time, typical_end_time, poster_image, trailer_url, website_url,
        social_media_links, status, cancellation_reason, max_capacity, content_warnings
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params: SqlParam[] = [
      id, event.title, event.description ?? '', event.genre ?? '',
      event.durationMinutes ?? '', event.intermissionCount ?? 0,
      event.rating ?? '', event.language ?? '', event.director ?? '',
      event.playwright ?? '', event.producer ?? '', event.choreographer ?? '',
      event.musicalDirector ?? '', JSON.stringify(event.cast ?? []),
      event.theaterId, event.stageType ?? '', event.openingDate ?? '', event.closingDate ?? '',
      event.isActive ? 1 : 0, event.baseTicketPrice, event.currency, event.isSoldOut ? 1 : 0,
      event.specialRequirements ?? '', event.minimumAge ?? '', event.createdByUserId ?? '',
      event.typicalStartTime ?? '', event.typicalEndTime ?? '', event.posterImage ?? '',
      event.trailerUrl ?? '', event.websiteUrl ?? '', event.socialMediaLinks ?? '',
      event.status, event.cancellationReason ?? '', event.maxCapacity ?? '', event.contentWarnings ?? ''
    ];
    await runQuery(this.db!, sql, params, 'create event');
    return id;
  }

  async updateEvent(id: string, updates: Partial<Event>): Promise<boolean> {
    const fields: string[] = [];
    //const values: (string | number | boolean)[] = [];
    const values: (string | number | Buffer | null)[] =[];

    const fieldMap: Record<string, string> = {
      title: 'title',
      description: 'description',
      genre: 'genre',
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
      baseTicketPrice: 'base_ticket_price',
      currency: 'currency',
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
      cancellationReason: 'cancellation_reason',
      maxCapacity: 'max_capacity',
      contentWarnings: 'content_warnings',
    };

    Object.entries(updates).forEach(([key, value]) => {
      if (fieldMap[key] && value !== undefined) {
        fields.push(`${fieldMap[key]} = ?`);
        if (key === 'isActive' || key === 'isSoldOut' || key === 'isVerified') {
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
      SET ${ fields.join(', ')}
      WHERE id = ?
    `;
    const result = await runQuery(this.db!, sql, values, 'update event');
    return result.changes > 0;
  }

  async deleteEvent(id: string): Promise<boolean> {
    const sql = `DELETE FROM events WHERE id = ?`;
    const params = [id];
    const result = await runQuery(this.db!, sql, params, 'delete event');
    return result.changes > 0;
  }

  // Performance methods //////////////////////////////////////////////////////////////////////
  private mapRowToPerformance(row: Record<string, unknown>): EventPerformance {
    return {
      id: row.id as string,
      eventId: row.event_id as string,
      performanceDate: row.performance_date as string,
      startTime: row.start_time as string,
      endTime: row.end_time as string,
      //availableSeats: row.available_seats,
      //bookedSeats: row.booked_seats,
      //seatData: row.seat_data,
      status: row.status as EventStatus,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string
    };
  }

  // Array mapper
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
        id, event_id, performance_date, start_time, end_time,
        -- REMOVED available_seats, booked_seats, seat_data,
        status
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;
    const params: SqlParam[] = [
      id, performance.eventId, performance.performanceDate, performance.startTime,
      performance.endTime ?? '', /*performance.availableSeats, performance.bookedSeats, performance.seatData, */
      performance.status, /*performance.createdAt ?? '', performance.updatedAt ?? ''*/
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
      // availableSeats: 'available_seats',
      // bookedSeats: 'booked_seats',
      // seatData: 'seat_data',
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

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    const sql = `
      UPDATE performances
      SET ${fields.join(', ')}
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
      bookedByUserId: row.booked_by_user_id as string,
      bookedAt: row.booked_at as string,
      reservedUntil: row.reserved_until as string,
      price: row.pric as number,
    };
  }

  // Array mapper
  private mapRowsToSeats(rows: Record<string, unknown>[]): Seat[] {
    return rows.map(row => this.mapRowToSeat(row));
  }

  async getSeatsByPerformanceId(performanceId: string): Promise<Seat[]> {
    const sql = `
      SELECT 
        seat_id,
        status,
        booked_by_user_id,
        reserved_until,
        price
      FROM seats 
      WHERE performance_id = ?
      ORDER BY seat_id
    `;
    const params = [performanceId];
    const rows = await allQuery(this.db!, sql, params, 'get seats by performance');
    return rows ? this.mapRowsToSeats(rows) : [];
  }

  // async getSeatsByEventId(eventId: string): Promise<Array<{ eventId: string; seatId: string; status: string; reservedUntil?: string }> | null> {
  //   const sql = `SELECT * FROM seats WHERE event_id = ?`;
  //   const params = [eventId];
  //   const rows = await getQuery(this.db!, sql, params, 'get seats by event id');
  //   return rows ? this.mapRowsToSeats(rows) : null;
  // }

  // async getSeat(eventId: string, seatId: string): Promise<{ eventId: string; seatId: string; status: string; reservedUntil?: string } | null> {
  //   const sql = `SELECT * FROM seats WHERE event_id = ? AND seat_id = ?`;
  //   const params = [eventId, seatId];
  //   const row = await getQuery(this.db!, sql, params, 'get seat');
  //   return row ? this.mapRowToSeat(row) : null;
  // }

  // async createOrUpdateSeat(performanceId: string, seatId: string, status: string, reservedUntil?: string): Promise<void> {
  //   const sql = `
  //     INSERT INTO seats (performance_id, seat_id, status, reserved_until)
  //     VALUES (?, ?, ?, ?)
  //     ON CONFLICT(event_id, seat_id) 
  //     DO UPDATE SET status = ?, reserved_until = ?
  //   `;
  //   const params = [
  //     performanceId,
  //     seatId,
  //     status,
  //     reservedUntil,
  //     status,
  //     reservedUntil
  //   ];
  //   await runQuery(this.db!, sql, params, 'create or update seat');
  // }

  // async updateSeatStatus(eventId: string, seatId: string, status: string, reservedUntil?: string): Promise<boolean> {
  //   const fields: string[] = [];
  //   const values: any[] = [];
    
  //   const fieldMap: Record<string, string> = {
  //     status: 'status',
  //     reservedUntil: 'reserved_until',
  //   };

  //   Object.entries([status, reservedUntil]).forEach(([key, value]) => {
  //     if (fieldMap[key] && value !== undefined) {
  //       fields.push(`${fieldMap[key]} = ?`);
  //       values.push(value);
  //     }
  //   });
    
  //   if (fields.length === 0) {
  //     return false;
  //   }

  //   values.push(eventId);
  //   values.push(seatId);

  //   const sql = `
  //     UPDATE seats
  //     SET ${fields.join(', ')}
  //     WHERE event_id = ? AND seat_id = ?
  //   `;
  //   const result = await runQuery(this.db!, sql, values, 'update seat status');
  //   return result.changes > 0;
  // }

  async releaseExpiredReservations(): Promise<boolean> {
    const sql = `
      UPDATE seats 
      SET status = 'available', reserved_until = NULL 
      WHERE status = 'reserved' AND reserved_until < ?
    `;
    const result = await runQuery(this.db!, sql, [], 'release expired seat reservations');
    return result.changes > 0;
  }

  // async deleteSeatsForEvent(eventId: string): Promise<boolean> {
  //   const sql = `DELETE FROM seats WHERE event_id = ?`;
  //   const params = [eventId];
  //   const result = await runQuery(this.db!, sql, params, 'delete seats for event');
  //   return result.changes > 0;
  // }

  // async getAvailableSeatsCount(eventId: string): Promise<number> {
  //   const sql = `SELECT COUNT(*) as count FROM seats WHERE event_id = ? AND status = ?`;
  //   const params = [eventId];
  //   const row = await getQuery(this.db!, sql, params, 'get available seats count');
  //   return row ? row.count : 0;
  // }

  async bulkCreateSeats(
    performanceId: string,
    seats: GeneratedSeat[]
  ): Promise<boolean> {
    const placeholders = seats.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
    const values: (string | number)[] = [];
    
    seats.forEach(seat => {
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
  async getSeatsByPerformanceIdGrouped(performanceId: string): Promise<{
    [sectionName: string]: {
      [rowId: string]: Seat[]
    }
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
    // -- price
    
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
      ORDER BY row_id, seat_number
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
      SELECT COUNT(*) as count 
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

  /**
   * Atomic booking transaction
   * Returns success status and list of unavailable seats
   */
  async bookSeats(performanceId: string, seatIds: string[], userId: string):
    Promise<{ success: boolean; bookedCount: number; unavailableSeats: string[] }> {
    return new Promise((resolve, reject) => {
      this.db!.serialize(() => {
        this.db!.run('BEGIN TRANSACTION');

        // Check all seats are available
        const placeholders = seatIds.map(() => '?').join(',');
        const checkSql = `
          SELECT seat_id, status 
          FROM seats 
          WHERE performance_id = ? AND seat_id IN (${placeholders})
        `;
        
        this.db!.all(checkSql, [performanceId, ...seatIds], (err, rows: Record<string, unknown>[]) => {
          if (err) {
            this.db!.run('ROLLBACK');
            return reject(err);
          }

          // Find unavailable seats
          const seatStatuses = new Map(rows.map(r => [r.seat_id, r.status]));
          const unavailable = seatIds.filter(id => {
            const status = seatStatuses.get(id);
            return !status || status !== 'available';
          });

          if (unavailable.length > 0) {
            this.db!.run('ROLLBACK');
            return resolve({ 
              success: false, 
              bookedCount: 0, 
              unavailableSeats: unavailable 
            });
          }

          // Book seats with user info
          const now = new Date().toISOString();
          const updateSql = `
            UPDATE seats 
            SET
              status = 'booked',
              booked_by_user_id = ?,
              booked_at = ?
            WHERE performance_id = ? AND seat_id IN (${placeholders})
          `;
          
          const db = this.db!; // Store db reference
          this.db!.run(
            updateSql, 
            [userId, now, performanceId, ...seatIds], 
            function(err) {
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
                  bookedCount: seatIds.length, 
                  unavailableSeats: [] 
                });
              });
            }
          );
        });
      });
    });
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
      if (err) {
        // err.message = `[${label}] ${err.message}`;
        // reject(err);
        reject(new Error(`${context}: ${err.message}`));
      } else {
        resolve();
      }
    });
  })
;

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
  })
  ;

//const getQuery = <T = any>(
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
  })
;

//const allQuery = <T = any>(
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
  })
;

function toSqlParam(value: unknown): string | number | null {
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (value === null || typeof value === 'number' || typeof value === 'string') return value;
  // anything else (array/object) → JSON
  return JSON.stringify(value);
}

// release expired reservations, continuously
setInterval(async () => { // TODO: move to /backend/src/scheduled/jobs.ts
  await database.releaseExpiredReservations();
}, 60 * 1000); // TODO: to config
 
export const database = new Database();
