// This file is for server-side only imports
import 'server-only';

import { getDb as getDbInternal, runMigrations } from './config';
import * as repositories from './repository';
import * as fs from 'fs';
import * as path from 'path';

// 마이그레이션 버전 파일 경로
const MIGRATION_VERSION_FILE = path.join(process.cwd(), '.db_version');

// DB 초기화 상태 추적 (전역 변수로 상태 유지)
let isDbInitialized = false;
let dbInitializationPromise: Promise<void> | null = null;

/**
 * DB 초기화를 보장하는 wrapper 함수
 * 서버 시작 시 한 번만 실행되도록 Promise 캐싱
 */
async function ensureDbInitialized() {
  // 이미 초기화되었으면 바로 반환
  if (isDbInitialized) {
    return;
  }
  
  // 이미 초기화 중이면 해당 Promise 반환
  if (dbInitializationPromise) {
    return dbInitializationPromise;
  }
  
  // 초기화 Promise 생성 및 캐싱
  dbInitializationPromise = (async () => {
    try {
      console.log('Checking database migrations...');
      await runMigrations();
      isDbInitialized = true;
      console.log('Database is ready');
    } catch (error) {
      console.error('Database initialization error:', error);
      // 초기화 실패 시 다음 시도에서 재시도할 수 있도록 함
      dbInitializationPromise = null;
      throw error;
    }
  })();
  
  return dbInitializationPromise;
}

/**
 * DB 인스턴스를 가져오는 함수 (초기화 보장)
 */
export async function getDb() {
  await ensureDbInitialized();
  return getDbInternal();
}

/**
 * DB 초기화 함수
 * 서버 시작 시 또는 필요 시 호출
 */
export async function initializeDb() {
  await ensureDbInitialized();
}

// 서버 시작 시 자동으로 초기화 시도 (하지만 실패해도 서버 시작은 차단하지 않음)
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
  systemSettingsRepository,
  adminSettingsRepository,
  llmServerRepository,
  llmModelRepository
} = repositories;

// Server-only DB functionality
// This file should only be imported by server components

// Export everything from repository
export * from './repository';

// Export other server-safe DB utilities (getDb 제외 - 이미 위에서 정의함)
export { runMigrations } from './config'; 