const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

// Migration version file path
const MIGRATION_VERSION_FILE = path.join(process.cwd(), '.db_version');

// Get current migration version
function getCurrentMigrationVersion(): number {
  const migrationsFolder = path.resolve(__dirname, '../lib/db/migrations');
  const migrationFiles = fs.readdirSync(migrationsFolder)
    .filter((file: string) => file.endsWith('.sql'))
    .length;
  return migrationFiles;
}

// Get applied migration version
function getAppliedMigrationVersion() {
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
    dbType: 'sqlite'
  };
  fs.writeFileSync(MIGRATION_VERSION_FILE, JSON.stringify(data, null, 2));
}

// Run migrations
async function runMigrations() {
  const dbUrl = process.env.DATABASE_URL || 'file:./data.db';
  const migrationsFolder = path.resolve(__dirname, '../lib/db/migrations');
  
  const currentVersion = getCurrentMigrationVersion();
  const appliedVersion = getAppliedMigrationVersion();
  
  console.log(`Checking migration version: current=${currentVersion}, applied=${appliedVersion}`);
  
  // Already on the latest version
  if (appliedVersion >= currentVersion) {
    console.log('Database is already up to date.');
    return;
  }
  
  console.log(`Running migrations for SQLite database...`);
  console.log(`Running ${currentVersion - appliedVersion} new migrations.`);
  
  try {
    const sqlite = new Database(dbUrl.replace('file:', ''));
    
    // Get migration file list
    const migrationFiles = fs.readdirSync(migrationsFolder)
      .filter((file: string) => file.endsWith('.sql'))
      .sort();
    
    // Run only migrations that haven't been applied
    for (let i = appliedVersion; i < migrationFiles.length; i++) {
      const file = migrationFiles[i];
      const sqlFilePath = path.join(migrationsFolder, file);
      console.log(`Running: ${file} (${i + 1}/${migrationFiles.length})`);
      
      if (fs.existsSync(sqlFilePath)) {
        const sql = fs.readFileSync(sqlFilePath, 'utf8');
        
        // Split and run each SQL statement individually
        const statements = sql
          .split(';')
          .map((s: string) => s.trim())
          .filter((s: string) => s.length > 0);
        
        for (const statement of statements) {
          try {
            sqlite.exec(statement);
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            // 계속 진행이 안전한 케이스: 이미 존재/중복 등 멱등성 관련 에러들은 경고만 남기고 통과
            const nonFatalPatterns = [
              'already exists',
              'UNIQUE constraint failed',
              'duplicate column name',
              'no such index',
              'cannot add a NOT NULL column with default value NULL'
            ];
            const isNonFatal = nonFatalPatterns.some((p) => message.includes(p));
            if (isNonFatal) {
              console.warn(`Non-fatal SQL error in ${file}: ${message}`);
              continue;
            }
            console.warn(`SQL statement execution error (${file}):`, err);
            throw err;
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

async function migrate() {
  console.log('Starting database migration...');
  
  try {
    await runMigrations();
    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrate(); 