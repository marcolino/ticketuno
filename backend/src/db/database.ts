import sqlite3 from 'sqlite3';
import { promises as fs } from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { Migrator } from './migrator';
import { User } from '../types/user';
import { Theater, Section } from '../types/theater';
import { Show, ShowPerformance } from '../types/show';
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

        CREATE TABLE IF NOT EXISTS shows (
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
          show_poster_url TEXT,
          trailer_url TEXT,
          website_url TEXT,
          social_media_links TEXT,
          status TEXT DEFAULT 'scheduled',
          cancellation_reason TEXT,
          max_capacity INTEGER,
          content_warnings TEXT,
          FOREIGN KEY (theater_id) REFERENCES theaters(id),
          FOREIGN KEY (created_by_user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS performances (
          id TEXT PRIMARY KEY,
          show_id TEXT NOT NULL,
          performance_date TEXT NOT NULL,
          start_time TEXT NOT NULL,
          end_time TEXT,
          available_seats INTEGER NOT NULL,
          booked_seats INTEGER DEFAULT 0,
          seat_data TEXT NOT NULL,
          status TEXT DEFAULT 'scheduled',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (show_id) REFERENCES shows(id)
        );
      `;
      this.db!.exec(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // User methods
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
          resolve({
            id: row.id,
            email: row.email,
            password: row.password,
            firstName: row.first_name,
            lastName: row.last_name,
            phone: row.phone,
            role: row.role,
            isVerified: row.isVerified, // ? 1 : 0 ???
            verificationCode: row.verification_code,
            verificationCodeExpiry: row.verification_code_expiry,
            createdAt: row.created_at,
            updatedAt: row.updated_at
          });
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
          resolve({
            id: row.id,
            email: row.email,
            password: row.password,
            firstName: row.first_name,
            lastName: row.last_name,
            phone: row.phone,
            role: row.role,
            isVerified: row.isVerified,
            createdAt: row.created_at,
            updatedAt: row.updated_at
          });
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
          const users: User[] = rows.map(row => ({
            id: row.id,
            email: row.email,
            password: row.password,
            firstName: row.firstName,
            lastName: row.last_name,
            phone: row.phone,
            role: row.role,
            isVerified: row.isVerified,
            createdAt: row.created_at,
            updatedAt: row.updated_at
          }));
          resolve(users);
        }
      });
    });
  }

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

  // Theater methods
  async getAllTheaters(): Promise<Theater[]> {
    return new Promise((resolve, reject) => {
      this.db!.all('SELECT * FROM theaters', [], (err, rows: any[]) => {
        if (err) reject(err);
        else {
          const theaters = rows.map(row => ({
            id: row.id,
            name: row.name,
            description: row.description,
            sections: JSON.parse(row.sections),
            createdAt: row.created_at,
            updatedAt: row.updated_at
          }));
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
          resolve({
            id: row.id,
            name: row.name,
            description: row.description,
            sections: JSON.parse(row.sections),
            createdAt: row.created_at,
            updatedAt: row.updated_at
          });
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

  // Show methods
  async getAllShows(): Promise<Show[]> {
    return new Promise((resolve, reject) => {
      this.db!.all('SELECT * FROM shows ORDER BY opening_date DESC', [], (err, rows: any[]) => {
        if (err) reject(err);
        else {
          const shows = rows.map(row => this.mapRowToShow(row));
          resolve(shows);
        }
      });
    });
  }

  async getShowById(id: string): Promise<Show | null> {
    return new Promise((resolve, reject) => {
      this.db!.get('SELECT * FROM shows WHERE id = ?', [id], (err, row: any) => {
        if (err) reject(err);
        else if (!row) resolve(null);
        else resolve(this.mapRowToShow(row));
      });
    });
  }

  async createShow(show: Show): Promise<void> {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO shows (
          id, title, description, genre, duration_minutes, intermission_count, rating, language,
          director, playwright, producer, choreographer, musical_director, theater_id, stage_type,
          opening_date, closing_date, is_active, base_ticket_price, currency, is_sold_out,
          special_requirements, minimum_age, created_at, updated_at, created_by_user_id,
          typical_start_time, typical_end_time, show_poster_url, trailer_url, website_url,
          social_media_links, status, cancellation_reason, max_capacity, content_warnings
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      this.db!.run(sql, [
        show.id, show.title, show.description, show.genre, show.durationMinutes, show.intermissionCount,
        show.rating, show.language, show.director, show.playwright, show.producer, show.choreographer,
        show.musicalDirector, show.theaterId, show.stageType, show.openingDate, show.closingDate,
        show.isActive ? 1 : 0, show.baseTicketPrice, show.currency, show.isSoldOut ? 1 : 0,
        show.specialRequirements, show.minimumAge, show.createdAt, show.updatedAt, show.createdByUserId,
        show.typicalStartTime, show.typicalEndTime, show.showPosterUrl, show.trailerUrl, show.websiteUrl,
        show.socialMediaLinks, show.status, show.cancellationReason, show.maxCapacity, show.contentWarnings
      ], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async updateShow(id: string, show: Partial<Show>): Promise<void> {
    return new Promise((resolve, reject) => {
      const fields: string[] = [];
      const values: any[] = [];

      Object.entries(show).forEach(([key, value]) => {
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

  private mapRowToShow(row: any): Show {
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
      showPosterUrl: row.show_poster_url,
      trailerUrl: row.trailer_url,
      websiteUrl: row.website_url,
      socialMediaLinks: row.social_media_links,
      status: row.status,
      cancellationReason: row.cancellation_reason,
      maxCapacity: row.max_capacity,
      contentWarnings: row.content_warnings
    };
  }

  // ShowPerformance methods
  async getPerformancesByShowId(showId: string): Promise<ShowPerformance[]> {
    return new Promise((resolve, reject) => {
      this.db!.all(
        'SELECT * FROM performances WHERE show_id = ? ORDER BY performance_date, start_time',
        [showId],
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

  async getPerformanceById(id: string): Promise<ShowPerformance | null> {
    return new Promise((resolve, reject) => {
      this.db!.get('SELECT * FROM performances WHERE id = ?', [id], (err, row: any) => {
        if (err) reject(err);
        else if (!row) resolve(null);
        else resolve(this.mapRowToPerformance(row));
      });
    });
  }

  async createPerformance(performance: ShowPerformance): Promise<void> {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO performances (id, show_id, performance_date, start_time, end_time, 
          available_seats, booked_seats, seat_data, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      this.db!.run(sql, [
        performance.id, performance.showId, performance.performanceDate, performance.startTime,
        performance.endTime, performance.availableSeats, performance.bookedSeats,
        performance.seatData, performance.status, performance.createdAt, performance.updatedAt
      ], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async updatePerformance(id: string, performance: Partial<ShowPerformance>): Promise<void> {
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

  private mapRowToPerformance(row: any): ShowPerformance {
    return {
      id: row.id,
      showId: row.show_id,
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
}

export const database = new Database();
