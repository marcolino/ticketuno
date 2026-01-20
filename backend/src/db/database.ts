import sqlite3 from 'sqlite3';
import { promises as fs } from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { Migrator } from './migrator';
import { User } from '../types/user';
import { Theater, Section } from '../types/theater';
import { Layout } from '../../../shared/types/layout';
import { Event, EventPerformance } from '../types/event';
import config from '../config';

class Database {
  private db: sqlite3.Database | null = null;

  async initialize() {
    const dir = path.dirname(config.dbPath);
    await fs.mkdir(dir, { recursive: true });

    return new Promise<void>((resolve, reject) => {
      this.db = new sqlite3.Database(config.dbPath, async (err) => {
        if (err) {
          reject(err);
        } else {
          try {
            // Create tables, if needed
            this.createTables().then(resolve).catch(reject);

            // Create default admin user, if needed
            this.createDefaultAdminUser().then(resolve).catch(reject);

            // Run migrations, if needed
            const migrationsPath = path.join(__dirname, 'migrations');
            const migrator = new Migrator(this.db!, migrationsPath);
            await migrator.migrate();

            resolve();
          } catch (error) {
            reject(error);
          }
        }
      });
    });
  }

  private createTables(): Promise<void> {
    return new Promise((resolve, reject) => {
      const sql = `
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
          sections TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

         CREATE TABLE IF NOT EXISTS layouts (
          id TEXT PRIMARY KEY,
          name TEXT,
          description TEXT,
          theater_id TEXT NOT NULL,
          json TEXT NOT NULL,
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
          show_id TEXT NOT NULL,
          stage_type TEXT,
          opening_date TEXT,
          closing_date TEXT,
          is_active INTEGER DEFAULT 1,
          base_ticket_price REAL NOT NULL,
          currency TEXT DEFAULT 'USD',
          is_sold_out INTEGER DEFAULT 0,
          special_requirements TEXT,
          minimum_age INTEGER,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          created_by_user_id TEXT,
          typical_start_time TEXT,
          typical_end_time TEXT,
          event_poster_url TEXT,
          trailer_url TEXT,
          website_url TEXT,
          social_media_links TEXT,
          status TEXT DEFAULT 'scheduled',
          cancellation_reason TEXT,
          max_capacity INTEGER,
          content_warnings TEXT,
          FOREIGN KEY (theater_id) REFERENCES theaters(id),
          FOREIGN KEY (show_id) REFERENCES shows(id),
          FOREIGN KEY (created_by_user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS performances (
          id TEXT PRIMARY KEY,
          event_id TEXT NOT NULL,
          performance_date TEXT NOT NULL,
          start_time TEXT NOT NULL,
          end_time TEXT,
          available_seats INTEGER NOT NULL,
          booked_seats INTEGER DEFAULT 0,
          seat_data TEXT NOT NULL,
          status TEXT DEFAULT 'scheduled',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (event_id) REFERENCES events(id)
        );

        CREATE TABLE IF NOT EXISTS seats (
          event_id TEXT NOT NULL,
          seat_id TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'available',
          reserved_until TEXT,
          PRIMARY KEY (event_id, seat_id),
          FOREIGN KEY (event_id) REFERENCES events(id)
        );

        CREATE INDEX IF NOT EXISTS idx_seats_event_id ON seats(event_id);
        CREATE INDEX IF NOT EXISTS idx_seats_status ON seats(status);
        CREATE INDEX IF NOT EXISTS idx_seats_reserved_until ON seats(reserved_until);
      `;
      this.db!.exec(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // User methods //////////////////////////////////////////////////////////////////////
  async createUser(user: User): Promise<void> {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO users (
          id, email, password, first_name, last_name, phone, role,
          is_verified, verification_code, verification_code_expiry,
          google_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      this.db!.run(
        sql,
        [
          user.id, user.email, user.password, user.firstName, user.lastName, user.phone, user.role,
          user.isVerified ? 1 : 0, user.verificationCode, user.verificationCodeExpiry,
          user.googleId, user.createdAt, user.updatedAt
        ],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  private mapRowToUser(row: any): User {
    return {
      id: row.id,
      email: row.email,
      password: row.password,
      firstName: row.first_name,
      lastName: row.last_name,
      phone: row.phone,
      role: row.role,
      isVerified: row.is_verified === 1,
      verificationCode: row.verification_code,
      verificationCodeExpiry: row.verification_code_expiry,
      resetPasswordCode: row.reset_password_code,
      resetPasswordCodeExpiry: row.reset_password_code_expiry,
      googleId: row.google_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  // Get user by Google ID
  async getUserByGoogleId(googleId: string): Promise<User | null> {
    return new Promise((resolve, reject) => {
      this.db!.get('SELECT * FROM users WHERE google_id = ?', [googleId], (err, row: any) => {
        if (err) reject(err);
        else if (!row) resolve(null);
        else resolve(this.mapRowToUser(row));
      });
    });
  }

  async createDefaultAdminUser(): Promise<void> {
    try {
      // First, check if an admin user already exists
      const adminUsers = await this.getUsersByRole('admin');
      
      // If no admin exists, create one
      if (!adminUsers || adminUsers.length === 0) {
        const hashedPassword = await bcrypt.hash(config.adminPassword, 10);
        const adminUser: User = {
          id: uuidv4(),
          email: config.adminUser,
          password: hashedPassword,
          firstName: 'admin name',
          lastName: 'admin surname',
          phone: undefined,
          role: 'admin',
          isVerified: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        await this.createUser(adminUser);
        console.log('Default admin user created successfully');
      }
    } catch (error) {
      console.error('Error creating default admin user:', error);
      throw error;
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return new Promise((resolve, reject) => {
      this.db!.get('SELECT * FROM users WHERE email = ?', [email], (err, row: any) => {
        if (err) reject(err);
        else if (!row) resolve(null);
        else {
          resolve(this.mapRowToUser(row));
          // resolve({
          //   id: row.id,
          //   email: row.email,
          //   password: row.password,
          //   firstName: row.first_name,
          //   lastName: row.last_name,
          //   phone: row.phone,
          //   role: row.role,
          //   isVerified: row.is_verified,
          //   verificationCode: row.verification_code,
          //   verificationCodeExpiry: row.verification_code_expiry,
          //   resetPasswordCode: row.reset_password_code,
          //   resetPasswordCodeExpiry: row.reset_password_code_expiry,
          //   createdAt: row.created_at,
          //   updatedAt: row.updated_at
          // });
        }
      });
    });
  }

  async getUserById(id: string): Promise<User | null> {
    return new Promise((resolve, reject) => {
      this.db!.get('SELECT * FROM users WHERE id = ?', [id], (err, row: any) => {
        if (err) reject(err);
        else if (!row) resolve(null);
        else {
          resolve(this.mapRowToUser(row));
          // resolve({
          //   id: row.id,
          //   email: row.email,
          //   password: row.password,
          //   firstName: row.first_name,
          //   lastName: row.last_name,
          //   phone: row.phone,
          //   role: row.role,
          //   isVerified: row.is_verified,
          //   createdAt: row.created_at,
          //   updatedAt: row.updated_at
          // });
        }
      });
    });
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return new Promise((resolve, reject) => {
      this.db!.all('SELECT * FROM users WHERE role = ?', [role], (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          const users: User[] = rows.map(row => this.mapRowToUser(row));
          resolve(users);
        }
      });
    });
  }
  /*
  async getUsersByRole(role: string): Promise<User[]> {
    return new Promise((resolve, reject) => {
      this.db!.all('SELECT * FROM users WHERE role = ?', [role], (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          const users: User[] = rows.map(row => ({
            id: row.id,
            email: row.email,
            password: row.password,
            firstName: row.firstName,
            lastName: row.last_name,
            phone: row.phone,
            role: row.role,
            isVerified: row.is_verified,
            createdAt: row.created_at,
            updatedAt: row.updated_at
          }));
          resolve(users);
        }
      });
    });
  }
  */

  async updateUser(id: string, updates: Partial<User>): Promise<void> {
    return new Promise((resolve, reject) => {
      const fields: string[] = [];
      const values: any[] = [];
      
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
            values.push(value);
          }
        }
      });
      
      if (fields.length === 0) {
        return resolve();
      }

      fields.push('updated_at = ?');
      values.push(new Date().toISOString());
      values.push(id);
      
      const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
      this.db!.run(sql, values, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // Theater methods //////////////////////////////////////////////////////////////////////
  private mapRowToTheater(row: any): Theater {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      sections: JSON.parse(row.sections),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  async getAllTheaters(): Promise<Theater[]> {
    return new Promise((resolve, reject) => {
      this.db!.all('SELECT * FROM theaters', [], (err, rows: any[]) => {
        if (err) reject(err);
        else {
          const theaters = rows.map(row => this.mapRowToTheater(row));
          // const theaters = rows.map(row => ({
          //   id: row.id,
          //   name: row.name,
          //   description: row.description,
          //   sections: JSON.parse(row.sections),
          //   createdAt: row.created_at,
          //   updatedAt: row.updated_at
          // }));
          resolve(theaters);
        }
      });
    });
  }

  async getTheaterById(id: string): Promise<Theater | null> {
    return new Promise((resolve, reject) => {
      this.db!.get('SELECT * FROM theaters WHERE id = ?', [id], (err, row: any) => {
        if (err) reject(err);
        else if (!row) resolve(null);
        else {
          resolve(this.mapRowToTheater(row));
          // resolve({
          //   id: row.id,
          //   name: row.name,
          //   description: row.description,
          //   sections: JSON.parse(row.sections),
          //   createdAt: row.created_at,
          //   updatedAt: row.updated_at
          // });
        }
      });
    });
  }

  async createTheater(theater: Theater): Promise<void> {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO theaters (id, name, description, sections, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      this.db!.run(
        sql,
        [theater.id, theater.name, theater.description, JSON.stringify(theater.sections), theater.createdAt, theater.updatedAt],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  async updateTheater(id: string, sections: Section[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const sql = `UPDATE theaters SET sections = ?, updated_at = ? WHERE id = ?`;
      const updatedAt = new Date().toISOString();
      this.db!.run(sql, [JSON.stringify(sections), updatedAt, id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async updateTheaterFull(id: string, theater: Partial<Theater>): Promise<void> {
    return new Promise((resolve, reject) => {
      const sql = `UPDATE theaters SET name = ?, description = ?, sections = ?, updated_at = ? WHERE id = ?`;
      this.db!.run(
        sql,
        [theater.name, theater.description, JSON.stringify(theater.sections), theater.updatedAt, id],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  async deleteTheater(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db!.run('DELETE FROM theaters WHERE id = ?', [id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // Layout methods //////////////////////////////////////////////////////////////////////
  private mapRowToLayout(row: any): Layout {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      theaterId: row.theater_id,
      json: row.json
    };
  }
  
  async createLayout(layout: Layout): Promise<void> {
    return new Promise((resolve, reject) => {
      const sql = 'INSERT INTO layouts (id, name, description, theater_id, json) VALUES (?, ?, ?, ?, ?)';
      // TODO: is it better to do `layout.name ?? ''` here, or set default optional fields in the caller?
      this.db!.run(
        sql,
        [layout.id, layout.name ?? '', layout.description ?? '', layout.theaterId ?? '', layout.json],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  async getLayoutById(id: string): Promise<string | null> {
    return new Promise((resolve, reject) => {
      this.db!.get('SELECT id, name, description, json FROM layouts WHERE id = ?', [id], (err, row: any) => {
        if (err) reject(err);
        else if (!row) resolve(null);
        else resolve(row);
      });
    });
  }

  async getAllLayouts(): Promise<Array<{ id: string; json: string }>> {
    return new Promise((resolve, reject) => {
      this.db!.all('SELECT id, name, description, json FROM layouts', [], (err, rows: any[]) => {
        if (err) reject(err);
        else resolve(rows.map(row => this.mapRowToLayout(row)));
      });
    });
  }

  async updateLayout(id: string, name: string, description: string, json: string,): Promise<void> {
    return new Promise((resolve, reject) => {
      const sql = 'UPDATE layouts SET name = ?, description = ?, json = ? WHERE id = ?';
      this.db!.run(sql, [name, description, json, id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async deleteLayout(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db!.run('DELETE FROM layouts WHERE id = ?', [id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // Show methods //////////////////////////////////////////////////////////////////////
  private mapRowToShow(row: any): { id: string; title: string; description?: string; genre?: string } {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      genre: row.genre
    };
  }

  async createShow(id: string, title: string, description?: string, genre?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const sql = 'INSERT INTO shows (id, title, description, genre) VALUES (?, ?, ?, ?)';
      this.db!.run(sql, [id, title, description, genre], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async getShowById(id: string): Promise<{ id: string; title: string; description?: string; genre?: string } | null> {
    return new Promise((resolve, reject) => {
      this.db!.get('SELECT * FROM shows WHERE id = ?', [id], (err, row: any) => {
        if (err) reject(err);
        else if (!row) resolve(null);
        else resolve(this.mapRowToShow(row));
      });
    });
  }

  async getAllShows(): Promise<Array<{ id: string; title: string; description?: string; genre?: string }>> {
    return new Promise((resolve, reject) => {
      this.db!.all('SELECT * FROM shows', [], (err, rows: any[]) => {
        if (err) reject(err);
        else resolve(rows.map(row => this.mapRowToShow(row)));
      });
    });
  }

  async updateShow(id: string, title?: string, description?: string, genre?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const fields: string[] = [];
      const values: any[] = [];

      if (title !== undefined) {
        fields.push('title = ?');
        values.push(title);
      }
      if (description !== undefined) {
        fields.push('description = ?');
        values.push(description);
      }
      if (genre !== undefined) {
        fields.push('genre = ?');
        values.push(genre);
      }

      if (fields.length === 0) {
        return resolve();
      }

      values.push(id);
      const sql = `UPDATE shows SET ${fields.join(', ')} WHERE id = ?`;
      this.db!.run(sql, values, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async deleteShow(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db!.run('DELETE FROM shows WHERE id = ?', [id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // Event methods //////////////////////////////////////////////////////////////////////
  private mapRowToEvent(row: any): Event {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      genre: row.genre,
      durationMinutes: row.duration_minutes,
      intermissionCount: row.intermission_count,
      rating: row.rating,
      language: row.language,
      director: row.director,
      playwright: row.playwright,
      producer: row.producer,
      choreographer: row.choreographer,
      musicalDirector: row.musical_director,
      theaterId: row.theater_id,
      stageType: row.stage_type,
      openingDate: row.opening_date,
      closingDate: row.closing_date,
      isActive: row.is_active === 1,
      baseTicketPrice: row.base_ticket_price,
      currency: row.currency,
      isSoldOut: row.is_sold_out === 1,
      specialRequirements: row.special_requirements,
      minimumAge: row.minimum_age,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdByUserId: row.created_by_user_id,
      typicalStartTime: row.typical_start_time,
      typicalEndTime: row.typical_end_time,
      eventPosterUrl: row.event_poster_url,
      trailerUrl: row.trailer_url,
      websiteUrl: row.website_url,
      socialMediaLinks: row.social_media_links,
      status: row.status,
      cancellationReason: row.cancellation_reason,
      maxCapacity: row.max_capacity,
      contentWarnings: row.content_warnings,
      showId: row.show_id
    };
  }

  async getAllEvents(): Promise<Event[]> {
    return new Promise((resolve, reject) => {
      this.db!.all('SELECT * FROM events ORDER BY opening_date DESC', [], (err, rows: any[]) => {
        if (err) reject(err);
        else {
          const events = rows.map(row => this.mapRowToEvent(row));
          resolve(events);
        }
      });
    });
  }

  async getEventById(id: string): Promise<Event | null> {
    return new Promise((resolve, reject) => {
      this.db!.get('SELECT * FROM events WHERE id = ?', [id], (err, row: any) => {
        if (err) reject(err);
        else if (!row) resolve(null);
        else resolve(this.mapRowToEvent(row));
      });
    });
  }

  async createEvent(event: Event): Promise<void> {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO events (
          id, title, description, genre, duration_minutes, intermission_count, rating, language,
          director, playwright, producer, choreographer, musical_director, theater_id, show_id, stage_type,
          opening_date, closing_date, is_active, base_ticket_price, currency, is_sold_out,
          special_requirements, minimum_age, created_at, updated_at, created_by_user_id,
          typical_start_time, typical_end_time, event_poster_url, trailer_url, website_url,
          social_media_links, status, cancellation_reason, max_capacity, content_warnings
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      this.db!.run(sql, [
        event.id, event.title, event.description, event.genre, event.durationMinutes, event.intermissionCount,
        event.rating, event.language, event.director, event.playwright, event.producer, event.choreographer,
        event.musicalDirector, event.theaterId, event.showId, event.stageType, event.openingDate, event.closingDate,
        event.isActive ? 1 : 0, event.baseTicketPrice, event.currency, event.isSoldOut ? 1 : 0,
        event.specialRequirements, event.minimumAge, event.createdAt, event.updatedAt, event.createdByUserId,
        event.typicalStartTime, event.typicalEndTime, event.eventPosterUrl, event.trailerUrl, event.websiteUrl,
        event.socialMediaLinks, event.status, event.cancellationReason, event.maxCapacity, event.contentWarnings
      ], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async updateEvent(id: string, event: Partial<Event>): Promise<void> {
    return new Promise((resolve, reject) => {
      const fields: string[] = [];
      const values: any[] = [];

      Object.entries(event).forEach(([key, value]) => {
        if (key !== 'id' && value !== undefined) {
          const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
          fields.push(`${snakeKey} = ?`);
          if (typeof value === 'boolean') {
            values.push(value ? 1 : 0);
          } else {
            values.push(value);
          }
        }
      });

      fields.push('updated_at = ?');
      values.push(new Date().toISOString());
      values.push(id);

      const sql = `UPDATE events SET ${fields.join(', ')} WHERE id = ?`;
      this.db!.run(sql, values, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async deleteEvent(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db!.run('DELETE FROM events WHERE id = ?', [id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // Performance methods //////////////////////////////////////////////////////////////////////
  private mapRowToPerformance(row: any): EventPerformance {
    return {
      id: row.id,
      eventId: row.event_id,
      performanceDate: row.performance_date,
      startTime: row.start_time,
      endTime: row.end_time,
      availableSeats: row.available_seats,
      bookedSeats: row.booked_seats,
      seatData: row.seat_data,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  async getPerformancesByEventId(eventId: string): Promise<EventPerformance[]> {
    return new Promise((resolve, reject) => {
      this.db!.all(
        'SELECT * FROM performances WHERE event_id = ? ORDER BY performance_date, start_time',
        [eventId],
        (err, rows: any[]) => {
          if (err) reject(err);
          else {
            const performances = rows.map(row => this.mapRowToPerformance(row));
            resolve(performances);
          }
        }
      );
    });
  }

  async getPerformanceById(id: string): Promise<EventPerformance | null> {
    return new Promise((resolve, reject) => {
      this.db!.get('SELECT * FROM performances WHERE id = ?', [id], (err, row: any) => {
        if (err) reject(err);
        else if (!row) resolve(null);
        else resolve(this.mapRowToPerformance(row));
      });
    });
  }

  async createPerformance(performance: EventPerformance): Promise<void> {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO performances (id, event_id, performance_date, start_time, end_time, 
          available_seats, booked_seats, seat_data, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      this.db!.run(sql, [
        performance.id, performance.eventId, performance.performanceDate, performance.startTime,
        performance.endTime, performance.availableSeats, performance.bookedSeats,
        performance.seatData, performance.status, performance.createdAt, performance.updatedAt
      ], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async updatePerformance(id: string, performance: Partial<EventPerformance>): Promise<void> {
    return new Promise((resolve, reject) => {
      const fields: string[] = [];
      const values: any[] = [];

      Object.entries(performance).forEach(([key, value]) => {
        if (key !== 'id' && value !== undefined) {
          const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
          fields.push(`${snakeKey} = ?`);
          values.push(value);
        }
      });

      fields.push('updated_at = ?');
      values.push(new Date().toISOString());
      values.push(id);

      const sql = `UPDATE performances SET ${fields.join(', ')} WHERE id = ?`;
      this.db!.run(sql, values, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // Seat management methods //////////////////////////////////////////////////////////////////////
  private mapRowToSeat(row: any): { eventId: string; seatId: string; status: string; reservedUntil?: string } {
    return {
      eventId: row.event_id,
      seatId: row.seat_id,
      status: row.status,
      reservedUntil: row.reserved_until
    };
  }

  async getSeatsByEventId(eventId: string): Promise<Array<{ eventId: string; seatId: string; status: string; reservedUntil?: string }>> {
    return new Promise((resolve, reject) => {
      this.db!.all('SELECT * FROM seats WHERE event_id = ?', [eventId], (err, rows: any[]) => {
        if (err) reject(err);
        else resolve(rows.map(row => this.mapRowToSeat(row)));
      });
    });
  }

  async getSeat(eventId: string, seatId: string): Promise<{ eventId: string; seatId: string; status: string; reservedUntil?: string } | null> {
    return new Promise((resolve, reject) => {
      this.db!.get('SELECT * FROM seats WHERE event_id = ? AND seat_id = ?', [eventId, seatId], (err, row: any) => {
        if (err) reject(err);
        else if (!row) resolve(null);
        else resolve(this.mapRowToSeat(row));
      });
    });
  }

  async createOrUpdateSeat(eventId: string, seatId: string, status: string, reservedUntil?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO seats (event_id, seat_id, status, reserved_until)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(event_id, seat_id) 
        DO UPDATE SET status = ?, reserved_until = ?
      `;
      this.db!.run(sql, [eventId, seatId, status, reservedUntil, status, reservedUntil], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async updateSeatStatus(eventId: string, seatId: string, status: string, reservedUntil?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const sql = 'UPDATE seats SET status = ?, reserved_until = ? WHERE event_id = ? AND seat_id = ?';
      this.db!.run(sql, [status, reservedUntil, eventId, seatId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async releaseExpiredReservations(): Promise<void> {
    return new Promise((resolve, reject) => {
      const now = new Date().toISOString();
      const sql = `
        UPDATE seats 
        SET status = 'available', reserved_until = NULL 
        WHERE status = 'reserved' AND reserved_until < ?
      `;
      this.db!.run(sql, [now], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async deleteSeatsForEvent(eventId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db!.run('DELETE FROM seats WHERE event_id = ?', [eventId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async getAvailableSeatsCount(eventId: string): Promise<number> {
    return new Promise((resolve, reject) => {
      this.db!.get(
        'SELECT COUNT(*) as count FROM seats WHERE event_id = ? AND status = ?',
        [eventId, 'available'],
        (err, row: any) => {
          if (err) reject(err);
          else resolve(row.count);
        }
      );
    });
  }

  async bulkCreateSeats(eventId: string, seatIds: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const placeholders = seatIds.map(() => '(?, ?, ?)').join(', ');
      const values: any[] = [];
      seatIds.forEach(seatId => {
        values.push(eventId, seatId, 'available');
      });

      const sql = `INSERT OR IGNORE INTO seats (event_id, seat_id, status) VALUES ${placeholders}`;
      this.db!.run(sql, values, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

}

// release expired reservations, continuously
setInterval(async () => {
  await database.releaseExpiredReservations();
}, 60 * 1000); // TODO: to config
 
export const database = new Database();
