// This file is for server-side only
import 'server-only';

import { drizzle } from 'drizzle-orm/better-sqlite3';
import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js';
import { migrate as migrateSqlite } from 'drizzle-orm/better-sqlite3/migrator';
import { migrate as migratePg } from 'drizzle-orm/postgres-js/migrator';
import Database from 'better-sqlite3';
import postgres from 'postgres';
import * as dotenv from 'dotenv';
import { resolve, join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import * as schema from './schema';
import { DbType } from './types';
import * as fs from 'fs';
import * as path from 'path';

// Load .env file
dotenv.config();

// Get current file's directory path
const __dirname = dirname(fileURLToPath(import.meta.url));

// Migration version file path
const MIGRATION_VERSION_FILE = join(process.cwd(), '.db_version');

// Current migration version (based on migration file count)
function getCurrentMigrationVersion(): number {
  const dbConfig = getDbConfig();
  const migrationFiles = fs.readdirSync(dbConfig.migrationsFolder)
    .filter(file => file.endsWith('.sql'))
    .length;
  return migrationFiles;
}

// Get applied migration version
function getAppliedMigrationVersion(): number {
  if (fs.existsSync(MIGRATION_VERSION_FILE)) {
    try {
      const content = fs.readFileSync(MIGRATION_VERSION_FILE, 'utf8');
      const data = JSON.parse(content);
      return data.version || 0;
    } catch (error) {
      console.error('Error reading migration version file:', error);
      return 0;
    }
  }
  return 0;
}

// Save migration version
function saveMigrationVersion(version: number) {
  const data = {
    version,
    lastMigration: new Date().toISOString(),
    dbType: getDbConfig().type
  };
  fs.writeFileSync(MIGRATION_VERSION_FILE, JSON.stringify(data, null, 2));
}

// DB configuration function
export function getDbConfig() {
  return {
    type: (process.env.DB_TYPE || 'sqlite') as DbType,
    url: process.env.DATABASE_URL || 'file:./data.db',
    migrationsFolder: resolve(__dirname, './migrations')
  };
}

// DB connection instance
let db: any;
let pgConnection: any;

/**
 * DB connection function
 */
export function getDb() {
  if (db) return db;

  const dbConfig = getDbConfig();
  
  if (dbConfig.type === 'sqlite') {
    const sqlite = new Database(dbConfig.url.replace('file:', ''));
    db = drizzle(sqlite, { schema });
    return db;
  } else {
    if (!pgConnection) {
      pgConnection = postgres(dbConfig.url);
    }
    db = drizzlePg(pgConnection, { schema });
    return db;
  }
}

/**
 * DB migration execution function
 * Runs only necessary migrations based on version
 */
export async function runMigrations() {
  const dbConfig = getDbConfig();
  const currentVersion = getCurrentMigrationVersion();
  const appliedVersion = getAppliedMigrationVersion();
  
  console.log(`Checking migration version: current=${currentVersion}, applied=${appliedVersion}`);
  
  // Already on the latest version
  if (appliedVersion >= currentVersion) {
    console.log('Database is already up to date.');
    return;
  }
  
  console.log(`Running migrations for ${dbConfig.type} database...`);
  console.log(`Running ${currentVersion - appliedVersion} new migrations.`);
  
  try {
    const sqlite = new Database(dbConfig.url.replace('file:', ''));
    
    // Get migration file list
    const migrationFiles = fs.readdirSync(dbConfig.migrationsFolder)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    // Run only migrations that haven't been applied
    for (let i = appliedVersion; i < migrationFiles.length; i++) {
      const file = migrationFiles[i];
      const sqlFilePath = path.join(dbConfig.migrationsFolder, file);
      console.log(`Running: ${file} (${i + 1}/${migrationFiles.length})`);
      
      if (fs.existsSync(sqlFilePath)) {
        const sql = fs.readFileSync(sqlFilePath, 'utf8');
        
        // Split and run each SQL statement individually
        const statements = sql
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0);
        
        for (const statement of statements) {
          try {
            sqlite.exec(statement);
          } catch (err) {
            console.warn(`SQL statement execution error (${file}):`, err);
            // Ignore errors like ON CONFLICT and continue execution
            if (err instanceof Error && !err.message.includes('UNIQUE constraint failed')) {
              throw err;
            }
          }
        }
        
        console.log(`${file} execution completed`);
      }
    }
    
    // Save migration version
    saveMigrationVersion(currentVersion);
    console.log(`Migration completed. Updated to version ${currentVersion}.`);
    
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  }
} 