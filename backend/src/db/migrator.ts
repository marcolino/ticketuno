import sqlite3 from 'sqlite3';
import { promises as fs } from 'fs';
import path from 'path';

export class Migrator {
  private db: sqlite3.Database;
  private migrationsPath: string;

  constructor(db: sqlite3.Database, migrationsPath: string) {
    this.db = db;
    this.migrationsPath = migrationsPath;
  }

  async migrate(): Promise<void> {
    await this.createMigrationsTable();
    const appliedMigrations = await this.getAppliedMigrations();
    const migrationFiles = await this.getMigrationFiles();

    for (const file of migrationFiles) {
      if (!appliedMigrations.includes(file)) {
        console.log(`Applying migration: ${file}`);
        await this.applyMigration(file);
      }
    }
  }

  private createMigrationsTable(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(`
        CREATE TABLE IF NOT EXISTS migrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE NOT NULL,
          applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  private getAppliedMigrations(): Promise<string[]> {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT name FROM migrations ORDER BY id', [], (err, rows: Record<string, unknown>[]) => {
        if (err) reject(err);
        else resolve(rows.map(r => r.name as string));
      });
    });
  }

  private async getMigrationFiles(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.migrationsPath);
      return files
        .filter(f => f.endsWith('.sql'))
        .sort();
    } catch {
      return [];
    }
  }

  private async applyMigration(filename: string): Promise<void> {
    const filepath = path.join(this.migrationsPath, filename);
    const sql = await fs.readFile(filepath, 'utf8');

    return new Promise((resolve, reject) => {
      this.db.exec(sql, (err) => {
        if (err) {
          reject(err);
        } else {
          this.db.run(
            'INSERT INTO migrations (name) VALUES (?)',
            [filename],
            (err) => {
              if (err) reject(err);
              else {
                console.log(`✓ Migration ${filename} applied successfully`);
                resolve();
              }
            }
          );
        }
      });
    });
  }
}
