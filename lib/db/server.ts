// This file is for server-side only imports
import 'server-only';

import { getDb as getDbInternal, runMigrations } from './config';
import * as repositories from './repository';
import * as fs from 'fs';
import * as path from 'path';

// Migration version file path
const MIGRATION_VERSION_FILE = path.join(process.cwd(), '.db_version');

// Track DB initialization state (maintain state with global variable)
let isDbInitialized = false;
let dbInitializationPromise: Promise<void> | null = null;

/**
 * Wrapper function to ensure DB initialization
 * Promise caching to execute only once at server startup
 */
async function ensureDbInitialized() {
  // Return immediately if already initialized
  if (isDbInitialized) {
    return;
  }
  
  // Return existing Promise if already initializing
  if (dbInitializationPromise) {
    return dbInitializationPromise;
  }
  
  // Create and cache initialization Promise
  dbInitializationPromise = (async () => {
    try {
      console.log('Checking database migrations...');
      await runMigrations();
      isDbInitialized = true;
      console.log('Database is ready');
    } catch (error) {
      console.error('Database initialization error:', error);
      // Allow retry on next attempt if initialization fails
      dbInitializationPromise = null;
      throw error;
    }
  })();
  
  return dbInitializationPromise;
}

/**
 * Function to get DB instance (ensures initialization)
 */
export async function getDb() {
  await ensureDbInitialized();
  return getDbInternal();
}

/**
 * DB initialization function
 * Called at server startup or when needed
 */
export async function initializeDb() {
  await ensureDbInitialized();
}

// Automatically attempt initialization at server startup (but don't block server start if it fails)
ensureDbInitialized().catch(err => {
  console.error('Initial DB initialization failed:', err);
});

/**
 * 서버 컴포넌트에서 DB를 사용하기 위한 유틸리티
 * 
 * 서버 컴포넌트나 API 라우트에서 DB 작업을 수행할 때 사용합니다.
 * 
 * 사용 예시:
 * ```
 * import { db } from '@/lib/db/server';
 * 
 * export default async function MyServerComponent() {
 *   const users = await db.userRepository.findAll();
 *   return <div>{users.map(user => <div key={user.id}>{user.username}</div>)}</div>;
 * }
 * ```
 */
export const db = {
  ...repositories,
  getDb,
  initializeDb
};

// Re-export repositories for convenience
export const {
  userRepository,
  chatSessionRepository,
  chatMessageRepository,
  apiConnectionRepository,  
  adminSettingsRepository,
  llmServerRepository,
  llmModelRepository,
  agentManageRepository,
  convertImageDataToDataUrl
} = repositories;

// Server-only DB functionality
// This file should only be imported by server components

// Export everything from repository
export * from './repository';

// Export other server-safe DB utilities (excluding getDb - already defined above)
export { runMigrations } from './config'; 